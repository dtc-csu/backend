const { z } = require('zod');

const phoneNumberSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }, 'Contact number must contain 10 to 15 digits.');

const userRoles = ['passenger', 'driver', 'admin'];
const picFilePathSchema = z
  .string()
  .trim()
  .max(900000)
  .refine((value) => value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('gs://') || !value.contains(' '), 'Picture path must be a valid storage path, URL, or image data URL.');

const idParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const usersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  role: z.enum(userRoles).optional(),
  disabled: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((value) => {
      if (typeof value === 'undefined') {
        return undefined;
      }

      return value === 'true' || value === '1';
    }),
});

const createUserSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  contactNumber: phoneNumberSchema.optional(),
  email: z.string().trim().email().max(100),
  username: z.string().trim().min(1).max(45),
  password: z.string().min(8).max(72),
  role: z.enum(userRoles),
  disabled: z.boolean().optional(),
  licenseNumber: z.string().trim().max(50).optional(),
  trikeId: z.coerce.number().int().positive().optional(),
});

const replaceUserProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  contactNumber: z.union([phoneNumberSchema, z.null()]),
  email: z.string().trim().email().max(100),
  username: z.string().trim().min(1).max(45),
  picFilePath: z.union([picFilePathSchema, z.null()]).optional(),
});

const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(100).optional(),
    contactNumber: phoneNumberSchema.optional(),
    email: z.string().trim().email().max(100).optional(),
    username: z.string().trim().min(1).max(45).optional(),
    picFilePath: z.union([picFilePathSchema, z.null()]).optional(),
    password: z.string().min(8).max(72).optional(),
    role: z.enum(userRoles).optional(),
    disabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

module.exports = {
  createUserSchema,
  idParamsSchema,
  replaceUserProfileSchema,
  usersQuerySchema,
  updateUserSchema,
};