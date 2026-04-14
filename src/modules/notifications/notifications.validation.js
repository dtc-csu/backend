const { z } = require('zod');

const sendNotificationSchema = z.object({
  userIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  data: z.record(z.string(), z.string()).optional().default({}),
});

module.exports = {
  sendNotificationSchema,
};