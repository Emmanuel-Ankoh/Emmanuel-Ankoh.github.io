# Repository layout

This repository is organized into three top-level folders to keep things tidy:

- `backend/` — the Django project and app (the CMS). Run/manage Django from this folder.
- `frontend/` — reserved for frontend-only projects or assets (currently a placeholder).
- `others/` — environment examples and auxiliary docs.

To run the Django app (from the repo root, use the backend manage.py):

```powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Admin UI: http://127.0.0.1:8000/admin/

Portfolio CMS (Django)

This repository contains a starter Django-based personal portfolio CMS. It provides:

- Django models for projects, experience, skills, blog posts, and contact messages.
- Django Admin as the content-management backend for editing all content.
- A frontend using Tailwind CSS (via CDN) and Alpine.js for a responsive, editable portfolio site.
- An AJAX contact endpoint that saves messages into the admin.

This is a starter scaffold. Setup and run instructions are below.

Setup (Windows PowerShell)
1. Create a virtualenv and activate it:
```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
2. Install dependencies:
```
pip install -r requirements.txt
```
3. Copy `.env.example` to `.env` and adjust variables if you want PostgreSQL. By default the project uses SQLite.
4. Run migrations and create a superuser:
```
python manage.py migrate
python manage.py createsuperuser
```
5. Run the dev server:
```
python manage.py runserver
```

Notes:
- To use Tailwind with a custom build pipeline, install Tailwind locally and configure the `static/` directory.
- Content can be edited in the Django admin at `/admin/` after creating a superuser.

