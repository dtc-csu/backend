const { z } = require('zod');

const createBookingChannelSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

const bookingChannelParamsSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

module.exports = {
  createBookingChannelSchema,
  bookingChannelParamsSchema,
};