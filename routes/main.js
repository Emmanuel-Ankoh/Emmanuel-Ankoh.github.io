const express = require('express');
const Project = require('../models/project');
const Message = require('../models/message');
const Admin = require('../models/admin');

const router = express.Router();

// Home
router.get('/', async (req, res, next) => {
  try {
    const featured = await Project.find({ featured: true }).sort({ createdAt: -1 }).limit(6).lean();
    res.render('index', { title: 'Home', featured });
  } catch (err) {
    next(err);
  }
});

// About
router.get('/about', (req, res) => {
  res.render('about', { title: 'About' });
});

// Projects
router.get('/projects', async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    res.render('projects', { title: 'Projects', projects });
  } catch (err) {
    next(err);
  }
});

// Skills
router.get('/skills', (req, res) => {
  res.render('skills', { title: 'Skills' });
});

// Contact (GET)
router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact', success: null, error: null });
});

// Contact (POST)
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).render('contact', { title: 'Contact', success: null, error: 'All fields are required.' });
    }
    await Message.create({ name, email, message });
    return res.render('contact', { title: 'Contact', success: 'Thanks! Your message has been received.', error: null });
  } catch (err) {
    next(err);
  }
});

// Bootstrap admin on demand (optional route)
router.get('/bootstrap-admin', async (req, res, next) => {
  try {
    await Admin.bootstrap(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
    res.send('Admin bootstrap attempted.');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
