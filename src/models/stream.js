const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Stream = sequelize.define('Stream', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    rtspUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isUrl: true
      }
    },
    rtmpUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isUrl: true
      }
    },
    streamKey: {
      type: DataTypes.STRING,
      allowNull: false
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