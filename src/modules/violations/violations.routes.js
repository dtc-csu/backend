const express = require('express');

const controller = require('./violations.controller');
const { authorize, requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/async-handler');
const {
	createViolationSchema,
	createViolationTypeSchema,
	idParamsSchema,
	replaceViolationSchema,
	replaceViolationTypeSchema,
	typeIdParamsSchema,
	updateViolationSchema,
	updateViolationTypeSchema,
	violationsQuerySchema,
	violationTypesQuerySchema,
} = require('./violations.validation');

const router = express.Router();

router.use(requireAuth);
router.get('/types', validate(violationTypesQuerySchema, 'query'), asyncHandler(controller.listViolationTypes));
router.post('/types', validate(createViolationTypeSchema), asyncHandler(controller.createViolationType));
router.get('/types/:violationTypeId', validate(typeIdParamsSchema, 'params'), asyncHandler(controller.getViolationTypeById));
router.put('/types/:violationTypeId', validate(typeIdParamsSchema, 'params'), validate(replaceViolationTypeSchema), asyncHandler(controller.replaceViolationType));
router.patch('/types/:violationTypeId', validate(typeIdParamsSchema, 'params'), validate(updateViolationTypeSchema), asyncHandler(controller.updateViolationType));
router.delete('/types/:violationTypeId', validate(typeIdParamsSchema, 'params'), asyncHandler(controller.deleteViolationType));
router.get('/', validate(violationsQuerySchema, 'query'), asyncHandler(controller.listViolations));
router.get('/:violationId', validate(idParamsSchema, 'params'), asyncHandler(controller.getViolationById));
router.post('/', validate(createViolationSchema), asyncHandler(controller.createViolation));
router.put('/:violationId', validate(idParamsSchema, 'params'), validate(replaceViolationSchema), asyncHandler(controller.replaceViolation));
router.patch('/:violationId', validate(idParamsSchema, 'params'), validate(updateViolationSchema), asyncHandler(controller.updateViolation));
router.delete('/:violationId', authorize('admin'), validate(idParamsSchema, 'params'), asyncHandler(controller.deleteViolation));

module.exports = router;