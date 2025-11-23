#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

# Install Python dependencies
pip install -r requirements.txt

# Collect static files (creates hashed filenames / manifest)
python manage.py collectstatic --noinput

# Apply migrations (optional; keep for deploy consistency)
python manage.py migrate --noinput || true

# End
