'use strict';

const express = require('express');
const { z } = require('zod');
const { getWeather } = require('./weather.service');

const router = express.Router();

const weatherQuerySchema = z.object({
  lat: z
    .string({ required_error: 'lat is required' })
    .regex(/^-?\d+(\.\d+)?$/, 'lat must be a numeric string')
    .transform(Number),
  lon: z
    .string({ required_error: 'lon is required' })
    .regex(/^-?\d+(\.\d+)?$/, 'lon must be a numeric string')
    .transform(Number),
});

/**
 * GET /api/v1/weather?lat={lat}&lon={lon}
 * Returns current weather for the given coordinates.
 * Does NOT require authentication so the client can call it
 * after obtaining the passenger's GPS location.
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = weatherQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid query parameters.',
        errors: parsed.error.issues,
      });
    }

    const { lat, lon } = parsed.data;
    const data = await getWeather({ lat, lon });
    return res.json({ data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
