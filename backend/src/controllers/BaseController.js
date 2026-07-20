export class BaseController {
  handleSuccess(res, data, statusCode = 200) {
    return res.status(statusCode).json(data);
  }

  handleError(res, error, context) {
    console.error(`[Controller Error] ${context}:`, error?.message || error);

    // Zod validation error
    if (error && error.name === 'ZodError') {
      return res.status(400).json({ msg: 'Validation failed', details: error.errors });
    }

    // Respect custom status codes thrown by services (404, 409, 400, etc.)
    const status = error?.status && Number.isInteger(error.status) ? error.status : 500;
    const msg = error?.message || 'Internal server error';
    return res.status(status).json({ msg });
  }
}
