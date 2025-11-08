from django.test import TestCase, Client
from django.test import TestCase, Client
from .models import SiteSettings
import json


class CoreSmokeTests(TestCase):
    def setUp(self):
        self.client = Client()
        # create minimal site settings so templates don't crash
        SiteSettings.objects.create(site_name='Test Site', full_name='Test User')

    def test_homepage_loads(self):
        """Homepage should return 200"""
        resp = self.client.get('/')
        self.assertEqual(resp.status_code, 200)

    def test_api_root(self):
        """API root should be reachable"""
        resp = self.client.get('/api/')
        self.assertTrue(200 <= resp.status_code < 400, f'API root returned {resp.status_code}')

    def test_contact_endpoint(self):
        """POST to contact endpoint should return success (200/201) and accept JSON"""
        data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'message': 'This is a test message.'
        }
        resp = self.client.post('/api/contact/', data=json.dumps(data), content_type='application/json')
        self.assertTrue(200 <= resp.status_code < 400, f'Contact endpoint returned {resp.status_code}')
