const express = require('express');

const controller = require('./chat.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/async-handler');
const { bookingChannelParamsSchema, createBookingChannelSchema } = require('./chat.validation');

const router = express.Router();

router.use(requireAuth);
router.get('/token', asyncHandler(controller.getToken));
router.post('/channels/support', asyncHandler(controller.createSupportChannel));
router.post('/channels/booking', validate(createBookingChannelSchema), asyncHandler(controller.createBookingChannel));
router.get('/channels/booking/:bookingId', validate(bookingChannelParamsSchema, 'params'), asyncHandler(controller.getBookingChannel));

module.exports = router;