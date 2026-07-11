import { BaseController } from './BaseController.js';
import { partsService } from '../services/PartsService.js';
import { getPartsQuerySchema } from '../validators/parts.schema.js';

export class PartsController extends BaseController {
  async getParts(req, res) {
    try {
      const query = getPartsQuerySchema.parse(req.query);
      const { parts, totalCount } = await partsService.getParts(query);
      
      return this.handleSuccess(res, {
        data: parts,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / query.limit),
        }
      });
    } catch (error) {
      return this.handleError(error, res, 'getParts');
    }
  }
}

export const partsController = new PartsController();
