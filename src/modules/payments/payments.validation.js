const { z } = require('zod');

const paymentMethods = ['cash', 'gcash', 'paymaya', 'card', 'paymongo'];
const paymentStatuses = ['pending', 'paid', 'failed'];

const idParamsSchema = z.object({
  paymentId: z.coerce.number().int().positive(),
});

const paymentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  bookingId: z.coerce.number().int().positive().optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
});

const createPaymentSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive().max(100000),
  paymentMethod: z.enum(paymentMethods),
  paymentStatus: z.enum(paymentStatuses).default('paid'),
  referenceNumber: z.string().trim().max(100).optional(),
});

const updatePaymentSchema = z
  .object({
    amount: z.coerce.number().positive().max(100000).optional(),
    paymentMethod: z.enum(paymentMethods).optional(),
    paymentStatus: z.enum(paymentStatuses).optional(),
    referenceNumber: z.string().trim().max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });

module.exports = {
  idParamsSchema,
  paymentsQuerySchema,
  createPaymentSchema,
  updatePaymentSchema,
};