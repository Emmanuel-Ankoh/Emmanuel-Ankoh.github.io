from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


class Command(BaseCommand):
    help = "Send a test email to DEFAULT_CONTACT_RECIPIENT using current EMAIL_* settings"

    def add_arguments(self, parser):
        parser.add_argument('--subject', default='Test email from portfolio', help='Email subject')
        parser.add_argument('--to', default=None, help='Override recipient email')

    def handle(self, *args, **options):
        recipient = options['to'] or getattr(settings, 'DEFAULT_CONTACT_RECIPIENT', None)
        if not recipient:
            self.stderr.write('No recipient configured. Set DEFAULT_CONTACT_RECIPIENT in settings or use --to')
            return

        subject = options['subject']
        context = {
            'project_name': getattr(settings, 'PROJECT_NAME', 'Portfolio'),
            'recipient': recipient,
        }

        text = render_to_string('emails/test_email.txt', context)
        html = render_to_string('emails/test_email.html', context)

        msg = EmailMultiAlternatives(subject=subject, body=text, to=[recipient])
        msg.attach_alternative(html, 'text/html')
        try:
            msg.send()
            self.stdout.write(self.style.SUCCESS(f'Test email sent to {recipient}'))
        except Exception as e:
            self.stderr.write(self.style.ERROR('Failed to send test email: ' + str(e)))
