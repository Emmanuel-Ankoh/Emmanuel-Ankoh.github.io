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
app.use(helmet());
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use(limiter);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Sessions: use Mongo store when MONGO_URI looks valid; otherwise fallback to MemoryStore
const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
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

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Locals
app.use((req, res, next) => {
  const baseUrl = process.env.BASE_URL || '';
  res.locals.isAuthenticated = !!req.session.userId;
  res.locals.site = { name: 'Emmanuel Ankoh', baseUrl };
  res.locals.meta = res.locals.meta || { description: 'Portfolio of Emmanuel Ankoh: projects, skills, and contact.' };
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
  console.error(err.stack);
  res.status(500);
  res.render('500', { title: 'Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
