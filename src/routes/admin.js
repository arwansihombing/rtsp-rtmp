const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminOnly } = require('../middleware/auth');
const { User, Stream } = require('../models');
const { logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const youtubeCredentialsRouter = require('./youtube-credentials');

const router = express.Router();

// Middleware untuk memastikan hanya admin yang bisa mengakses
router.use(auth, adminOnly);

// Rute untuk manajemen kredensial YouTube
router.use('/youtube-credentials', youtubeCredentialsRouter);

// Mendapatkan statistik sistem
router.get('/stats', async (req, res) => {
  try {
    const [userCount, streamCount, activeStreams] = await Promise.all([
      User.count(),
      Stream.count(),
      Stream.count({ where: { status: 'running' } })
    ]);

    res.json({
      users: userCount,
      totalStreams: streamCount,
      activeStreams,
      systemUptime: process.uptime()
    });
  } catch (error) {
    logger.error('Gagal mengambil statistik:', error);
    res.status(500).json({ error: 'Gagal mengambil statistik sistem' });
  }
});

// Mendapatkan daftar user
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (error) {
    logger.error('Gagal mengambil daftar user:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar user' });
  }
});

// Mengupdate status user
router.put('/users/:id', [
  body('isActive').isBoolean().withMessage('Status harus berupa boolean'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    await user.update(req.body);
    res.json(user);
  } catch (error) {
    logger.error('Gagal mengupdate user:', error);
    res.status(500).json({ error: 'Gagal mengupdate user' });
  }
});

// Mendapatkan log sistem
router.get('/logs', async (req, res) => {
  try {
    const logPath = path.join(__dirname, '../../logs/combined.log');
    const logs = await fs.readFile(logPath, 'utf8');
    const logEntries = logs.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    res.json(logEntries);
  } catch (error) {
    logger.error('Gagal mengambil log sistem:', error);
    res.status(500).json({ error: 'Gagal mengambil log sistem' });
  }
});

// Membersihkan log
router.post('/logs/clear', async (req, res) => {
  try {
    const logFiles = ['combined.log', 'error.log'];
    for (const file of logFiles) {
      const logPath = path.join(__dirname, '../../logs', file);
      await fs.writeFile(logPath, '');
    }
    res.json({ message: 'Log berhasil dibersihkan' });
  } catch (error) {
    logger.error('Gagal membersihkan log:', error);
    res.status(500).json({ error: 'Gagal membersihkan log' });
  }
});

// Restart semua stream
router.post('/streams/restart-all', async (req, res) => {
  try {
    const streams = await Stream.findAll({ where: { status: 'running' } });
    const { setupStreamManager } = require('../services/streamManager');
    const streamManager = await setupStreamManager();

    for (const stream of streams) {
      await streamManager.restartStream(stream.id);
    }

    res.json({ message: `${streams.length} stream berhasil di-restart` });
  } catch (error) {
    logger.error('Gagal me-restart semua stream:', error);
    res.status(500).json({ error: 'Gagal me-restart semua stream' });
  }
});

module.exports = router;