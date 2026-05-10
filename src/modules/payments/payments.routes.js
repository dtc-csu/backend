const express = require('express');

const controller = require('./payments.controller');
const { authorize, requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/async-handler');
const {
	createPaymentSchema,
	createPaymongoCheckoutSchema,
	idParamsSchema,
	paymentsQuerySchema,
	updatePaymentSchema,
} = require('./payments.validation');

const router = express.Router();

router.use(requireAuth);
router.get('/', validate(paymentsQuerySchema, 'query'), asyncHandler(controller.listPayments));
router.post('/paymongo/checkout', authorize('passenger', 'admin'), validate(createPaymongoCheckoutSchema), asyncHandler(controller.createPaymongoCheckout));
router.get('/:paymentId', validate(idParamsSchema, 'params'), asyncHandler(controller.getPaymentById));
router.post('/', authorize('passenger', 'admin'), validate(createPaymentSchema), asyncHandler(controller.createPayment));
router.patch('/:paymentId', validate(idParamsSchema, 'params'), validate(updatePaymentSchema), asyncHandler(controller.updatePayment));
router.delete('/:paymentId', authorize('admin'), validate(idParamsSchema, 'params'), asyncHandler(controller.deletePayment));

module.exports = router;