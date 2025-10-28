const express = require('express');
const Admin = require('../models/admin');
const Project = require('../models/project');
const Message = require('../models/message');

const router = express.Router();

// Auth middleware
function ensureAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/admin/login');
}

// Login page
router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login', error: null });
});

// Login submit
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).render('admin/login', { title: 'Admin Login', error: 'Missing credentials' });

    // Ensure exists or bootstrap
    await Admin.bootstrap(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);

    const user = await Admin.findOne({ username });
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).render('admin/login', { title: 'Admin Login', error: 'Invalid username or password' });
    }
    req.session.userId = user._id.toString();
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Admin dashboard
router.get('/', ensureAuth, async (req, res, next) => {
  try {
    const projectCount = await Project.countDocuments();
    const unreadMessages = await Message.countDocuments({ read: false });
    res.render('admin/dashboard', { title: 'Admin', projectCount, unreadMessages });
  } catch (err) {
    next(err);
  }
});

// View messages
router.get('/messages', ensureAuth, async (req, res, next) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }).lean();
    res.render('admin/messages', { title: 'Messages', messages });
  } catch (err) {
    next(err);
  }
});

router.post('/messages/:id/read', ensureAuth, async (req, res, next) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { read: true });
    res.redirect('/admin/messages');
  } catch (err) {
    next(err);
  }
});

router.post('/messages/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.redirect('/admin/messages');
  } catch (err) {
    next(err);
  }
});

// Manage projects
router.get('/projects', ensureAuth, async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    res.render('admin/projects', { title: 'Manage Projects', projects, project: null });
  } catch (err) {
    next(err);
  }
});

router.post('/projects', ensureAuth, async (req, res, next) => {
  try {
    const { title, description, imageUrl, githubUrl, demoUrl, tech, featured } = req.body;
    await Project.create({
      title,
      description,
      imageUrl,
      githubUrl,
      demoUrl,
      tech: tech ? tech.split(',').map((t) => t.trim()) : [],
      featured: featured === 'on'
    });
    res.redirect('/admin/projects');
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/edit', ensureAuth, async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    const project = await Project.findById(req.params.id).lean();
    res.render('admin/projects', { title: 'Edit Project', projects, project });
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id', ensureAuth, async (req, res, next) => {
  try {
    const { title, description, imageUrl, githubUrl, demoUrl, tech, featured } = req.body;
    await Project.findByIdAndUpdate(req.params.id, {
      title,
      description,
      imageUrl,
      githubUrl,
      demoUrl,
      tech: tech ? tech.split(',').map((t) => t.trim()) : [],
      featured: featured === 'on'
    });
    res.redirect('/admin/projects');
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.redirect('/admin/projects');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
