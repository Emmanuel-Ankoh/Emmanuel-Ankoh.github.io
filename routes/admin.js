const express = require('express');
const Admin = require('../models/admin');
const Project = require('../models/project');
const Message = require('../models/message');
const multer = require('multer');
const { cloudinary } = require('../utils/cloudinary');
const { body, validationResult } = require('express-validator');
const Settings = require('../models/settings');
const sanitizeHtml = require('sanitize-html');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Auth middleware
function ensureAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/admin/login');
}

// Login page
router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login', error: null });
});

// Login submit (with per-route rate limit)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
router.post('/login', loginLimiter, async (req, res, next) => {
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

// View messages with simple search & pagination
router.get('/messages', ensureAuth, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const q = (req.query.q || '').trim();
    const filter = q
      ? { $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { message: { $regex: q, $options: 'i' } }
        ] }
      : {};
    const [items, total] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Message.countDocuments(filter)
    ]);
    res.render('admin/messages', { title: 'Messages', messages: items, page, pages: Math.ceil(total / limit), q });
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

router.post('/messages/:id/unread', ensureAuth, async (req, res, next) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { read: false });
    res.redirect('/admin/messages');
  } catch (err) { next(err); }
});

router.post('/messages/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.redirect('/admin/messages');
  } catch (err) {
    next(err);
  }
});

router.post('/messages/bulk-delete', ensureAuth, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);
    if (ids.length) await Message.deleteMany({ _id: { $in: ids } });
    res.redirect('/admin/messages');
  } catch (err) { next(err); }
});

// Manage projects (list with simple search)
router.get('/projects', ensureAuth, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const filter = q ? { title: { $regex: q, $options: 'i' } } : {};
    const [items, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Project.countDocuments(filter)
    ]);
    res.render('admin/projects', { title: 'Manage Projects', projects: items, project: null, q, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/projects', ensureAuth, upload.single('image'),
  body('title').trim().notEmpty(),
  body('description').trim().isLength({ min: 20 }),
  async (req, res, next) => {
  try {
    const { title, description, imageUrl, githubUrl, demoUrl, tech, featured } = req.body;
    let uploadResult = null;
    if (cloudinary && req.file) {
      uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'portfolio' }, (err, resu) => err ? reject(err) : resolve(resu));
        stream.end(req.file.buffer);
      });
    }
    await Project.create({
      title,
      description,
      imageUrl: uploadResult ? uploadResult.secure_url : (imageUrl || ''),
      imagePublicId: uploadResult ? uploadResult.public_id : undefined,
      githubUrl,
      demoUrl,
      tech: tech ? tech.split(',').map((t) => t.trim()).filter(Boolean) : [],
      featured: featured === 'on'
    });
    res.redirect('/admin/projects');
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/edit', ensureAuth, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const filter = q ? { title: { $regex: q, $options: 'i' } } : {};
    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Project.countDocuments(filter)
    ]);
    const project = await Project.findById(req.params.id).lean();
    res.render('admin/projects', { title: 'Edit Project', projects, project, q, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id', ensureAuth, upload.single('image'),
  body('title').trim().notEmpty(),
  body('description').trim().isLength({ min: 20 }),
  async (req, res, next) => {
  try {
    const { title, description, imageUrl, githubUrl, demoUrl, tech, featured } = req.body;
    const project = await Project.findById(req.params.id);
    let uploadResult = null;
    if (cloudinary && req.file) {
      uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'portfolio' }, (err, resu) => err ? reject(err) : resolve(resu));
        stream.end(req.file.buffer);
      });
    }
    // Delete old cloudinary image if replaced
    if (uploadResult && project && project.imagePublicId && cloudinary) {
      try { await cloudinary.uploader.destroy(project.imagePublicId); } catch (e) { /* ignore */ }
    }
    project.title = title;
    project.description = description;
    project.imageUrl = uploadResult ? uploadResult.secure_url : (imageUrl || project.imageUrl);
    project.imagePublicId = uploadResult ? uploadResult.public_id : project.imagePublicId;
    project.githubUrl = githubUrl;
    project.demoUrl = demoUrl;
    project.tech = tech ? tech.split(',').map((t) => t.trim()).filter(Boolean) : [];
    project.featured = featured === 'on';
    await project.save();
    res.redirect('/admin/projects');
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (project && project.imagePublicId && cloudinary) {
      try { await cloudinary.uploader.destroy(project.imagePublicId); } catch (e) { /* ignore */ }
    }
    res.redirect('/admin/projects');
  } catch (err) {
    next(err);
  }
});
// Profile/Settings management
router.get('/profile', ensureAuth, async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton();
    res.render('admin/profile', { title: 'Profile', settings, error: null, success: null });
  } catch (e) { next(e); }
});

