const express = require('express');
const { body, validationResult } = require('express-validator');
const { Stream } = require('../models');
const { auth } = require('../middleware/auth');
const { setupStreamManager } = require('../services/streamManager');
const { logger } = require('../utils/logger');
const youtubeService = require('../services/youtubeService');

const router = express.Router();

// Mendapatkan semua stream
router.get('/', auth, async (req, res) => {
  try {
    const streams = await Stream.findAll();
    res.json(streams);
  } catch (error) {
    logger.error('Gagal mengambil daftar stream:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar stream' });
  }
});

// Membuat stream baru
router.post('/', auth, async (req, res) => {
  try {
    const { name, rtspUrl, description } = req.body;
    if (!name || !rtspUrl) {
      return res.status(400).json({ error: 'Mohon isi nama dan URL RTSP' });
    }

    // Membuat live stream di YouTube
    const youtubeStream = await youtubeService.createLiveStream(name, description);

    const streamData = {
      name,
      rtspUrl,
      rtmpUrl: youtubeStream.rtmpUrl,
      youtubeStreamId: youtubeStream.streamId,
      youtubeBroadcastId: youtubeStream.broadcastId,
      status: 'stopped'
    };

    const stream = await Stream.create(streamData);
    res.status(201).json(stream);
  } catch (error) {
    logger.error('Gagal membuat stream:', error);
    res.status(500).json({ error: 'Gagal membuat stream' });
  }
});

// Mengupdate stream
router.put('/:id', auth, async (req, res) => {
  try {

    const stream = await Stream.findByPk(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream tidak ditemukan' });
    }

    await stream.update(req.body);
    res.json(stream);
  } catch (error) {
    logger.error('Gagal mengupdate stream:', error);
    res.status(500).json({ error: 'Gagal mengupdate stream' });
  }
});

// Menghapus stream
router.delete('/:id', auth, async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream tidak ditemukan' });
    }

    const streamManager = await setupStreamManager();
    await streamManager.stopStream(stream.id);

    // Hapus live stream dari YouTube jika ada
    if (stream.youtubeBroadcastId) {
      await youtubeService.deleteLiveStream(stream.youtubeBroadcastId);
    }

    await stream.destroy();
    res.json({ message: 'Stream berhasil dihapus' });
  } catch (error) {
    logger.error('Gagal menghapus stream:', error);
    res.status(500).json({ error: 'Gagal menghapus stream' });
  }
});

// Memulai stream
router.post('/:id/start', auth, async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream tidak ditemukan' });
    }

    const streamManager = await setupStreamManager();
    await streamManager.startStream(stream.id);
    res.json({ message: 'Stream berhasil dimulai' });
  } catch (error) {
    logger.error('Gagal memulai stream:', error);
    res.status(500).json({ error: 'Gagal memulai stream' });
  }
});

// Menghentikan stream
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream tidak ditemukan' });
    }

    const streamManager = await setupStreamManager();
    await streamManager.stopStream(stream.id);
    res.json({ message: 'Stream berhasil dihentikan' });
  } catch (error) {
    logger.error('Gagal menghentikan stream:', error);
    res.status(500).json({ error: 'Gagal menghentikan stream' });
  }
});

// Mendapatkan log stream
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream tidak ditemukan' });
    }

    // Implementasi pembacaan log untuk stream spesifik
    const logs = await new Promise((resolve, reject) => {
      const logPath = path.join(__dirname, `../../logs/stream_${stream.id}.log`);
      fs.readFile(logPath, 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            resolve([]);
          } else {
            reject(err);
          }
        } else {
          const logs = data.split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
          resolve(logs);
        }
      });
    });

    res.json(logs);
  } catch (error) {
    logger.error('Gagal mengambil log stream:', error);
    res.status(500).json({ error: 'Gagal mengambil log stream' });
  }
});

module.exports = router;