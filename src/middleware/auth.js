const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { google } = require('googleapis');
const config = require('../config/auth');

// Inisialisasi OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    config.oauth2.clientId,
    config.oauth2.clientSecret,
    config.oauth2.redirectUri
);

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ error: 'Token tidak valid' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token telah kadaluarsa' });
      }
      return res.status(401).json({ error: 'Token tidak valid' });
    }

    const user = await User.findOne({
      where: {
        id: decoded.id,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan atau tidak aktif' });
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Silakan autentikasi terlebih dahulu' });
  }
};

const adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send({ error: 'Akses ditolak. Hanya admin yang diizinkan.' });
  }
  next();
};

// Middleware untuk memvalidasi token OAuth YouTube
const validateYouTubeOAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token OAuth YouTube tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    oauth2Client.setCredentials({ access_token: token });

    // Verifikasi token dengan Google
    try {
      const tokenInfo = await oauth2Client.getTokenInfo(token);
      if (!tokenInfo || !tokenInfo.email) {
        return res.status(401).json({ error: 'Token OAuth YouTube tidak valid' });
      }
      req.oauth2Client = oauth2Client;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token OAuth YouTube tidak valid' });
    }
  } catch (error) {
    console.error('Error validasi OAuth YouTube:', error);
    res.status(401).json({ error: 'Gagal memvalidasi token OAuth YouTube' });
  }
};

// Middleware untuk memvalidasi API Key YouTube
const validateYouTubeApiKey = (req, res, next) => {
  const apiKey = req.query.key || req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API Key YouTube tidak ditemukan' });
  }

  if (apiKey !== config.apiKey) {
    return res.status(401).json({ error: 'API Key YouTube tidak valid' });
  }

  next();
};

module.exports = {
  auth,
  adminOnly,
  validateYouTubeOAuth,
  validateYouTubeApiKey,
  oauth2Client
};