import { BaseController } from './BaseController.js';
import { partsService } from '../services/PartsService.js';
import { getPartsQuerySchema } from '../validators/parts.schema.js';

export class PartsController extends BaseController {
  async getParts(req, res) {
    try {
      const query = getPartsQuerySchema.parse(req.query);
      const { parts, totalCount } = await partsService.getParts(query);
      
      // Add Cache-Control header to mitigate heavy payloads
      res.set('Cache-Control', 'public, max-age=60');

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

  async createPart(req, res) {
    try {
      // Logic expects `partsService.createPart` to handle errors by throwing
      const result = await partsService.createPart(req.body);
      return this.handleSuccess(res, result, 201);
    } catch (error) {
      return this.handleError(error, res, 'createPart');
    }
  }

  async updatePart(req, res) {
    try {
      const result = await partsService.updatePart(req.params.id, req.body, req.user);
      return this.handleSuccess(res, result);
    } catch (error) {
      return this.handleError(error, res, 'updatePart');
    }
  }
}

export const partsController = new PartsController();
