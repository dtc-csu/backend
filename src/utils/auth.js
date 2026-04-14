const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { config } = require('../config/env');

const hashPassword = (plainTextPassword) => bcrypt.hash(plainTextPassword, config.security.bcryptRounds);

const comparePassword = (plainTextPassword, passwordHash) => bcrypt.compare(plainTextPassword, passwordHash);

const signToken = (payload) =>
  jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

const verifyToken = (token) => jwt.verify(token, config.jwtSecret);

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
};