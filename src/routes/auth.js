const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validasi input login
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username harus diisi'),
  body('password').trim().notEmpty().withMessage('Password harus diisi')
];

// Handle GET request for login
router.get('/login', (req, res) => {
  res.status(405).json({ error: 'Method not allowed. Please use POST method for login.' });
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });

    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Akun telah dinonaktifkan' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ user, token });
  } catch (error) {
    logger.error('Gagal login:', error);
    res.status(500).json({ error: 'Gagal melakukan login' });
  }
});

// Validasi input user
const userValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username minimal 3 karakter'),
  body('password').trim().isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role tidak valid')
];

// Membuat user baru (admin only)
router.post('/users', auth, adminOnly, userValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    logger.error('Gagal membuat user:', error);
    res.status(500).json({ error: 'Gagal membuat user' });
  }
});

// Mengubah password
router.put('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Password saat ini harus diisi'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!(await user.validatePassword(currentPassword))) {
      return res.status(400).json({ error: 'Password saat ini salah' });
    }

    await user.update({ password: newPassword });
    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    logger.error('Gagal mengubah password:', error);
    res.status(500).json({ error: 'Gagal mengubah password' });
  }
});

// Mendapatkan profil user
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.json(user);
  } catch (error) {
    logger.error('Gagal mengambil profil:', error);
    res.status(500).json({ error: 'Gagal mengambil profil' });
  }
});

module.exports = router;