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

