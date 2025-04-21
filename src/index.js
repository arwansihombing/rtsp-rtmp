require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const { setupLogger } = require('./utils/logger');
const { setupStreamManager } = require('./services/streamManager');
const { initializeDatabase } = require('./models/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup logger
const logger = setupLogger();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/streams', require('./routes/streams'));
app.use('/api/admin', require('./routes/admin'));

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send({ error: 'Terjadi kesalahan pada server!' });
});

// Database & Server initialization
async function init() {
  try {
    await sequelize.sync();
    logger.info('Database berhasil tersinkronisasi');
    
    await initializeDatabase();
    logger.info('Database berhasil diinisialisasi');

    const streamManager = await setupStreamManager();
    logger.info('Stream manager berhasil diinisialisasi');

    app.listen(PORT, () => {
      logger.info(`Server berjalan pada port ${PORT}`);
    });
  } catch (error) {
    logger.error('Gagal menginisialisasi aplikasi:', error);
    process.exit(1);
  }
}

init();