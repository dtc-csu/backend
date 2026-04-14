const { ZodError } = require('zod');

const { sanitizePayload } = require('../utils/sanitizer');

const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors: error.errors.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return next(error);
  }
};

const sanitizeRequest = (req, res, next) => {
  req.body = sanitizePayload(req.body);
  req.query = sanitizePayload(req.query);
  req.params = sanitizePayload(req.params);
  next();
};

module.exports = {
  validate,
  sanitizeRequest,
};