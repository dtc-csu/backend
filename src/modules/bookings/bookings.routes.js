const express = require('express');

const controller = require('./bookings.controller');
const { authorize, requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/async-handler');
const { bookingsQuerySchema, createBookingSchema, idParamsSchema, updateBookingSchema } = require('./bookings.validation');

const router = express.Router();

router.use(requireAuth);
router.get('/', validate(bookingsQuerySchema, 'query'), asyncHandler(controller.listBookings));
router.get('/:bookingId', validate(idParamsSchema, 'params'), asyncHandler(controller.getBookingById));
router.post('/', validate(createBookingSchema), asyncHandler(controller.createBooking));
router.patch('/:bookingId', validate(idParamsSchema, 'params'), validate(updateBookingSchema), asyncHandler(controller.updateBooking));
router.delete('/:bookingId', validate(idParamsSchema, 'params'), asyncHandler(controller.deleteBooking));

module.exports = router;