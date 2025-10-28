# Personal Portfolio (Node.js, Express, MongoDB)

A modern, responsive developer portfolio with dynamic projects, contact form with backend persistence, and a simple admin panel.

## Features
- Home with animated hero and featured projects
- About with profile and timeline
- Projects grid (from MongoDB)
- Skills with progress bars
- Contact form (saves to MongoDB, server-side validation, optional email notifications)
- Admin panel (login, manage projects, view messages)
- Admin enhancements: change password, manage admins, bulk message delete, mark unread, project image upload (Cloudinary), toggle featured, search & pagination
- EJS templating, CSS Grid/Flexbox, AOS animations
- 404/500 error pages
 - Security: Helmet, rate limiting, CSRF protection
 - SEO: OG/Twitter tags, sitemap.xml, robots.txt

## Manage site content (Admin → Profile)
This app includes a simple CMS powered by a singleton Settings document. From the Admin panel, go to Profile to edit site-wide content:

- Identity: Name, Headline, Summary
- Avatar: Upload an image file (JPG/PNG/WebP up to 5MB) or paste an image URL. Uploaded files are stored on Cloudinary and replace the previous avatar.
- Home CTAs: Primary/Secondary text + URLs for hero buttons
- Resume URL: Link used for the Resume button
- Contact Intro: Short text shown at the top of the Contact page
- Socials: GitHub, LinkedIn, Twitter, Email – used across the footer/home
- About Body: Rich text editor (Quill) for the About page body
	- Server-side sanitization is applied (sanitize-html with a safe whitelist)
- Timeline: Simple text input. One item per line. Format is flexible:
	- year | title | subtitle | description (pipe-separated), or
	- title | description, or
	- just a description
- Skills: Simple text input. One per line using either of these:
	- Name:Level (0–100), e.g., JavaScript:90
	- Name (Level%), e.g., CSS (70%)

Changes are saved securely with CSRF protection and reflected across pages immediately. Settings are lightly cached to reduce DB reads, and the cache is auto-busted after each save.

## Tech
- Frontend: HTML5, CSS3, Vanilla JS
- Backend: Node.js, Express.js, EJS
 - Database: MongoDB Atlas

## Setup
1. Clone the repo
2. Create `.env` based on `.env.example`:

PORT=3000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=change_me
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
BASE_URL=https://your-app-url.example.com

# Email (optional)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Portfolio <no-reply@yourdomain.com>"
SMTP_TO=you@yourdomain.com

# Cloudinary (optional for image uploads)
# Either provide the single URL or the three creds below
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
# CLOUDINARY_CLOUD_NAME=your_cloud
# CLOUDINARY_API_KEY=your_key
# CLOUDINARY_API_SECRET=your_secret

# Analytics (optional)
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

3. Install deps and run

```powershell
npm install
npm start
```

4. Visit http://localhost:3000

The first login attempt can use the env admin credentials. A bootstrap route also exists at `/bootstrap-admin` to ensure admin creation.

## Deployment (Render)
You can deploy in two ways:

1) Render Blueprint (recommended)
- This repo includes `render.yaml`.
- Go to https://dashboard.render.com/iac and choose "New from Blueprint".
- Point to this GitHub repo (main branch) and Render will read `render.yaml`.
- After the service is created, set these env vars in Render (if not already set by the blueprint):
	- `MONGO_URI` = your MongoDB Atlas connection string
	- `ADMIN_PASSWORD` = your secure admin password
- The blueprint already configures:
	- Build Command: `npm install`
	- Start Command: `npm start`
	- PORT: 3000 (provided by env)
	- Optional: `BASE_URL` for absolute links/SEO (set to your Render URL)
- Deploy and note the live URL (e.g., `https://portfolio-xxxx.onrender.com`).

2) Manual (through dashboard)
- New → Web Service → Connect this repo
- Build Command: `npm install`
- Start Command: `npm start`
- Add env vars: `PORT`, `MONGO_URI`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
 - Optional: `BASE_URL`, `SMTP_*` vars, `CLOUDINARY_*` vars, `GOOGLE_ANALYTICS_ID`
- Deploy and note the live URL

Finally, edit `index.html` in the repo and set the "Open Portfolio" link to your Render URL. Optionally, enable the redirect script (already enabled) to auto-send users to the live app. Also set `BASE_URL` in your environment for accurate `og:url` and sitemap links.

## Admin usage cheatsheet

- Login: `/admin/login` using `ADMIN_USERNAME` and `ADMIN_PASSWORD` from your environment
- Dashboard: `/admin`
- Projects:
	- Add with optional image upload (to Cloudinary) or via image URL
	- Edit/Update, Delete, Toggle Featured, Search
- Messages:
	- Search, pagination, mark read/unread, bulk delete
- Admins:
	- Add/delete admins; cannot delete the last remaining admin
- Security:
	- Change password for the currently logged-in admin
- Profile (Site Settings):
	- Manage Home/About/Skills/Contact/socials/resume/CTAs/avatar via a single screen

## API/Routes
- `/` Home (featured projects)
- `/about`, `/projects`, `/skills`, `/contact`
- POST `/contact` saves a message
- `/admin/login` (POST for login)
- `/admin` dashboard
- `/admin/projects` CRUD
- `/admin/messages` list + search + pagination + mark read/unread + bulk delete
- `/admin/admins` manage admins (add/delete)
- `/admin/change-password` change current admin password

## Access & Security
- Sessions stored in MongoDB via `connect-mongo`
- Passwords hashed with bcrypt

## Example Admin Credentials (testing)
- username: `admin`
- password: `your_secure_password` (from .env)

## Notes
- Replace placeholder images under `public/images`.
- Social links and resume URL are managed in Admin → Profile (no code edits required).
- For a custom domain on Render, configure a CNAME and enable HTTPS.
 - GitHub Pages (this repo) includes a button on `index.html` that links to your deployed app; update it after deployment.

## Troubleshooting
- CSRF errors: Ensure you submit forms from the same origin/tab and that cookies are enabled. Refresh and resubmit if a form sat open too long.
- Mongo Atlas connection: Add your server’s IP (or 0.0.0.0/0 for testing) to Atlas Network Access.
- Cloudinary: Provide `CLOUDINARY_URL` (or individual creds) for uploads; otherwise paste image URLs instead of uploading.
- Emails: Configure SMTP env vars for contact notifications; the app safely no-ops if SMTP is missing.

## Develop locally (auto-reload)

For a smoother workflow during UI/template changes, use nodemon to auto-restart the server when files change:

```powershell
npm run dev
```

This repo includes a `nodemon.json` that watches `views/**/*.ejs`, routes, models, and CSS so your Admin pages (like Profile) reflect changes automatically.

### If you don’t see changes in Admin → Profile
- Ensure the server picked up your template edits. In production mode, view templates can be cached; restart the server or run `npm run dev` to reload EJS changes.
- After pressing Save, you should see a green “Profile updated” flash message at the top. If not, check for validation errors on the page.
- If values still don’t persist after Save:
	- Confirm MongoDB connection (`MONGO_URI`) is valid.
	- Check server logs for “Failed to save settings” or validation messages.
	- Try minimal inputs (e.g., only Name/Headline/Summary) to rule out invalid JSON in Timeline/Skills.