router.post('/profile', ensureAuth, upload.single('avatar'),
  body('name').trim().isLength({ min: 2 }),
  body('headline').trim().isLength({ min: 2 }),
  body('summary').trim().isLength({ min: 10 }),
  async (req, res, next) => {
    try {
      const settings = await Settings.getSingleton();
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('admin/profile', { title: 'Profile', settings, error: errors.array().map(e=>e.msg).join(', '), success: null });
      }
  const { name, headline, summary, avatarUrl } = req.body;
      settings.name = name;
      settings.headline = headline;
      settings.summary = summary;
      // Avatar upload (optional)
      if (req.file && req.file.buffer) {
        const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
        if (!allowed.includes(req.file.mimetype)) {
          return res.status(400).render('admin/profile', { title: 'Profile', settings, error: 'Unsupported avatar format. Please use JPG, PNG, WEBP, or GIF.', success: null });
        }
        try {
          const prevPublicId = settings.avatarPublicId;
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'portfolio/avatar' }, (err, resu) => err ? reject(err) : resolve(resu));
            stream.end(req.file.buffer);
          });
          settings.avatarUrl = uploadResult.secure_url;
          settings.avatarPublicId = uploadResult.public_id;
          if (prevPublicId && prevPublicId !== uploadResult.public_id) {
            try { await cloudinary.uploader.destroy(prevPublicId); } catch (e) { /* ignore */ }
          }
        } catch (e) {
          console.error('Avatar upload failed:', e);
          return res.status(400).render('admin/profile', { title: 'Profile', settings, error: 'Failed to upload avatar. Please try a smaller image or different format.', success: null });
        }
      } else if (avatarUrl) {
        settings.avatarUrl = avatarUrl;
      }
      // Extra fields
      settings.resumeUrl = req.body.resumeUrl || settings.resumeUrl;
      settings.contactIntro = req.body.contactIntro || settings.contactIntro;
  settings.location = (req.body.location || '').trim();
  settings.phone = (req.body.phone || '').trim();
  settings.availability = req.body.availability === 'on';
      // Social links (optional)
      settings.socials = {
        github: req.body['socials.github'] || settings.socials?.github || '',
        linkedin: req.body['socials.linkedin'] || settings.socials?.linkedin || '',
        twitter: req.body['socials.twitter'] || settings.socials?.twitter || '',
        email: req.body['socials.email'] || settings.socials?.email || ''
      };
      // Home CTAs (optional, must be in pairs if provided)
      settings.homeCta = {
        primaryText: req.body.homeCtaPrimaryText || settings.homeCta?.primaryText,
        primaryUrl: req.body.homeCtaPrimaryUrl || settings.homeCta?.primaryUrl,
        secondaryText: req.body.homeCtaSecondaryText || settings.homeCta?.secondaryText,
        secondaryUrl: req.body.homeCtaSecondaryUrl || settings.homeCta?.secondaryUrl
      };
      if ((settings.homeCta?.primaryText && !settings.homeCta?.primaryUrl) || (!settings.homeCta?.primaryText && settings.homeCta?.primaryUrl)) {
        return res.status(400).render('admin/profile', { title: 'Profile', settings, error: 'Primary CTA text and URL must both be provided.', success: null });
      }
      if ((settings.homeCta?.secondaryText && !settings.homeCta?.secondaryUrl) || (!settings.homeCta?.secondaryText && settings.homeCta?.secondaryUrl)) {
        return res.status(400).render('admin/profile', { title: 'Profile', settings, error: 'Secondary CTA text and URL must both be provided.', success: null });
      }
      // Do not change socials, homeCta, timeline, skills in simplified mode
      if (typeof req.body.aboutBody === 'string') {
        const clean = sanitizeHtml(req.body.aboutBody, {
          allowedTags: [
            'p','br','strong','em','u','s','a','ul','ol','li','blockquote','code','pre',
            'h1','h2','h3','h4','h5','h6','span'
          ],
          allowedAttributes: {
            a: ['href','name','target','rel'],
            span: ['class']
          },
          allowedSchemes: ['http','https','mailto'],
          allowProtocolRelative: false
        });
        settings.aboutBody = clean;
      }
      // Parse simple timeline text (one item per line; parts separated by |). Empty input clears timeline.
      if ('timelineText' in req.body) {
        const timelineText = (req.body.timelineText || '').trim();
        if (timelineText) {
          const lines = timelineText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const t = lines.map(line => {
            const parts = line.split('|').map(p => p.trim()).filter(p => p.length);
            let year, title, subtitle, description;
            if (parts.length >= 4) { [year, title, subtitle, description] = parts; }
            else if (parts.length === 3) { [year, title, description] = parts; }
            else if (parts.length === 2) { [title, description] = parts; }
            else { description = parts[0]; }
            return { year, title, subtitle, description };
          });
          settings.timeline = t;
        } else {
          settings.timeline = [];
        }
      }

      // Parse simple skills text (one per line: Name:Level). Empty input clears skills.
      if ('skillsText' in req.body) {
        const skillsText = (req.body.skillsText || '').trim();
        if (skillsText) {
          const lines = skillsText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const s = lines.map(line => {
            // Allow "Name:90" or "Name (90%)" or just "Name"
            let name = line; let level;
            const m = line.match(/^([^:]+):\s*([0-9]{1,3})\s*%?$/);
            if (m) {
              name = m[1].trim();
              level = Math.max(0, Math.min(100, parseInt(m[2], 10)));
            } else {
              const m2 = line.match(/^(.+?)\s*\((\d{1,3})%?\)$/);
              if (m2) {
                name = m2[1].trim();
                level = Math.max(0, Math.min(100, parseInt(m2[2], 10)));
              } else {
                name = line.trim();
                level = undefined;
              }
            }
            return { name, level };
          });
          settings.skills = s;
        } else {
          settings.skills = [];
        }
      }
      try {
        await settings.save();
      } catch (e) {
        console.error('Failed to save settings:', e);
        return res.status(400).render('admin/profile', { title: 'Profile', settings, error: 'Failed to save settings. Please check your inputs and try again.', success: null });
      }
      // Bust settings cache on next request
      if (req.session) req.session.forceSettingsReload = true;
      req.session.flash = { type: 'success', message: 'Profile updated' };
      res.redirect('/admin/profile');
    } catch (e) { next(e); }
  }
);

