const { User } = require('./index');
const { logger } = require('../utils/logger');

async function initializeDatabase() {
  try {
    // Cek apakah user admin sudah ada
    const adminExists = await User.findOne({ where: { username: 'admin' } });

    if (!adminExists) {
      // Buat user admin default
      await User.create({
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      logger.info('User admin default berhasil dibuat');
    }
  } catch (error) {
    logger.error('Gagal menginisialisasi database:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };