const { z } = require('zod');

const violationStatuses = ['pending', 'confirmed', 'resolved', 'dismissed'];
const coordinate = z.coerce.number().min(-180).max(180);

const idParamsSchema = z.object({
  violationId: z.coerce.number().int().positive(),
});

const typeIdParamsSchema = z.object({
  violationTypeId: z.coerce.number().int().positive(),
});

const violationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  driverId: z.coerce.number().int().positive().optional(),
  status: z.enum(violationStatuses).optional(),
  search: z.string().trim().max(100).optional(),
});

const createViolationSchema = z.object({
  driverId: z.coerce.number().int().positive(),
  bookingId: z.coerce.number().int().positive().optional(),
  violationTypeId: z.coerce.number().int().positive().optional(),
  description: z.string().trim().min(1).max(1000),
  latitude: coordinate.optional(),
  longitude: coordinate.optional(),
  status: z.enum(violationStatuses).optional(),
});

const replaceViolationSchema = z.object({
  bookingId: z.coerce.number().int().positive().nullable(),
  violationTypeId: z.coerce.number().int().positive().nullable(),
  description: z.string().trim().min(1).max(1000),
  latitude: coordinate.nullable(),
  longitude: coordinate.nullable(),
  status: z.enum(violationStatuses),
});

const updateViolationSchema = z
  .object({
    bookingId: z.coerce.number().int().positive().nullable().optional(),
    violationTypeId: z.coerce.number().int().positive().nullable().optional(),
    description: z.string().trim().min(1).max(1000).optional(),
    latitude: coordinate.nullable().optional(),
    longitude: coordinate.nullable().optional(),
    status: z.enum(violationStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });

const violationTypesQuerySchema = z.object({
  includeInactive: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((value) => {
      if (typeof value === 'undefined') {
        return false;
      }

      return value === 'true' || value === '1';
    }),
});

const createViolationTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  defaultPenalty: z.coerce.number().min(0).max(100000).nullable().optional(),
  isActive: z.boolean().default(true),
});

const replaceViolationTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  defaultPenalty: z.coerce.number().min(0).max(100000).nullable(),
  isActive: z.boolean(),
});

const updateViolationTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    defaultPenalty: z.coerce.number().min(0).max(100000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });

module.exports = {
  idParamsSchema,
  typeIdParamsSchema,
  violationsQuerySchema,
  createViolationSchema,
  replaceViolationSchema,
  updateViolationSchema,
  violationTypesQuerySchema,
  createViolationTypeSchema,
  replaceViolationTypeSchema,
  updateViolationTypeSchema,
};