router.post('/projects/:id/toggle', ensureAuth, async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.redirect('/admin/projects');
    project.featured = !project.featured;
    await project.save();
    res.redirect('/admin/projects');
  } catch (err) { next(err); }
});

// Admin management
router.get('/admins', ensureAuth, async (req, res, next) => {
  try {
    const admins = await Admin.find().sort({ username: 1 }).lean();
    res.render('admin/admins', { title: 'Admins', admins, error: null });
  } catch (e) { next(e); }
});

router.post('/admins', ensureAuth,
  body('username').trim().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.session.flash = { type: 'error', message: errors.array().map(e=>e.msg).join(', ') };
        return res.redirect('/admin/admins');
      }
      const { username, password } = req.body;
      const exists = await Admin.findOne({ username });
      if (exists) {
        req.session.flash = { type: 'error', message: 'Username already exists' };
        return res.redirect('/admin/admins');
      }
      await Admin.bootstrap(username, password);
      req.session.flash = { type: 'success', message: 'Admin created' };
      res.redirect('/admin/admins');
    } catch (e) { next(e); }
  }
);

router.post('/admins/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    const total = await Admin.countDocuments();
    if (total <= 1) {
      req.session.flash = { type: 'error', message: 'Cannot delete the last admin.' };
      return res.redirect('/admin/admins');
    }
    await Admin.findByIdAndDelete(req.params.id);
    req.session.flash = { type: 'success', message: 'Admin deleted' };
    res.redirect('/admin/admins');
  } catch (e) { next(e); }
});

// Change password
router.get('/change-password', ensureAuth, (req, res) => {
  res.render('admin/change-password', { title: 'Change Password', error: null, success: null });
});

router.post('/change-password', ensureAuth,
  body('current').isLength({ min: 1 }),
  body('password').isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      const user = await Admin.findById(req.session.userId);
      if (!user) return res.redirect('/admin/login');
      const ok = await user.verifyPassword(req.body.current);
      if (!ok) return res.render('admin/change-password', { title: 'Change Password', error: 'Current password incorrect', success: null });
      const bcrypt = require('bcrypt');
      user.passwordHash = await bcrypt.hash(req.body.password, 10);
      await user.save();
      res.render('admin/change-password', { title: 'Change Password', error: null, success: 'Password updated.' });
    } catch (e) { next(e); }
  }
);

module.exports = router;
