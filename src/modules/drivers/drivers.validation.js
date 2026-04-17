const { z } = require('zod');

const driverStatuses = ['available', 'on_trip', 'offline'];

const idParamsSchema = z.object({
  driverId: z.coerce.number().int().positive(),
});

const driverTrikeParamsSchema = z.object({
  driverId: z.coerce.number().int().positive(),
  trikeId: z.coerce.number().int().positive(),
});

const driversQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(driverStatuses).optional(),
  licenseNumber: z.string().trim().max(50).optional(),
});

const createDriverSchema = z.object({
  driverId: z.coerce.number().int().positive(),
  licenseNumber: z.string().trim().max(50).optional(),
  status: z.enum(driverStatuses).default('offline'),
});

const replaceDriverSchema = z.object({
  licenseNumber: z.union([z.string().trim().max(50), z.null()]),
  status: z.enum(driverStatuses),
});

const updateDriverSchema = z
  .object({
    licenseNumber: z.string().trim().max(50).optional(),
    status: z.enum(driverStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });

const driverTrikesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  plateNumber: z.string().trim().max(20).optional(),
});

const createDriverTrikeSchema = z.object({
  plateNumber: z.string().trim().min(1).max(20),
  color: z.string().trim().max(50).optional(),
  franchiseNumber: z.string().trim().max(50).optional(),
  capacity: z.coerce.number().int().min(1).max(20).default(5),
  motorNumber: z.string().trim().max(50).optional(),
  model: z.string().trim().max(100).optional(),
  chassisNumber: z.string().trim().max(50).optional(),
});

const replaceDriverTrikeSchema = z.object({
  plateNumber: z.string().trim().min(1).max(20),
  color: z.union([z.string().trim().max(50), z.null()]),
  franchiseNumber: z.union([z.string().trim().max(50), z.null()]),
  capacity: z.coerce.number().int().min(1).max(20),
  motorNumber: z.union([z.string().trim().max(50), z.null()]),
  model: z.union([z.string().trim().max(100), z.null()]),
  chassisNumber: z.union([z.string().trim().max(50), z.null()]),
});

const updateDriverTrikeSchema = z
  .object({
    plateNumber: z.string().trim().min(1).max(20).optional(),
    color: z.string().trim().max(50).nullable().optional(),
    franchiseNumber: z.string().trim().max(50).nullable().optional(),
    capacity: z.coerce.number().int().min(1).max(20).optional(),
    motorNumber: z.string().trim().max(50).nullable().optional(),
    model: z.string().trim().max(100).nullable().optional(),
    chassisNumber: z.string().trim().max(50).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });

module.exports = {
  idParamsSchema,
  driverTrikeParamsSchema,
  driversQuerySchema,
  createDriverSchema,
  replaceDriverSchema,
  updateDriverSchema,
  driverTrikesQuerySchema,
  createDriverTrikeSchema,
  replaceDriverTrikeSchema,
  updateDriverTrikeSchema,
};