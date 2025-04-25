const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminOnly } = require('../middleware/auth');
const config = require('../config/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Middleware untuk memastikan hanya admin yang bisa mengakses
router.use(auth, adminOnly);

// Mendapatkan kredensial YouTube yang tersimpan
router.get('/', async (req, res) => {
  try {
    const credentials = {
      apiKey: process.env.YOUTUBE_API_KEY || '',
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      redirectUri: process.env.OAUTH_REDIRECT_URI || config.oauth2.redirectUri
    };
    res.json(credentials);
  } catch (error) {
    logger.error('Gagal mengambil kredensial YouTube:', error);
    res.status(500).json({ error: 'Gagal mengambil kredensial YouTube' });
  }
});

// Validasi input kredensial
const credentialValidation = [
  body('apiKey').trim().notEmpty().withMessage('API Key harus diisi'),
  body('clientId').trim().notEmpty().withMessage('Client ID harus diisi'),
  body('clientSecret').trim().notEmpty().withMessage('Client Secret harus diisi'),
  body('redirectUri').trim().notEmpty().withMessage('Redirect URI harus diisi')
];

// Menyimpan kredensial YouTube baru
router.post('/', credentialValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { apiKey, clientId, clientSecret, redirectUri } = req.body;

    // Simpan kredensial ke environment variables
    process.env.YOUTUBE_API_KEY = apiKey;
    process.env.YOUTUBE_CLIENT_ID = clientId;
    process.env.YOUTUBE_CLIENT_SECRET = clientSecret;
    process.env.OAUTH_REDIRECT_URI = redirectUri;

    // Perbarui konfigurasi OAuth2 client
    const { oauth2Client } = require('../middleware/auth');
    oauth2Client._clientId = clientId;
    oauth2Client._clientSecret = clientSecret;
    oauth2Client._redirectUri = redirectUri;

    res.json({ message: 'Kredensial YouTube berhasil disimpan' });
  } catch (error) {
    logger.error('Gagal menyimpan kredensial YouTube:', error);
    res.status(500).json({ error: 'Gagal menyimpan kredensial YouTube' });
  }
});

// Memverifikasi kredensial YouTube
router.post('/verify', async (req, res) => {
  try {
    const { google } = require('googleapis');
    const youtube = google.youtube('v3');

    // Verifikasi API Key
    try {
      await youtube.channels.list({
        part: 'snippet',
        mine: true,
        key: process.env.YOUTUBE_API_KEY
      });
    } catch (error) {
      return res.status(400).json({ error: 'API Key tidak valid' });
    }

    // Verifikasi OAuth credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.OAUTH_REDIRECT_URI
    );

    try {
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: config.oauth2.scope
      });
      res.json({ 
        message: 'Kredensial valid',
        authUrl: url
      });
    } catch (error) {
      return res.status(400).json({ error: 'OAuth credentials tidak valid' });
    }
  } catch (error) {
    logger.error('Gagal memverifikasi kredensial YouTube:', error);
    res.status(500).json({ error: 'Gagal memverifikasi kredensial YouTube' });
  }
});

module.exports = router;