const ratingsService = require('./ratings.service');
const bookingsService = require('../bookings/bookings.service');

const createRating = async (req, res) => {
  const passengerId = req.user.userId;
  const { bookingId, driverId, rating, comment } = req.body;

  // Verify the booking exists and belongs to this passenger.
  const booking = await bookingsService.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }
  if (booking.passengerid !== passengerId) {
    return res.status(403).json({ message: 'You can only rate your own bookings.' });
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({ message: 'You can only rate completed bookings.' });
  }
  if (booking.driverid !== driverId) {
    return res.status(400).json({ message: 'Driver ID does not match the booking.' });
  }

  // Prevent duplicate ratings for the same booking.
  const existing = await ratingsService.listByBooking(bookingId);
  if (existing && existing.length > 0) {
    return res.status(409).json({ message: 'This booking has already been rated.' });
  }

  const created = await ratingsService.create({ bookingId, passengerId, driverId, rating, comment });
  return res.status(201).json({ message: 'Rating submitted successfully.', data: created });
};

const listRatings = async (req, res) => {
  const { driverId, bookingId, passengerId, limit, offset } = req.query;

  let results;
  if (bookingId) {
    results = await ratingsService.listByBooking(Number(bookingId));
  } else if (driverId) {
    results = await ratingsService.listByDriver(Number(driverId), {
      limit: Number(limit ?? 25),
      offset: Number(offset ?? 0),
    });
  } else if (passengerId) {
    // List ratings submitted by a specific passenger
    results = await ratingsService.listByPassenger(Number(passengerId), {
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
