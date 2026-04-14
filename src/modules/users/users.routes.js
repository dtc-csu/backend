const express = require('express');

const controller = require('./users.controller');
const { authorize, requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { createUserSchema, idParamsSchema, replaceUserProfileSchema, updateUserSchema, usersQuerySchema } = require('./users.validation');
const { asyncHandler } = require('../../utils/async-handler');

const router = express.Router();

router.use(requireAuth);
router.get('/me', asyncHandler(controller.getCurrentUser));
router.get('/me/firebase-token', asyncHandler(controller.getFirebaseToken));
router.get('/', authorize('admin'), validate(usersQuerySchema, 'query'), asyncHandler(controller.listUsers));
router.post('/', authorize('admin'), validate(createUserSchema), asyncHandler(controller.createUser));
router.get('/:userId', validate(idParamsSchema, 'params'), asyncHandler(controller.getUserById));
router.put('/:userId', validate(idParamsSchema, 'params'), validate(replaceUserProfileSchema), asyncHandler(controller.replaceUserProfile));
router.patch('/:userId', validate(idParamsSchema, 'params'), validate(updateUserSchema), asyncHandler(controller.updateUser));
router.delete('/:userId', authorize('admin'), validate(idParamsSchema, 'params'), asyncHandler(controller.deleteUser));

module.exports = router;