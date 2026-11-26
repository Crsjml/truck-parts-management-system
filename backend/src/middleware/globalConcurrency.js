// Global (all users) cap on simultaneous LLM turns. The model runs on one local
// box, so a few slow requests from different users can otherwise starve it.
// Single-process only, like userRateLimit.

const DEFAULT_MAX_CONCURRENT = 2;
export const BUSY_TEXT = 'The parts assistant is busy helping other customers. Please try again in a few seconds.';
export const BUSY_ERROR = 'assistant_busy';
const RETRY_AFTER_SECONDS = 5;

export const resolveMaxConcurrent = (override, env = process.env) => {
  const n = Number(override ?? env.LLM_MAX_CONCURRENT);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX_CONCURRENT;
};

export const createGlobalConcurrencyLimit = ({ max } = {}) => {
  const limit = resolveMaxConcurrent(max);
  let active = 0;

  return (_req, res, next) => {
    if (active >= limit) {
      res.set('Retry-After', String(RETRY_AFTER_SECONDS));
      return res.status(503).json({ content: [{ type: 'text', text: BUSY_TEXT }], error: BUSY_ERROR });
    }
    active += 1;
    let released = false;
    const release = () => { if (!released) { released = true; active -= 1; } };
    res.on('finish', release);
    res.on('close', release);
    try {
      return next();
    } catch (err) {
      release();
      throw err;
    }
  };
};
