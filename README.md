# Personal Portfolio (Node.js, Express, MongoDB)

A modern, responsive developer portfolio with dynamic projects, contact form with backend persistence, and a simple admin panel.

## Features
- Home with animated hero and featured projects
- About with profile and timeline
- Projects grid (from MongoDB)
- Skills with progress bars
- Contact form (saves to MongoDB, server-side validation)
- Admin panel (login, manage projects, view messages)
- EJS templating, CSS Grid/Flexbox, AOS animations
- 404/500 error pages

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
- Deploy and note the live URL (e.g., `https://portfolio-xxxx.onrender.com`).

2) Manual (through dashboard)
- New → Web Service → Connect this repo
- Build Command: `npm install`
- Start Command: `npm start`
- Add env vars: `PORT`, `MONGO_URI`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- Deploy and note the live URL

Finally, edit `index.html` in the repo and set the "Open Portfolio" link to your Render URL. Optionally, enable the commented redirect script to auto-send users to the live app.

## API/Routes
- `/` Home (featured projects)
- `/about`, `/projects`, `/skills`, `/contact`
- POST `/contact` saves a message
- `/admin/login` (POST for login)
- `/admin` dashboard
- `/admin/projects` CRUD
- `/admin/messages` list + mark read/delete

## Access & Security
- Sessions stored in MongoDB via `connect-mongo`
- Passwords hashed with bcrypt

## Example Admin Credentials (testing)
- username: `admin`
- password: `your_secure_password` (from .env)

## Notes
- Replace placeholder images under `public/images`.
- Update social links in `views/partials/footer.ejs`.
- For a custom domain on Render, configure a CNAME and enable HTTPS.
 - GitHub Pages (this repo) includes a button on `index.html` that links to your deployed app; update it after deployment.
