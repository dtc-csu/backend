const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`,
  });
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.expose ? error.message : 'Internal server error.',
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.details = error.message;
  }

  if (res.headersSent) {
    return next(error);
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};