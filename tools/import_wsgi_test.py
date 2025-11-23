import importlib, traceback

try:
    importlib.import_module('myportfolio.wsgi')
    print('Import OK')
except Exception:
    traceback.print_exc()
