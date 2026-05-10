const bookingsService = require('../bookings/bookings.service');
const paymentsService = require('./payments.service');

const canAccess = (user, payment) => user.role === 'admin' || payment.passengerid === user.userId;

const mapPaymongoMethod = (method) => {
  switch (method) {
    case 'gcash':
      return 'gcash';
    case 'paymaya':
      return 'paymaya';
    case 'card':
      return 'card';
    default:
      return null;
  }
};

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

const createPaymongoCheckout = async (req, res) => {
  const booking = await bookingsService.findById(req.body.bookingId);

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (req.user.role !== 'admin' && booking.passengerid !== req.user.userId) {
    return res.status(403).json({ message: 'You can only pay for your own bookings.' });
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY || '';
  if (!secretKey) {
    return res.status(500).json({ message: 'PayMongo is not configured on the server.' });
  }

  const paymongoMethod = mapPaymongoMethod(req.body.paymentMethod);
  if (!paymongoMethod) {
    return res.status(400).json({ message: 'Unsupported PayMongo payment method.' });
  }

  const amount = Number(req.body.amount);
  const amountCentavos = Math.round(amount * 100);
  const successUrl = process.env.PAYMONGO_SUCCESS_URL || 'https://example.com/paymongo-success';
  const cancelUrl = process.env.PAYMONGO_CANCEL_URL || 'https://example.com/paymongo-cancel';
  const referenceNumber = `bat-${req.body.bookingId}-${Date.now()}`;

  const auth = Buffer.from(`${secretKey}:`).toString('base64');
  const checkoutPayload = {
    data: {
      attributes: {
        billing: {
          name: req.user.fullName || `User ${req.user.userId}`,
          email: req.user.email || undefined,
        },
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        reference_number: referenceNumber,
        description: `Book A Trike booking #${req.body.bookingId}`,
        line_items: [
          {
            currency: 'PHP',
            amount: amountCentavos,
            name: `Ride payment for booking #${req.body.bookingId}`,
            quantity: 1,
          },
        ],
        payment_method_types: [paymongoMethod],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          bookingId: String(req.body.bookingId),
          userId: String(req.user.userId),
        },
      },
    },
  };

  const checkoutResponse = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(checkoutPayload),
  });

  const raw = await checkoutResponse.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (_) {
    parsed = null;
  }

  if (!checkoutResponse.ok) {
    const message = parsed?.errors?.[0]?.detail || parsed?.message || 'Failed to create PayMongo checkout session.';
    return res.status(502).json({ message, details: parsed || raw });
  }

  const checkoutData = parsed?.data || {};
  const checkoutSessionId = checkoutData.id || null;
  const checkoutUrl = checkoutData.attributes?.checkout_url || null;

  if (!checkoutSessionId || !checkoutUrl) {
    return res.status(502).json({ message: 'PayMongo returned an incomplete checkout response.' });
  }

  const paymentId = await paymentsService.create({
    bookingId: req.body.bookingId,
    amount,
    paymentMethod: req.body.paymentMethod,
    paymentStatus: 'pending',
    referenceNumber: checkoutSessionId,
  });
  const payment = await paymentsService.findById(paymentId);

  return res.status(201).json({
    message: 'PayMongo checkout created.',
    data: {
      checkoutUrl,
      checkoutSessionId,
      payment,
    },
  });
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
  createPaymongoCheckout,
  updatePayment,
  deletePayment,
};