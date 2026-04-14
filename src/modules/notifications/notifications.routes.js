const express = require('express');

const controller = require('./notifications.controller');
const { authorize, requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/async-handler');
const { sendNotificationSchema } = require('./notifications.validation');

const router = express.Router();

router.use(requireAuth, authorize('admin'));
router.get('/summary', asyncHandler(controller.getSummary));
router.get('/connections', asyncHandler(controller.getConnections));
router.post('/send', validate(sendNotificationSchema), asyncHandler(controller.sendNotification));

module.exports = router;