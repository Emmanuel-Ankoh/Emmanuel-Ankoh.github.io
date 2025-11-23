web: gunicorn myportfolio.wsgi:application --bind 0.0.0.0:$PORT --log-file -
worker: celery -A myportfolio worker -l info
