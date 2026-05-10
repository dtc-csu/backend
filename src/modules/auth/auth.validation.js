const { z } = require('zod');

const phoneNumberSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }, 'Contact number must contain 10 to 15 digits.');

const picFilePathSchema = z
  .string()
  .trim()
  .max(900000)
  .refine(
    (value) =>
      value.startsWith('data:image/') ||
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('gs://') ||
      !value.includes(' '),
    'Picture path must be a valid storage path, URL, or image data URL.',
  );

const registerSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  contactNumber: phoneNumberSchema.optional(),
  email: z.string().trim().email().max(100),
  username: z.string().trim().min(1).max(45),
  password: z.string().min(8).max(72),
  picFilePath: z.union([picFilePathSchema, z.null()]).optional(),
  role: z.enum(['passenger', 'driver', 'admin']).default('passenger'),
  licenseNumber: z.string().trim().max(50).optional(),
  trikeId: z.coerce.number().int().positive().optional(),
});

const loginSchema = z.object({
  login: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(72),
});

const resetPasswordSchema = z.object({
  target: z.string().trim().min(1).max(100),
  newPassword: z.string().min(8).max(72),
});

module.exports = {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
};