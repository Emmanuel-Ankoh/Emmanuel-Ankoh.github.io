const express = require('express');
const Project = require('../models/project');
const Message = require('../models/message');
const Admin = require('../models/admin');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { sendMail } = require('../utils/mailer');
const Settings = require('../models/settings');

const router = express.Router();

// Home
router.get('/', async (req, res, next) => {
  try {
    const featured = await Project.find({ featured: true }).sort({ createdAt: -1 }).limit(6).lean();
    const settings = await Settings.getSingleton();
    res.render('index', { title: 'Home', featured, settings });
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
    const tech = (req.query.tech || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '9', 10), 1), 50);

    const filter = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tech: { $elemMatch: { $regex: q, $options: 'i' } } }
      ];
    }
    if (tech) {
      filter.tech = { $elemMatch: { $regex: `^${tech}$`, $options: 'i' } };
    }

    const [items, total, techs] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Project.countDocuments(filter),
      Project.distinct('tech')
    ]);
    const pages = Math.max(1, Math.ceil(total / limit));
    res.render('projects', { title: 'Projects', projects: items, q, tech, page, pages, techs: (techs || []).filter(Boolean).sort() });
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
router.post(
  '/contact',
  contactLimiter,
  body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('message').trim().isLength({ min: 10 }).withMessage('Message is too short'),
  async (req, res, next) => {
    try {
      // Honeypot: silently accept but drop if filled
      const honeypot = (req.body.company || '').trim();
      if (honeypot) {
        return res.render('contact', { title: 'Contact', success: 'Thanks! Your message has been received.', error: null });
      }

      // reCAPTCHA verification (optional, only if secret is set)
      if (process.env.RECAPTCHA_SECRET) {
        try {
          const token = req.body['g-recaptcha-response'] || '';
          if (!token) {
            return res.status(400).render('contact', { title: 'Contact', success: null, error: 'Please complete the reCAPTCHA.' });
          }
          const params = new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET,
            response: token,
            remoteip: req.ip || ''
          });
          const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
          });
          const data = await resp.json();
          if (!data.success) {
            return res.status(400).render('contact', { title: 'Contact', success: null, error: 'reCAPTCHA verification failed. Please try again.' });
          }
        } catch (e) {
          return res.status(400).render('contact', { title: 'Contact', success: null, error: 'Could not verify reCAPTCHA. Please try again.' });
        }
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const msg = errors.array().map(e => e.msg).join(', ');
        return res.status(400).render('contact', { title: 'Contact', success: null, error: msg });
      }
      const { name, email, message } = req.body;
      await Message.create({ name, email, message });
      // Send notification email if configured
      const owner = process.env.SMTP_TO || process.env.CONTACT_TO || process.env.SMTP_FROM || process.env.SMTP_USER;
      if (owner) {
        const subject = `New contact from ${name}`;
        const text = `From: ${name} <${email}>\n\n${message}`;
        sendMail({ to: owner, subject, text }).catch(err => console.warn('Email send failed:', err.message));
      }
      return res.render('contact', { title: 'Contact', success: 'Thanks! Your message has been received.', error: null });
    } catch (err) {
      next(err);
    }
  }
);

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
