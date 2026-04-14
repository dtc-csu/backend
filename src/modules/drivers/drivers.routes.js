const express = require('express');

const controller = require('./drivers.controller');
const { authorize, requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/async-handler');
const {
	createDriverSchema,
	createDriverTrikeSchema,
	driverTrikeParamsSchema,
	driverTrikesQuerySchema,
	driversQuerySchema,
	idParamsSchema,
	replaceDriverSchema,
	replaceDriverTrikeSchema,
	updateDriverSchema,
	updateDriverTrikeSchema,
} = require('./drivers.validation');

const router = express.Router();

router.use(requireAuth);
router.get('/', validate(driversQuerySchema, 'query'), asyncHandler(controller.listDrivers));
router.get('/:driverId', validate(idParamsSchema, 'params'), asyncHandler(controller.getDriverById));
router.post('/', authorize('admin'), validate(createDriverSchema), asyncHandler(controller.createDriver));
router.put('/:driverId', validate(idParamsSchema, 'params'), validate(replaceDriverSchema), asyncHandler(controller.replaceDriver));
router.patch('/:driverId', validate(idParamsSchema, 'params'), validate(updateDriverSchema), asyncHandler(controller.updateDriver));
router.get('/:driverId/trikes', validate(idParamsSchema, 'params'), validate(driverTrikesQuerySchema, 'query'), asyncHandler(controller.listDriverTrikes));
router.post('/:driverId/trikes', validate(idParamsSchema, 'params'), validate(createDriverTrikeSchema), asyncHandler(controller.createDriverTrike));
router.get('/:driverId/trikes/:trikeId', validate(driverTrikeParamsSchema, 'params'), asyncHandler(controller.getDriverTrikeById));
router.put('/:driverId/trikes/:trikeId', validate(driverTrikeParamsSchema, 'params'), validate(replaceDriverTrikeSchema), asyncHandler(controller.replaceDriverTrike));
router.patch('/:driverId/trikes/:trikeId', validate(driverTrikeParamsSchema, 'params'), validate(updateDriverTrikeSchema), asyncHandler(controller.updateDriverTrike));
router.delete('/:driverId/trikes/:trikeId', validate(driverTrikeParamsSchema, 'params'), asyncHandler(controller.deleteDriverTrike));
router.delete('/:driverId', authorize('admin'), validate(idParamsSchema, 'params'), asyncHandler(controller.deleteDriver));

module.exports = router;