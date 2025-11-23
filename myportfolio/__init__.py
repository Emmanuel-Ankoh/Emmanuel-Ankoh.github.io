# Optionally import Celery app when Celery is enabled. This import is
# safe-guarded so missing Celery doesn't break management commands.
try:
	from . import celery  # noqa: F401
except Exception:
	pass

