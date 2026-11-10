import { partsRepository } from '../repositories/PartsRepository.js';
import { supabaseStorageService } from './SupabaseStorageService.js';
import { parseCompatibility } from '../utils/parseCompatibility.js';
import {
  dateKey, nextDocNumber, normalizeOemNumber, normalizeOemNumbers,
  skuPrefixFor, formatSku, parseSku, normalizeSku, isValidSku, SKU_FORMAT_MESSAGE
} from '../utils/recordFormats.js';
import { retryOnUniqueViolation } from '../utils/invoiceNumbers.js';

const httpError = (status, message) => Object.assign(new Error(message), { status });

export class PartsService {
  /** Next free CAT-PRT-##### for a category (a suggestion; the save is authoritative). */
  async suggestSku(categoryId) {
    const category = await partsRepository.findCategoryById(categoryId);
    if (!category) throw httpError(404, 'Selected category does not exist.');
    return this.nextSkuFor(category);
  }

  async nextSkuFor(category) {
    const prefix = skuPrefixFor(category.name);
    const latest = await partsRepository.findLatestSkuByPrefix(prefix);
    return formatSku(prefix, (parseSku(latest?.sku)?.seq ?? 0) + 1);
  }

  async generateAdjustmentNumber(client) {
    const date = new Date();
    const lastAdjustment = await partsRepository.findLatestAdjustmentByDate(dateKey(date), client);
    return nextDocNumber('SA', date, lastAdjustment?.adjustmentNumber);
  }

