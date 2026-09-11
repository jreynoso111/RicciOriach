"""Exercise real HTTP persistence, publication boundaries and conflicting edits."""
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('serve', Path(__file__).with_name('serve.py'))
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)

class ManagerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        serve.ROOT = Path(self.temp.name)
        serve.PRIVATE = serve.ROOT / '.local-cms/content.json'
        serve.PUBLIC = serve.ROOT / 'content/published.json'
        serve.atomic_write(serve.PUBLIC, {'events': [], 'posts': []})
        self.server = serve.ThreadingHTTPServer(('127.0.0.1', 0), serve.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'
    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.temp.cleanup()
    def request(self, path='/api/manage/content', data=None, origin=None):
        headers = {'Content-Type': 'application/json', 'Origin': origin or self.url}
        req = Request(self.url + path, data=None if data is None else json.dumps(data).encode(), headers=headers, method='GET' if data is None else 'PUT')
        try:
            with urlopen(req) as response: return response.status, json.load(response)
        except HTTPError as error:
            result = error.code, error.read()
            error.close()
            return result
    def event(self, state='Borrador'):
        return {'id':'test', 'title':'Prueba <script>', 'date':'2099-06-15', 'city':'Santo Domingo', 'venue':'Sala', 'status':state, 'ticketStatus':'available', 'ticketUrl':'https://example.com/tickets'}
    def test_publish_archive_conflict_and_private_files(self):
        _, initial = self.request()
        payload = {'revision': initial['revision'], 'content': {'events':[self.event()], 'posts':[]}}
        status, result = self.request(data=payload); self.assertEqual(status, 200)
        self.assertEqual(self.request('/content/published.json')[1]['events'], [])
        self.assertEqual(self.request('/.local-cms/content.json')[0], 404)
        self.assertEqual(self.request(data=payload)[0], 409)
        payload['revision'] = result['revision']; payload['content']['events'][0]['status'] = 'Publicado'
        status, result = self.request(data=payload); self.assertEqual(status, 200)
        self.assertEqual(len(self.request('/content/published.json')[1]['events']), 1)
        self.assertEqual(serve.read_content()['events'][0]['status'], 'Publicado')
        payload['revision'] = result['revision']; payload['content']['events'][0]['status'] = 'Archivado'
        self.assertEqual(self.request(data=payload)[0], 200)
        self.assertEqual(self.request('/content/published.json')[1]['events'], [])
        self.assertTrue(list((serve.PRIVATE.parent/'history').glob('*.json')))
    def test_reject_cross_origin_and_invalid_data(self):
        _, initial = self.request()
        payload = {'revision':initial['revision'],'content':{'events':[self.event()], 'posts':[]}}
        self.assertEqual(self.request(data=payload, origin='https://other.test')[0], 403)
        for field, value in [('ticketUrl','javascript:alert(1)'), ('date','2099-02-30'), ('city','')]:
            payload['content']['events'] = [self.event()]
            payload['content']['events'][0][field] = value
            self.assertEqual(self.request(data=payload)[0], 400)
        self.assertEqual(self.request('/content/published.json')[1]['events'], [])

if __name__ == '__main__': unittest.main()
