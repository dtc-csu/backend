const usersService = require('../users/users.service');

const getAdminCount = async (req, res) => {
  const cnt = await usersService.countByRole('admin');
  return res.json({ data: { count: cnt } });
};

module.exports = {
  getAdminCount,
};
