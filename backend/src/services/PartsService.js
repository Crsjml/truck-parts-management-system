import { partsRepository } from '../repositories/PartsRepository.js';
import { supabaseStorageService } from './SupabaseStorageService.js';
import { parseCompatibility } from '../utils/parseCompatibility.js';

export class PartsService {
  async generateAdjustmentNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const lastAdjustment = await partsRepository.findLatestAdjustmentByDate(dateStr);

    let sequence = 1;
    if (lastAdjustment) {
      const parts = lastAdjustment.adjustmentNumber.split('-');
      sequence = parseInt(parts[2], 10) + 1;
    }
    return `SA-${dateStr}-${sequence.toString().padStart(4, '0')}`;
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
    const normalizedOemNumbers = Array.isArray(oemNumbers)
      ? oemNumbers.map(v => String(v).trim()).filter(Boolean)
      : [];
    const normalizedMarkupOverride = (markupOverride === undefined || markupOverride === null || markupOverride === '')
      ? null
      : Number(markupOverride);

    const existing = await partsRepository.findPartBySku(sku.trim());
    if (existing) {
      const error = new Error('A part with this SKU already exists.');
      error.status = 409;
      throw error;
    }

    const categoryDoc = await partsRepository.findCategoryById(category_id);
    if (!categoryDoc) {
      const error = new Error('Selected category does not exist.');
      error.status = 404;
      throw error;
    }

    const parsedCompatibleWith = (Array.isArray(compatibleWith) && compatibleWith.length > 0)
      ? compatibleWith
      : parseCompatibility(compatibility ? compatibility.trim() : '');

    // Upload base64 image to Supabase if provided
    const uploadedImageUrl = await supabaseStorageService.uploadBase64Image(image);

    const part = await partsRepository.createPart({
      name: name.trim(),
      sku: sku.trim(),
      oem: oem ? oem.trim() : '',
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
    let difference = 0;

    if ((stock !== undefined && newStock !== oldStock) || (adjustmentReason && adjustmentReason.trim() !== '')) {
      isStockAdjustment = true;
      difference = newStock - oldStock;
      if (!adjustmentReason || adjustmentReason.trim() === '') {
        const error = new Error('Reason for stock adjustment is required.');
        error.status = 400;
        throw error;
      }
    }

    if (sku && sku.trim() !== part.sku) {
      const existing = await partsRepository.findPartBySku(sku.trim(), id);
      if (existing) {
        const error = new Error('A part with this SKU already exists.');
        error.status = 409;
        throw error;
      }
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

    const updatedPart = await partsRepository.updatePart(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(sku !== undefined && { sku: sku.trim() }),
      ...(oem !== undefined && { oem: oem.trim() }),
      ...(oemNumbers !== undefined && {
        oemNumbers: Array.isArray(oemNumbers) ? oemNumbers.map(v => String(v).trim()).filter(Boolean) : []
      }),
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
    });

    if (isStockAdjustment) {
      const MAX_ADJUSTMENT_NUMBER_ATTEMPTS = 5;
      for (let attempt = 1; attempt <= MAX_ADJUSTMENT_NUMBER_ATTEMPTS; attempt++) {
        const adjustmentNumber = await this.generateAdjustmentNumber();
        try {
          await partsRepository.createStockAdjustment({
            partId: updatedPart.id,
            adjustmentNumber,
            oldStock,
            newStock,
            difference,
            reason: adjustmentReason.trim()
          });
          break;
        } catch (error) {
          const isCollision = error.code === 'P2002' && error.meta?.target?.includes('adjustmentNumber');
          if (!isCollision || attempt === MAX_ADJUSTMENT_NUMBER_ATTEMPTS) {
            throw error;
          }
        }
      }
    }

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
