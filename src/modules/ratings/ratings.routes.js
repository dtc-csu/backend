const express = require('express');

const controller = require('./ratings.controller');
const { authorize, requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/async-handler');
const { createRatingSchema, ratingsQuerySchema } = require('./ratings.validation');

const router = express.Router();

router.use(requireAuth);
router.get('/', validate(ratingsQuerySchema, 'query'), asyncHandler(controller.listRatings));
router.get('/driver/:driverId', asyncHandler(controller.getDriverAverage));
router.post('/', authorize('passenger'), validate(createRatingSchema), asyncHandler(controller.createRating));

module.exports = router;
