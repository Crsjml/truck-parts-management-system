// Tiny in-memory per-user limiter: sliding window + one in-flight request per
// user (LLM calls are slow and expensive). Single-process only by design.

export const createUserRateLimit = ({ max = 10, windowMs = 60_000, now = Date.now, key = (req) => req.auth?.userId } = {}) => {
  const hits = new Map(); // userId -> timestamps within window
  const inFlight = new Set();

  const prune = (ts, t) => ts.filter((x) => t - x < windowMs);

  const middleware = (req, res, next) => {
    const id = key(req);
    if (!id) return res.status(401).json({ msg: 'Not authenticated.' });
    const t = now();
    const recent = prune(hits.get(id) ?? [], t);

    if (recent.length >= max || inFlight.has(id)) {
      hits.set(id, recent);
      const retryAfter = Math.max(1, Math.ceil((windowMs - (t - (recent[0] ?? t))) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        content: [{ type: 'text', text: 'You are sending messages too quickly. Please wait a moment and try again.' }],
        error: 'rate_limited'
      });
    }

    hits.set(id, [...recent, t]);
    inFlight.add(id);
    let released = false;
    const release = () => { if (!released) { released = true; inFlight.delete(id); } };
    res.on('finish', release);
    res.on('close', release);

    // Opportunistic cleanup so idle users do not accumulate forever.
    if (hits.size > 1000) {
      for (const [k, ts] of hits) if (prune(ts, t).length === 0) hits.delete(k);
    }
    return next();
  };
  return middleware;
};
