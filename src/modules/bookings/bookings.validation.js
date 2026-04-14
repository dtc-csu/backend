const { z } = require('zod');

const bookingStatuses = ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'];
const coordinate = z.coerce.number().min(-180).max(180);

const idParamsSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

const bookingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(bookingStatuses).optional(),
  driverId: z.coerce.number().int().positive().optional(),
  passengerId: z.coerce.number().int().positive().optional(),
});

const createBookingSchema = z.object({
  passengerId: z.coerce.number().int().positive().optional(),
  driverId: z.coerce.number().int().positive().optional(),
  pickupLocation: z.string().trim().min(1).max(255),
  dropoffLocation: z.string().trim().min(1).max(255),
  pickupLat: coordinate,
  pickupLng: coordinate,
  dropoffLat: coordinate,
  dropoffLng: coordinate,
  fare: z.coerce.number().min(0).max(100000).optional().nullable(),
  status: z.enum(bookingStatuses).optional(),
});

const updateBookingSchema = z
  .object({
    driverId: z.coerce.number().int().positive().nullable().optional(),
    pickupLocation: z.string().trim().min(1).max(255).optional(),
    dropoffLocation: z.string().trim().min(1).max(255).optional(),
    pickupLat: coordinate.optional(),
    pickupLng: coordinate.optional(),
    dropoffLat: coordinate.optional(),
    dropoffLng: coordinate.optional(),
    fare: z.coerce.number().positive().max(100000).optional(),
    status: z.enum(bookingStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });

module.exports = {
  idParamsSchema,
  bookingsQuerySchema,
  createBookingSchema,
  updateBookingSchema,
};