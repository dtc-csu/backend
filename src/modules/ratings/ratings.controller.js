const ratingsService = require('./ratings.service');

const createRating = async (req, res) => {
  const passengerId = req.user.userId;
  const { bookingId, driverId, rating, comment } = req.body;
  const created = await ratingsService.create({ bookingId, passengerId, driverId, rating, comment });
  return res.status(201).json({ message: 'Rating submitted successfully.', data: created });
};

const listRatings = async (req, res) => {
  const { driverId, bookingId, limit, offset } = req.query;

  let results;
  if (bookingId) {
    results = await ratingsService.listByBooking(Number(bookingId));
  } else if (driverId) {
    results = await ratingsService.listByDriver(Number(driverId), {
      limit: Number(limit ?? 25),
      offset: Number(offset ?? 0),
    });
  } else if (req.user?.role === 'admin') {
    // Admin can list all ratings without a filter
    results = await ratingsService.listAll({
      limit: Number(limit ?? 100),
      offset: Number(offset ?? 0),
    });
  } else {
    results = [];
  }

  return res.json({ data: results });
};

const getDriverAverage = async (req, res) => {
  const { driverId } = req.params;
  const stats = await ratingsService.averageForDriver(Number(driverId));
  return res.json({ data: stats });
};

module.exports = { createRating, listRatings, getDriverAverage };
