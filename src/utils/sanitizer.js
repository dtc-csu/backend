const sanitizeHtml = require('sanitize-html');

const cleanString = (value) =>
  sanitizeHtml(value.replace(/\0/g, ''), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

const sanitizePayload = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizePayload);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizePayload(item)]));
  }

  if (typeof value === 'string') {
    return cleanString(value);
  }

  return value;
};

module.exports = {
  sanitizePayload,
  cleanString,
};