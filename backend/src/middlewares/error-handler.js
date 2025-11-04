// Error handling middleware con formato consistente
export function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found', path: req.path });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error'
  const name = err.name || 'Error'
  const payload = {
    error: message || name,
    message,
  };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}
