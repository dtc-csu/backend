const bookingsService = require('../bookings/bookings.service');
const paymentsService = require('./payments.service');

const canAccess = (user, payment) => user.role === 'admin' || payment.passengerid === user.userId;

const listPayments = async (req, res) => {
  const payments = await paymentsService.list(req.query);
  const visiblePayments = req.user.role === 'admin'
    ? payments
    : payments.filter((payment) => payment.passengerid === req.user.userId);

  return res.json({ data: visiblePayments });
};

const getPaymentById = async (req, res) => {
  const payment = await paymentsService.findById(req.params.paymentId);

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found.' });
  }

  if (!canAccess(req.user, payment)) {
    return res.status(403).json({ message: 'You do not have access to this payment.' });
  }

  return res.json({ data: payment });
};

const createPayment = async (req, res) => {
  const booking = await bookingsService.findById(req.body.bookingId);

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (req.user.role !== 'admin' && booking.passengerid !== req.user.userId) {
    return res.status(403).json({ message: 'You can only pay for your own bookings.' });
  }

  const paymentId = await paymentsService.create(req.body);
  const payment = await paymentsService.findById(paymentId);
  return res.status(201).json({ message: 'Payment recorded successfully.', data: payment });
};

const updatePayment = async (req, res) => {
  const payment = await paymentsService.findById(req.params.paymentId);

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found.' });
  }

  if (!canAccess(req.user, payment)) {
    return res.status(403).json({ message: 'You do not have access to update this payment.' });
  }

  const updated = await paymentsService.update(payment.paymentid, req.body);

  if (!updated) {
    return res.status(400).json({ message: 'No payment fields were updated.' });
  }

  const refreshed = await paymentsService.findById(payment.paymentid);
  return res.json({ message: 'Payment updated successfully.', data: refreshed });
};

const deletePayment = async (req, res) => {
  const payment = await paymentsService.findById(req.params.paymentId);

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete payments.' });
  }

  await paymentsService.remove(payment.paymentid);
  return res.status(204).send();
};

module.exports = {
  listPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
};