require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const mongoose = require('mongoose');

const mainRoutes = require('./routes/main');
const adminRoutes = require('./routes/admin');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');

const app = express();
app.set('trust proxy', 1); // for proxies like Render

// Config
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/portfolio';

// DB connect (don't block server start)
mongoose.set('strictQuery', false);
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.quilljs.com", "https://www.google.com", "https://www.gstatic.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdn.quilljs.com", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "connect-src": ["'self'", "https://res.cloudinary.com"],
      "frame-src": ["https://www.google.com"]
    }
  }
}));
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use(limiter);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Sessions: use Mongo store when MONGO_URI looks valid; otherwise fallback to MemoryStore
const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
};

try {
  if (MONGO_URI && /mongodb(\+srv)?:\/\//.test(MONGO_URI)) {
    sessionOptions.store = MongoStore.create({ mongoUrl: MONGO_URI });
    console.log('Session store: MongoDB');
  } else {
    console.warn('Session store: Memory (MONGO_URI not set). Do not use in production.');
  }
} catch (e) {
  console.error('Failed to init Mongo session store, falling back to Memory:', e.message);
}

app.use(session(sessionOptions));

// Flash messages (simple session-based)
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Locals
// Lightweight cached settings to avoid DB hit on every request
const Settings = require('./models/settings');
let __settingsCache = { data: null, ts: 0 };
async function loadSettingsCached() {
  const now = Date.now();
  if (!__settingsCache.data || now - __settingsCache.ts > 60_000) {
    try {
      __settingsCache.data = await Settings.getSingleton();
      __settingsCache.ts = now;
    } catch (e) {
      // ignore settings load errors
    }
  }
  return __settingsCache.data;
}

app.use(async (req, res, next) => {
  // If a recent Settings update occurred, bust cache once
  if (req.session && req.session.forceSettingsReload) {
    __settingsCache.ts = 0;
    __settingsCache.data = null;
    delete req.session.forceSettingsReload;
  }
  const baseUrl = process.env.BASE_URL || '';
  res.locals.isAuthenticated = !!req.session.userId;
  const settings = await loadSettingsCached();
  const siteName = settings?.name || 'Emmanuel Ankoh';
  res.locals.profile = settings || {};
  res.locals.site = { name: siteName, baseUrl };
  res.locals.meta = res.locals.meta || { description: `Portfolio of ${siteName}: projects, skills, and contact.` };
  res.locals.analyticsId = process.env.GOOGLE_ANALYTICS_ID || '';
  res.locals.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY || '';
  // Cloudinary helpers for responsive images
  function isCloudinaryUrl(url) {
    return typeof url === 'string' && /https?:\/\/res\.cloudinary\.com\//.test(url);
  }
  function addTransform(url, transform) {
    // insert transform after /upload/
    return url.replace(/\/upload\//, `/upload/${transform ? transform + ',' : ''}`);
  }
  function clSrcset(url, widths = [360, 640, 960, 1280]) {
    if (!isCloudinaryUrl(url)) return '';
    const cleaned = widths
      .filter((w, i, arr) => Number.isFinite(w) && w > 0 && arr.indexOf(w) === i)
      .sort((a, b) => a - b);
    const parts = cleaned.map(w => {
      const t = `f_auto,q_auto,c_scale,w_${w},dpr_auto`;
      return `${addTransform(url, t)} ${w}w`;
    });
    return parts.join(', ');
  }
  res.locals.clSrcset = clSrcset;
  res.locals.clSizesDefault = "(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw";
  next();
});

// CSRF protection (skip certain paths like /api and /healthz)
const csrfProtection = csrf();
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/healthz') return next();
  return csrfProtection(req, res, next);
});
app.use((req, res, next) => {
  if (typeof req.csrfToken === 'function') {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
});

// Routes
app.use('/', mainRoutes);
app.use('/admin', adminRoutes);

// Health check
app.get('/healthz', (req, res) => res.type('text').send('ok'));

// 404 handler
app.use((req, res) => {
  res.status(404);
  res.render('404', { title: 'Page Not Found', meta: { description: 'The page you requested was not found.' } });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.warn('Invalid CSRF token');
    res.status(403);
    return res.render('500', { title: 'Form expired or invalid' });
  }
  console.error(err.stack);
  res.status(500);
  res.render('500', { title: 'Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
