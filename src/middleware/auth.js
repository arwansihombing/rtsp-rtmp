const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak valid' });
    }

    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
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
    res.status(401).send({ error: 'Silakan autentikasi terlebih dahulu.' });
  }
};

const adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send({ error: 'Akses ditolak. Hanya admin yang diizinkan.' });
  }
  next();
};

module.exports = {
  auth,
  adminOnly
};