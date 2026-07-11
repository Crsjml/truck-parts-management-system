export class BaseController {
  handleSuccess(res, data, statusCode = 200) {
    return res.status(statusCode).json(data);
  }

  handleError(error, res, context) {
    console.error(`[Controller Error] ${context}:`, error);
    
    // Zod validation error
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