  async getParts(query) {
    const { search, category, archived, published, brand, series, engineCode, page, limit } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma Where Clause
    const where = {};

    if (archived === 'true') {
      where.archived = true;
    } else {
      where.archived = false;
    }

    if (published === 'true') where.published = true;
    if (published === 'false') where.published = false;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { oem: { contains: search, mode: 'insensitive' } },
        { compatibility: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category mapping
    if (category && category.toLowerCase() !== 'all') {
      const matchedCats = await partsRepository.findCategories({
        where: { name: { startsWith: category, mode: 'insensitive' } },
        select: { id: true }
      });
      
      if (matchedCats.length > 0) {
        const ids = matchedCats.map(c => c.id);
        const subCats = await partsRepository.findCategories({
          where: { parentCategoryId: { in: ids } },
          select: { id: true }
        });
        const categoryIds = [...ids, ...subCats.map(c => c.id)];
        where.categoryId = { in: categoryIds };
      } else {
        return { parts: [], totalCount: 0 };
      }
    }

    // JSON compatibility filtering
    const compatibilityFilters = [];

    if (brand && brand.toLowerCase() !== 'all') {
      compatibilityFilters.push({
        OR: [
          { compatibleWith: { array_contains: [{ brand }] } },
          { compatibleWith: { array_contains: [{ brand: 'Universal' }] } }
        ]
      });
    }

    if (series && series.toLowerCase() !== 'all') {
      compatibilityFilters.push({
        compatibleWith: { array_contains: [{ series }] }
      });
    }

    if (engineCode) {
      compatibilityFilters.push({
        compatibleWith: { array_contains: [{ engineCode }] }
      });
    }

    if (compatibilityFilters.length > 0) {
      if (!where.AND) where.AND = [];
      where.AND.push(...compatibilityFilters);
    }

    // Fetch data
    const [parts, totalCount] = await Promise.all([
      partsRepository.findParts(where, skip, limitNum),
      partsRepository.countParts(where)
    ]);

    // Format output
    const formattedParts = parts.map(part => {
      const totalReviews = part.reviews.length;
      const sumRatings = part.reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : 0;

      return {
        id: part.id,
        name: part.name,
        sku: part.sku,
        oem: part.oem || '',
        oemNumbers: part.oemNumbers || [],
        category: part.category ? part.category.name : 'Uncategorized',
        category_id: part.categoryId,
        price: part.price,
        markupOverride: part.markupOverride ?? null,
        stock: part.stock,
        reservedStock: part.reservedStock || 0,
        minStock: part.min_stock,
        compatibility: part.compatibility || '',
        compatibleWith: part.compatibleWith || [],
        description: part.description || '',
        image: part.image || '',
        published: part.published,
        archived: part.archived,
        reviewStats: {
          averageRating,
          totalReviews
        }
      };
    });

    return { parts: formattedParts, totalCount };
  }

  async createPart(data) {
    const { name, sku, oem, oemNumbers, markupOverride, category_id, price, stock, minStock, compatibility, description, image, compatibleWith } = data;
    const normalizedOemNumbers = normalizeOemNumbers(oemNumbers);
    const normalizedMarkupOverride = (markupOverride === undefined || markupOverride === null || markupOverride === '')
      ? null
      : Number(markupOverride);

    const categoryDoc = await partsRepository.findCategoryById(category_id);
    if (!categoryDoc) throw httpError(404, 'Selected category does not exist.');

    // A typed SKU must already be in the standard format; a blank one is
    // assigned below from the category's sequence.
    const typedSku = normalizeSku(sku);
    if (typedSku) {
      if (!isValidSku(typedSku)) throw httpError(400, SKU_FORMAT_MESSAGE);
      if (await partsRepository.findPartBySku(typedSku)) throw httpError(409, 'A part with this SKU already exists.');
    }

    const parsedCompatibleWith = (Array.isArray(compatibleWith) && compatibleWith.length > 0)
      ? compatibleWith
      : parseCompatibility(compatibility ? compatibility.trim() : '');

    // Upload base64 image to Supabase if provided
    const uploadedImageUrl = await supabaseStorageService.uploadBase64Image(image);

    const buildPart = (skuValue) => partsRepository.createPart({
      name: name.trim(),
      sku: skuValue,
      oem: normalizeOemNumber(oem),
      oemNumbers: normalizedOemNumbers,
      categoryId: categoryDoc.id,
      price: Number(price),
      markupOverride: normalizedMarkupOverride,
      stock: Number(stock),
      min_stock: Number(minStock),
      compatibility: compatibility ? compatibility.trim() : '',
      compatibleWith: parsedCompatibleWith,
      description: description ? description.trim() : '',
      image: uploadedImageUrl || ''
    });

    const part = typedSku
      ? await buildPart(typedSku)
      : await retryOnUniqueViolation('sku', async () => buildPart(await this.nextSkuFor(categoryDoc)));

    return {
      id: part.id,
      name: part.name,
      sku: part.sku,
      oem: part.oem,
      oemNumbers: part.oemNumbers || [],
      category: part.category.name,
      category_id: part.categoryId,
      price: part.price,
      markupOverride: part.markupOverride ?? null,
      stock: part.stock,
      reservedStock: part.reservedStock || 0,
      minStock: part.min_stock,
      compatibility: part.compatibility,
      compatibleWith: part.compatibleWith,
      description: part.description,
      image: part.image || ''
    };
  }

  async updatePart(id, data, user = null) {
    const { name, sku, oem, oemNumbers, markupOverride, category_id, price, stock, minStock, compatibility, description, image, published, compatibleWith, adjustmentReason } = data;

    const part = await partsRepository.findPartById(id);
    if (!part) {
      const error = new Error('Part record not found.');
      error.status = 404;
      throw error;
    }

    let isStockAdjustment = false;
    const oldStock = part.stock;
    const newStock = stock !== undefined ? Number(stock) : oldStock;

    if ((stock !== undefined && newStock !== oldStock) || (adjustmentReason && adjustmentReason.trim() !== '')) {
      isStockAdjustment = true;
      if (!adjustmentReason || adjustmentReason.trim() === '') {
        const error = new Error('Reason for stock adjustment is required.');
        error.status = 400;
        throw error;
      }
    }

    const nextSku = sku !== undefined ? normalizeSku(sku) : undefined;
    if (nextSku !== undefined && nextSku !== part.sku) {
      if (!isValidSku(nextSku)) throw httpError(400, SKU_FORMAT_MESSAGE);
      if (await partsRepository.findPartBySku(nextSku, id)) throw httpError(409, 'A part with this SKU already exists.');
    }

    if (category_id) {
      const categoryDoc = await partsRepository.findCategoryById(category_id);
      if (!categoryDoc) {
        const error = new Error('Selected category does not exist.');
        error.status = 404;
        throw error;
      }
    }

    let updatedCompatibleWith = part.compatibleWith;
    if (compatibility !== undefined && compatibleWith === undefined) {
      updatedCompatibleWith = parseCompatibility(compatibility.trim());
    } else if (compatibleWith !== undefined) {
      updatedCompatibleWith = Array.isArray(compatibleWith) ? compatibleWith : [];
    }

    // Handle image upload if a new base64 string is provided
    let finalImageUrl = part.image;
    if (image !== undefined) {
      finalImageUrl = await supabaseStorageService.uploadBase64Image(image);
    }

    const partData = {
      ...(name !== undefined && { name: name.trim() }),
      ...(nextSku !== undefined && { sku: nextSku }),
      ...(oem !== undefined && { oem: normalizeOemNumber(oem) }),
      ...(oemNumbers !== undefined && { oemNumbers: normalizeOemNumbers(oemNumbers) }),
      ...(markupOverride !== undefined && {
        markupOverride: (markupOverride === null || markupOverride === '') ? null : Number(markupOverride)
      }),
      ...(category_id !== undefined && { categoryId: category_id }),
      ...(price !== undefined && { price: Number(price) }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(minStock !== undefined && { min_stock: Number(minStock) }),
      ...(compatibility !== undefined && { compatibility: compatibility.trim() }),
      compatibleWith: updatedCompatibleWith,
      ...(description !== undefined && { description: description.trim() }),
      ...(image !== undefined && { image: finalImageUrl }),
      ...(published !== undefined && { published })
    };

    // The stock change and its SA- audit record commit together or not at all.
    // A collision on the SA- number rolls the whole attempt back and retries.
    const updatedPart = await retryOnUniqueViolation('adjustmentNumber', () =>
      partsRepository.executeTransaction(async (tx) => {
        const lockedStock = await partsRepository.lockPartStock(id, tx);
        const saved = await partsRepository.updatePart(id, partData, tx);
        if (isStockAdjustment) {
          const before = lockedStock ?? oldStock;
          const after = stock !== undefined ? Number(stock) : before;
          await partsRepository.createStockAdjustment({
            partId: id,
            adjustmentNumber: await this.generateAdjustmentNumber(tx),
            oldStock: before,
            newStock: after,
            difference: after - before,
            reason: adjustmentReason.trim()
          }, tx);
        }
        return saved;
      })
    );

    return {
      id: updatedPart.id,
      name: updatedPart.name,
      sku: updatedPart.sku,
      oem: updatedPart.oem,
      oemNumbers: updatedPart.oemNumbers || [],
      category: updatedPart.category.name,
      category_id: updatedPart.categoryId,
      price: updatedPart.price,
      markupOverride: updatedPart.markupOverride ?? null,
      stock: updatedPart.stock,
      reservedStock: updatedPart.reservedStock || 0,
      minStock: updatedPart.min_stock,
      compatibility: updatedPart.compatibility,
      compatibleWith: updatedPart.compatibleWith,
      description: updatedPart.description,
      image: updatedPart.image || '',
      published: updatedPart.published,
      archived: updatedPart.archived
    };
  }
}

export const partsService = new PartsService();
