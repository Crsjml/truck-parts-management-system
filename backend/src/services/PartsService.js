import { partsRepository } from '../repositories/PartsRepository.js';

export class PartsService {
  async getParts(query) {
    const { search, category, archived, published, brand, series, engineCode, page, limit } = query;
    const skip = (page - 1) * limit;

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
      partsRepository.findParts(where, skip, limit),
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

    return { parts: formattedParts, totalCount };
  }
}

export const partsService = new PartsService();
