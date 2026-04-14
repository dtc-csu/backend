const express = require('express');

const { getDependencyStatus } = require('../../config/dependency-checks');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'book-a-trike-api',
    timestamp: new Date().toISOString(),
  });
});

router.get('/dependencies', async (req, res, next) => {
  try {
    const dependencies = await getDependencyStatus();
    res.json({
      status: dependencies.database.ok ? 'ok' : 'degraded',
      service: 'book-a-trike-api',
      timestamp: new Date().toISOString(),
      data: dependencies,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;