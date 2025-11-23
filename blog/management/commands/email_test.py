from django.core.management.base import BaseCommand
from django.conf import settings
from blog.utils import async_send_mail


class Command(BaseCommand):
    help = 'Print email settings and optionally send a test email. Use --send to actually send.'

    def add_arguments(self, parser):
        parser.add_argument('--send', action='store_true', help='Send a test email to TEST_EMAIL env or ADMINS')

    def handle(self, *args, **options):
        self.stdout.write(f"EMAIL_BACKEND={settings.EMAIL_BACKEND}")
        self.stdout.write(f"EMAIL_HOST={settings.EMAIL_HOST}")
        self.stdout.write(f"EMAIL_PORT={settings.EMAIL_PORT}")
        self.stdout.write(f"EMAIL_HOST_USER={settings.EMAIL_HOST_USER}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL={settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(f"ADMINS={settings.ADMINS}")
        self.stdout.write(f"USE_EMAIL_THREADING={getattr(settings,'USE_EMAIL_THREADING',False)}")

        if options['send']:
            recipients = []
            if settings.ADMINS:
                recipients = [a[1] for a in settings.ADMINS]
            else:
                import os
                test_email = os.environ.get('TEST_EMAIL')
                if test_email:
                    recipients = [test_email]
            if not recipients:
                self.stderr.write('No recipients configured (ADMINS or TEST_EMAIL). Aborting send.')
                return
            subject = 'Test email from portfolio'
            body = 'This is a test email sent by the management command.'
            ok = async_send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=False)
            if ok:
                self.stdout.write(self.style.SUCCESS('Test email dispatched (may be sent asynchronously).'))
            else:
                self.stderr.write(self.style.ERROR('Failed to send test email synchronously.'))
