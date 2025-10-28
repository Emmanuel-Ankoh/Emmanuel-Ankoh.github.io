const express = require('express');
const Project = require('../models/project');
const Message = require('../models/message');
const Admin = require('../models/admin');
const rateLimit = require('express-rate-limit');

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
    const q = (req.query.q || '').trim();
    const filter = q
      ? { $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tech: { $elemMatch: { $regex: q, $options: 'i' } } }
        ] }
      : {};
    const projects = await Project.find(filter).sort({ createdAt: -1 }).lean();
    res.render('projects', { title: 'Projects', projects, q });
  } catch (err) {
    next(err);
  }
});

// Project detail
router.get('/projects/:slug', async (req, res, next) => {
  try {
    const project = await Project.findOne({ slug: req.params.slug }).lean();
    if (!project) return res.status(404).render('404', { title: 'Not Found' });
    res.render('project', {
      title: project.title,
      project,
      meta: { description: project.description }
    });
  } catch (err) { next(err); }
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
const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
router.post('/contact', contactLimiter, async (req, res, next) => {
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

// API: projects JSON
router.get('/api/projects', async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    res.json(projects);
  } catch (e) { next(e); }
});

// Sitemap XML
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const baseUrl = (req.protocol + '://' + req.get('host'));
    const staticUrls = ['/', '/about', '/projects', '/skills', '/contact'];
    const projects = await Project.find({}, 'slug updatedAt').lean();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    staticUrls.forEach(p => {
      xml += `\n  <url><loc>${baseUrl}${p}</loc></url>`;
    });
    projects.forEach(p => {
      xml += `\n  <url><loc>${baseUrl}/projects/${p.slug}</loc>${p.updatedAt ? `<lastmod>${p.updatedAt.toISOString()}</lastmod>` : ''}</url>`;
    });
    xml += '\n</urlset>';
    res.type('application/xml').send(xml);
  } catch (e) { next(e); }
});

module.exports = router;
