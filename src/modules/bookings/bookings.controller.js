const bookingsService = require('./bookings.service');
const notificationsService = require('../notifications/notifications.service');

const sendBookingNotifications = async ({ beforeBooking, afterBooking, actorUser }) => {
  const booking = afterBooking || beforeBooking;

  if (!booking) {
    return;
  }

  const targets = new Set();

  if (booking.passengerid) {
    targets.add(Number(booking.passengerid));
  }

  if (booking.driverid) {
    targets.add(Number(booking.driverid));
  }

  if (targets.size === 0) {
    return;
  }

  if (!beforeBooking && afterBooking) {
    await notificationsService.notifyUsersSafely({
      userIds: [...targets],
      title: 'Booking Created',
      body: `Booking #${booking.bookingid} was created with status ${booking.status}.`,
      data: {
        type: 'booking_created',
        bookingId: String(booking.bookingid),
        status: String(booking.status || 'pending'),
        actorRole: String(actorUser.role),
      },
    });
    return;
  }

  if (beforeBooking && afterBooking && beforeBooking.driverid !== afterBooking.driverid && afterBooking.driverid) {
    await notificationsService.notifyUsersSafely({
      userIds: [...targets],
      title: 'Driver Assigned',
      body: `Booking #${booking.bookingid} now has an assigned driver.`,
      data: {
        type: 'driver_assigned',
        bookingId: String(booking.bookingid),
        driverId: String(afterBooking.driverid),
      },
    });
  }

  if (beforeBooking && afterBooking && beforeBooking.status !== afterBooking.status) {
    await notificationsService.notifyUsersSafely({
      userIds: [...targets],
      title: 'Booking Updated',
      body: `Booking #${booking.bookingid} status changed from ${beforeBooking.status} to ${afterBooking.status}.`,
      data: {
        type: 'booking_status_changed',
        bookingId: String(booking.bookingid),
        previousStatus: String(beforeBooking.status || ''),
        status: String(afterBooking.status || ''),
      },
    });
  }
};

const canRead = (user, booking) => {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'passenger') {
    return booking.passengerid === user.userId;
  }

  if (user.role === 'driver') {
    return booking.driverid === user.userId;
  }

  return false;
};

const listBookings = async (req, res) => {
  const filters = { ...req.query };

  if (req.user.role === 'passenger') {
    filters.passengerId = req.user.userId;
  }

  if (req.user.role === 'driver') {
    filters.driverId = req.user.userId;
  }

  const bookings = await bookingsService.list(filters);
  return res.json({ data: bookings });
};

const getBookingById = async (req, res) => {
  const booking = await bookingsService.findById(req.params.bookingId);

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (!canRead(req.user, booking)) {
    return res.status(403).json({ message: 'You do not have access to this booking.' });
  }

  return res.json({ data: booking });
};

const createBooking = async (req, res) => {
  const payload = {
    ...req.body,
    passengerId: req.user.role === 'passenger' ? req.user.userId : req.body.passengerId,
  };

  const bookingId = await bookingsService.create(payload);
  const booking = await bookingsService.findById(bookingId);
  await sendBookingNotifications({ afterBooking: booking, actorUser: req.user });

  return res.status(201).json({ message: 'Booking created successfully.', data: booking });
};

const updateBooking = async (req, res) => {
  const booking = await bookingsService.findById(req.params.bookingId);

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  const isAdmin = req.user.role === 'admin';
  const isPassengerOwner = req.user.role === 'passenger' && booking.passengerid === req.user.userId;
  const isDriverOwner = req.user.role === 'driver' && booking.driverid === req.user.userId;
  // Allow a driver to accept an unassigned pending booking
  const isDriverAccepting =
    req.user.role === 'driver' && booking.status === 'pending' && !booking.driverid;

  if (!isAdmin && !isPassengerOwner && !isDriverOwner && !isDriverAccepting) {
    return res.status(403).json({ message: 'You do not have access to update this booking.' });
  }

  if (isPassengerOwner) {
    delete req.body.driverId;
  }

  // Force the accepting driver to be set as the booking's driver
  if (isDriverAccepting) {
    req.body.driverId = req.user.userId;
  }

  const updated = await bookingsService.update(booking.bookingid, req.body);

  if (!updated) {
    return res.status(400).json({ message: 'No booking fields were updated.' });
  }

  const refreshed = await bookingsService.findById(booking.bookingid);
  await sendBookingNotifications({ beforeBooking: booking, afterBooking: refreshed, actorUser: req.user });
  return res.json({ message: 'Booking updated successfully.', data: refreshed });
};

const deleteBooking = async (req, res) => {
  const booking = await bookingsService.findById(req.params.bookingId);

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (req.user.role !== 'admin' && booking.passengerid !== req.user.userId) {
    return res.status(403).json({ message: 'You do not have access to delete this booking.' });
  }

  await bookingsService.remove(booking.bookingid);
  return res.status(204).send();
};

module.exports = {
  listBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
};