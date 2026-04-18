const express = require('express');
const controller = require('./public.controller');
const { asyncHandler } = require('../../utils/async-handler');

const router = express.Router();

router.get('/admin-count', asyncHandler(controller.getAdminCount));

module.exports = router;
