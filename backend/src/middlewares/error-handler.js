// Error handling middleware con formato consistente
export function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found', path: req.path });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const payload = {
    error: err.name || 'Error',
    message: err.message || 'Internal Server Error',
  };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}
