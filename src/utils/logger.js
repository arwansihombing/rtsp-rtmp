const winston = require('winston');
const path = require('path');

let logger;

function setupLogger() {
  if (!logger) {
    logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [] // Menonaktifkan file transport sementara untuk debugging
    });

    // Selalu tambahkan console transport
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  return logger;
}

module.exports = {
  setupLogger,
  logger: setupLogger()
};