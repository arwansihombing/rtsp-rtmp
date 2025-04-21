const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false
});

const Stream = require('./stream')(sequelize);
const User = require('./user')(sequelize);

module.exports = {
  sequelize,
  Stream,
  User
};