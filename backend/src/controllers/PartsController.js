import { BaseController } from './BaseController.js';
import { prisma } from '../config/prisma.js';
import { getPartsQuerySchema } from '../validators/parts.schema.js';

export class PartsController extends BaseController {
  async getParts(req, res) {
    try {
      // 1. Zod Validation
      const query = getPartsQuerySchema.parse(req.query);
      const { search, category, archived, published, brand, series, engineCode, page, limit } = query;
      
      const skip = (page - 1) * limit;
      
      // 2. Build Prisma Where Clause
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
      let categoryIds = null;
      if (category && category.toLowerCase() !== 'all') {
        const matchedCats = await prisma.category.findMany({
          where: { name: { startsWith: category, mode: 'insensitive' } },
          select: { id: true }
        });
        
        if (matchedCats.length > 0) {
          const ids = matchedCats.map(c => c.id);
          const subCats = await prisma.category.findMany({
            where: { parentCategoryId: { in: ids } },
            select: { id: true }
          });
          categoryIds = [...ids, ...subCats.map(c => c.id)];
          where.categoryId = { in: categoryIds };
        } else {
          return this.handleSuccess(res, {
            parts: [],
            totalCount: 0,
            page,
            totalPages: 0,
          });
        }
      }

      // Push JSON compatibility filtering natively to Prisma to fix pagination and memory leaks
      const compatibilityFilters = [];

      if (brand && brand.toLowerCase() !== 'all') {
        // Create exact match for brand, plus fallback to Universal
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

      // Fetch parts with pagination natively filtered
      const [parts, totalCount] = await Promise.all([
        prisma.part.findMany({
          where,
          include: {
            category: { select: { id: true, name: true } },
            reviews: { select: { rating: true } }
          },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        prisma.part.count({ where }),
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
          category: part.category ? part.category.name : 'Uncategorized',
          category_id: part.categoryId,
          price: part.price,
          stock: part.stock,
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

      return this.handleSuccess(res, {
        data: formattedParts,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        }
      });

    } catch (error) {
      return this.handleError(error, res, 'getParts');
    }
  }
}

export const partsController = new PartsController();
