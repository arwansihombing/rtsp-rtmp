const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const Stream = sequelize.define('Stream', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rtspUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    rtmpUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    streamKey: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    resolution: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '1280x720'
    },
    status: {
      type: DataTypes.ENUM('running', 'stopped', 'error'),
      defaultValue: 'stopped'
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    autoRestart: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    ffmpegOptions: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('ffmpegOptions');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('ffmpegOptions', JSON.stringify(value));
      }
    }
  });

  return Stream;
};