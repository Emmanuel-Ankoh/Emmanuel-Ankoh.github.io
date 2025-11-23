# Deployment guide (Render)

This document contains recommended Build / Start commands and the environment variables to set when deploying this Django project to Render.

## Recommended Build Commands

Use one of the following depending on whether you have a separate frontend build step.

- No separate frontend (Django-only):

```powershell
pip install -r requirements.txt; python manage.py collectstatic --noinput
```

- With a frontend in `frontend/` (example using npm):

```powershell
npm ci --prefix frontend; npm run build --prefix frontend; pip install -r requirements.txt; python manage.py collectstatic --noinput
```

Notes:
- Ensure the frontend build outputs into a directory `collectstatic` can read (e.g. `frontend/build` or `frontend/dist`). If the frontend writes somewhere else, either add that directory to `STATICFILES_DIRS` in `myportfolio/settings.py` or copy/move files into `portfolio/static` as part of build.
- `collectstatic` must run after any frontend build so hashed assets are discovered and included in the staticfiles manifest.

## Start Command

Render Start Command (example):

```powershell
gunicorn myportfolio.wsgi:application --bind 0.0.0.0:$PORT --log-file -
```

If you prefer to use `uvicorn` with an ASGI entrypoint (only if ASGI-ready), adjust accordingly.

## Environment Variables (recommended)

Set these in Render's environment (or via `render.yaml` / Dashboard secrets). Replace placeholder values with real secrets.

- `SECRET_KEY`: a secure Django secret (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`).
- `DEBUG`: `False` in production
- `DATABASE_URL`: Postgres URL if using Render Postgres (optional; otherwise the project uses SQLite)
- `ALLOWED_HOSTS`: comma-separated hosts (or leave empty to use sensible defaults)
- `RENDER_EXTERNAL_HOSTNAME`: Render sets this automatically; used by the settings to add the hostname to `ALLOWED_HOSTS`.
- `CSRF_TRUSTED_ORIGINS`: include your Render app URL if needed (comma-separated)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: optional — only if you plan to use Cloudinary for media.

Optional email / other secrets:
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` etc.

## Staticfiles / Frontend notes

- If your frontend build produces its own hashed filenames (React/Vite/Parcel), make sure `collectstatic` sees the built files before it runs.
- If you prefer not to run `collectstatic`, you can serve static files using an external CDN or object storage and set `STATICFILES_STORAGE` accordingly.

## Redeploy Checklist

1. Ensure `SECRET_KEY` is set and `DEBUG=False`.
2. If you have a frontend, ensure the Build command runs the frontend build first.
3. Confirm Build command runs `python manage.py collectstatic --noinput` after the frontend build.
4. Set `Start Command` to Gunicorn as above.
5. Deploy and monitor logs — check for `collectstatic` output and any 404s for static assets.

If you want, I can update `myportfolio/settings.py` to include an additional `STATICFILES_DIRS` entry for a specific frontend output directory — tell me the frontend build output path and I will add it.
# Deployment notes (Render / Celery / Email / Cloudinary)

This document summarises the environment variables, commands, and optional
Celery worker setup required to deploy this portfolio site to Render (or any
similar host). It also covers email, Cloudinary media, and migration steps.

## Required environment variables
- DEBUG=False
- SECRET_KEY=... (random secret)
- ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

### Database
- DATABASE_URL=postgres://user:pass@host:port/dbname

### Cloudinary (optional, for persistent media)
- CLOUDINARY_CLOUD_NAME=
- CLOUDINARY_API_KEY=
- CLOUDINARY_API_SECRET=

When these are present the app will use `cloudinary_storage` for uploaded media.

### Email (SMTP)
- EMAIL_HOST=smtp.sendgrid.net (or smtp.mailgun.org, smtp.gmail.com, ...)
- EMAIL_PORT=587
- EMAIL_HOST_USER=apikey (SendGrid) or postmaster@yourdomain (Mailgun)
- EMAIL_HOST_PASSWORD=<your-smtp-password-or-api-key>
- EMAIL_USE_TLS=True
- DEFAULT_FROM_EMAIL=no-reply@yourdomain.com
- ADMIN_EMAILS=ops@example.com (comma separated)

Optional flags:
- USE_EMAIL_THREADING=True (default) — use background threads for sending
- USE_CELERY=True — enable Celery (requires broker)

### Celery / Broker (optional, recommended for many subscribers)
- USE_CELERY=True
- CELERY_BROKER_URL=redis://<redis-host>:6379/0
- POST_NOTIFICATION_BATCH_SIZE=50

## Deploy steps (Render web service shell)
1. Set environment variables in Render Dashboard (DATABASE_URL, SMTP, Cloudinary, SECRET_KEY, etc.)
2. Deploy the service (Render will run `gunicorn` using the `Procfile` for the web process).
3. Open the Render Shell for the service and run:

```powershell
python manage.py migrate
python manage.py loaddata tools/fixtures/dump.json  # optional
python manage.py collectstatic --noinput
```

4. If using Celery, create a Worker service using the same repo and set the command:

```
celery -A myportfolio worker -l info
```

Ensure `CELERY_BROKER_URL` is configured in the worker's env.

## Testing email delivery
- Use the management command to print email settings and optionally send a test:

```powershell
python manage.py email_test
python manage.py email_test --send
```

- Or run the interactive send_mail test in the Render shell:

```powershell
python manage.py shell -c "from django.core.mail import send_mail; send_mail('Test','This is a test', 'no-reply@yourdomain.com', ['you@yourdomain.com'], fail_silently=False)"
```

## Notes & best practices
- Use provider dashboards (SendGrid/Mailgun) for deliverability, batching, and suppression lists.
- Configure SPF/DKIM for your sending domain.
- For high-volume subscribers, prefer provider API bulk sends or Celery workers with per-batch tasks.
- Keep credentials in environment variables — never commit them.

## Quick checklist
- [ ] Set env vars on Render
- [ ] Deploy web service
- [ ] Run migrations & collectstatic
- [ ] (Optional) Deploy Celery worker and ensure broker connectivity
- [ ] Test subscription flow and publish a post to verify notifications

