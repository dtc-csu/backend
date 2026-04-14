const bookingsService = require('../bookings/bookings.service');
const chatService = require('./chat.service');
const usersService = require('../users/users.service');

const canAccessBookingChat = (user, booking) => {
  if (user.role === 'admin') {
    return true;
  }

  return booking.passengerid === user.userId || booking.driverid === user.userId;
};

const getToken = async (req, res) => {
  const user = await usersService.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const payload = await chatService.issueUserToken(usersService.toPublicUser(user));
  return res.json({ data: payload });
};

const createSupportChannel = async (req, res) => {
  const user = await usersService.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const channel = await chatService.createOrGetSupportChannel(usersService.toPublicUser(user));
  return res.status(201).json({
    message: 'Support chat is ready.',
    data: channel,
  });
};

const createBookingChannel = async (req, res) => {
  const booking = await bookingsService.findById(req.body.bookingId);

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (!booking.passengerid || !booking.driverid) {
    return res.status(409).json({ message: 'Booking chat requires both a passenger and an assigned driver.' });
  }

  if (!canAccessBookingChat(req.user, booking)) {
    return res.status(403).json({ message: 'You do not have access to this booking chat.' });
  }

  const passenger = await usersService.findById(booking.passengerid);
  const driver = await usersService.findById(booking.driverid);

  if (!passenger || !driver) {
    return res.status(404).json({ message: 'Booking participants could not be resolved.' });
  }

  const channel = await chatService.createOrGetBookingChannel({
    booking,
    passenger: usersService.toPublicUser(passenger),
    driver: usersService.toPublicUser(driver),
  });

  return res.status(201).json({
    message: 'Booking chat is ready.',
    data: channel,
  });
};

const getBookingChannel = async (req, res) => {
  const booking = await bookingsService.findById(req.params.bookingId);

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (!canAccessBookingChat(req.user, booking)) {
    return res.status(403).json({ message: 'You do not have access to this booking chat.' });
  }

  const channel = await chatService.getBookingChannel(booking.bookingid);
  return res.json({ data: channel });
};

module.exports = {
  getToken,
  createSupportChannel,
  createBookingChannel,
  getBookingChannel,
};