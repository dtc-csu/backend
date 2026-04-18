const express = require('express');

const authRoutes = require('./auth/auth.routes');
const bookingRoutes = require('./bookings/bookings.routes');
const chatRoutes = require('./chat/chat.routes');
const driverRoutes = require('./drivers/drivers.routes');
const publicRoutes = require('./public/public.routes');
const healthRoutes = require('./health/health.routes');
const notificationRoutes = require('./notifications/notifications.routes');
const paymentRoutes = require('./payments/payments.routes');
const ratingRoutes = require('./ratings/ratings.routes');
const userRoutes = require('./users/users.routes');
const violationRoutes = require('./violations/violations.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/public', publicRoutes);
router.use('/users', userRoutes);
router.use('/bookings', bookingRoutes);
router.use('/drivers', driverRoutes);
router.use('/payments', paymentRoutes);
router.use('/ratings', ratingRoutes);
router.use('/violations', violationRoutes);

module.exports = router;