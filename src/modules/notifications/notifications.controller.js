const notificationsService = require('./notifications.service');

const getSummary = async (req, res) => {
  const data = await notificationsService.getConnectionSummary();
  return res.json({ data });
};

const getConnections = async (req, res) => {
  const data = await notificationsService.listConnections();
  return res.json({ data });
};

const sendNotification = async (req, res) => {
  const data = await notificationsService.sendToUsers(req.body);
  return res.status(201).json({
    message: 'Notification dispatch completed.',
    data,
  });
};

module.exports = {
  getSummary,
  getConnections,
  sendNotification,
};