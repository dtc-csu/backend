const { z } = require('zod');

const idParamsSchema = z.object({
  trikeId: z.coerce.number().int().positive(),
});

const trikesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  plateNumber: z.string().trim().max(20).optional(),
  driverId: z.coerce.number().int().positive().optional(),
});

const createTrikeSchema = z.object({
  plateNumber: z.string().trim().min(1).max(20),
  color: z.string().trim().max(50).optional(),
  franchiseNumber: z.string().trim().max(50).optional(),
  capacity: z.coerce.number().int().min(1).max(20).default(5),
  motorNumber: z.string().trim().max(50).optional(),
  model: z.string().trim().max(100).optional(),
  chassisNumber: z.string().trim().max(50).optional(),
});

const updateTrikeSchema = z
  .object({
    plateNumber: z.string().trim().min(1).max(20).optional(),
    color: z.string().trim().max(50).optional(),
    franchiseNumber: z.string().trim().max(50).optional(),
    capacity: z.coerce.number().int().min(1).max(20).optional(),
    motorNumber: z.string().trim().max(50).nullable().optional(),
    model: z.string().trim().max(100).nullable().optional(),
    chassisNumber: z.string().trim().max(50).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });

module.exports = {
  idParamsSchema,
  trikesQuerySchema,
  createTrikeSchema,
  updateTrikeSchema,
};