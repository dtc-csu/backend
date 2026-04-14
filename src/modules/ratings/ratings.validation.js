const { z } = require('zod');

const createRatingSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  driverId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

const ratingsQuerySchema = z.object({
  driverId: z.coerce.number().int().positive().optional(),
  bookingId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = { createRatingSchema, ratingsQuerySchema };
