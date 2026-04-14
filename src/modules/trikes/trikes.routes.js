const express = require('express');

const controller = require('./trikes.controller');
const { authorize, requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/async-handler');
const { createTrikeSchema, idParamsSchema, trikesQuerySchema, updateTrikeSchema } = require('./trikes.validation');

const router = express.Router();

router.use(requireAuth);
router.get('/', validate(trikesQuerySchema, 'query'), asyncHandler(controller.listTrikes));
router.get('/:trikeId', validate(idParamsSchema, 'params'), asyncHandler(controller.getTrikeById));
router.post('/', authorize('admin'), validate(createTrikeSchema), asyncHandler(controller.createTrike));
router.patch('/:trikeId', authorize('admin'), validate(idParamsSchema, 'params'), validate(updateTrikeSchema), asyncHandler(controller.updateTrike));
router.delete('/:trikeId', authorize('admin'), validate(idParamsSchema, 'params'), asyncHandler(controller.deleteTrike));

module.exports = router;