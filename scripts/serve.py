"""Riccie's dedicated local editor. Run: python3 scripts/serve.py."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import base64
import binascii
from pathlib import Path
import re
from urllib.parse import urlsplit
import argparse
import json
import os
import threading
import uuid
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
PRIVATE = ROOT / '.local-cms' / 'content.json'
PUBLIC = ROOT / 'content' / 'published.json'
LOCK = threading.Lock()
LIMIT = 2_000_000
IMAGE_DATA_LIMIT = 900_000
IMAGE_DATA_PATTERN = re.compile(
    r'^data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$', re.IGNORECASE
)


def validate(data):
    if not isinstance(data, dict) or set(data) != {'events', 'posts'}:
        raise ValueError('Formato de contenido inválido.')
    for kind, items in data.items():
        if not isinstance(items, list) or len(items) > 1000:
            raise ValueError('La colección no es válida.')
        ids, slugs = set(), set()
        for item in items:
            if not isinstance(item, dict):
                raise ValueError('Registro inválido.')
            if any(
                not isinstance(value, str)
                or len(value)
                > (1_250_000 if key == 'image' and value.startswith('data:image/') else 50000)
                for key, value in item.items()
            ):
                raise ValueError('Los campos deben ser texto y tener un tamaño válido.')
            if not item.get('id') or item['id'] in ids:
                raise ValueError('Identificador inválido o duplicado.')
            ids.add(item['id'])
            if not item.get('title', '').strip() or len(item['title']) > 180:
                raise ValueError('Escribe un título de hasta 180 caracteres.')
            if item.get('status') not in ('Borrador', 'Publicado', 'Archivado'):
                raise ValueError('Estado inválido.')
            try:
                if date.fromisoformat(item.get('date', '')).isoformat() != item['date']:
                    raise ValueError()
            except ValueError:
                raise ValueError('Selecciona una fecha válida.')
            for field in ('ticketUrl', 'link', 'image'):
                value = item.get(field, '')
                if not value:
                    continue
                if field == 'image' and value.lower().startswith('data:image/'):
                    if not IMAGE_DATA_PATTERN.fullmatch(value):
                        raise ValueError('La foto subida no tiene un formato válido.')
                    try:
                        image_bytes = base64.b64decode(value.split(',', 1)[1], validate=True)
                    except (ValueError, binascii.Error):
                        raise ValueError('La foto subida no tiene un formato válido.')
                    if len(image_bytes) > IMAGE_DATA_LIMIT:
                        raise ValueError('La foto subida supera el tamaño permitido.')
                    continue
                if urlsplit(value).scheme != 'https' or not urlsplit(value).netloc:
                    raise ValueError('Los enlaces y las imágenes deben usar una dirección HTTPS completa.')
            if kind == 'events':
                if not item.get('city', '').strip() or not item.get('venue', '').strip():
                    raise ValueError('Completa la ciudad y el lugar.')
                if len(item.get('ticketProvider', '')) > 80 or len(item.get('ticketAvailability', '')) > 160:
                    raise ValueError('La plataforma admite 80 caracteres y la disponibilidad, 160.')
                if item.get('ticketStatus') not in ('available', 'coming_soon', 'soldout', 'free', 'cancelled', 'postponed'):
                    raise ValueError('Estado de entradas inválido.')
                if item.get('status') == 'Publicado' and item.get('ticketStatus') in ('available', 'soldout') and not item.get('ticketUrl'):
                    raise ValueError('Añade el enlace externo para publicar boletas disponibles o agotadas.')
            else:
                slug = item.get('slug', '')
                if not slug or slug in slugs or slug in ('pa-que-bailemos', 'maquine', 'mi-derriengue'):
                    raise ValueError('El enlace de la historia debe ser único y distinto de los artículos existentes.')
                slugs.add(slug)
                if item['status'] == 'Publicado' and not item.get('content', '').strip():
                    raise ValueError('Escribe el texto de la historia antes de publicarla.')
    return data


def read_content():
    path = PRIVATE if PRIVATE.exists() else PUBLIC
    return json.loads(path.read_text())


def revision():
    import hashlib
    return hashlib.sha256(json.dumps(read_content(), sort_keys=True).encode()).hexdigest()


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    os.replace(temporary, path)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def json_response(self, code, data):
        payload = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    def local_request(self, write=False):
        expected = f'127.0.0.1:{self.server.server_port}'
        return (self.headers.get('Host') == expected and
                (not write or self.headers.get('Origin') == f'http://{expected}') and
                self.headers.get('Sec-Fetch-Site') not in ('cross-site',))

    def do_GET(self):
        if not self.local_request():
            return self.json_response(403, {'error': 'Abre el gestor desde 127.0.0.1.'})
        path = urlsplit(self.path).path
        if path == '/api/payments':
            return self.json_response(200, {'enabled': False, 'provider': 'paypal', 'currencies': ['USD', 'EUR']})
        if path == '/api/manage/content':
            with LOCK:
                return self.json_response(200, {'content': read_content(), 'revision': revision(), 'mode': 'local'})
        # Never serve source control, credentials, local drafts, or directory listings.
        resolved = Path(self.translate_path(self.path)).resolve()
        try:
            parts = resolved.relative_to(ROOT.resolve()).parts
        except ValueError:
            return self.send_error(404)
        if any(part.startswith('.') for part in parts) or (resolved.is_dir() and not (resolved / 'index.html').exists()):
            return self.send_error(404)
        return super().do_HEAD() if self.command == "HEAD" else super().do_GET()

    def do_HEAD(self):
        # Apply the same private-path and host checks as GET.
        return self.do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "frame-ancestors 'none'" if self.path.startswith('/admin') else "frame-ancestors 'self'")
        super().end_headers()

    def do_PUT(self):
        if urlsplit(self.path).path != '/api/manage/content':
            return self.json_response(404, {'error': 'Ruta no disponible.'})
        if not self.local_request(write=True) or self.headers.get('Content-Type') != 'application/json':
            return self.json_response(403, {'error': 'Solicitud no autorizada.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= LIMIT:
                return self.json_response(413, {'error': 'El contenido supera el límite permitido.'})
            payload = json.loads(self.rfile.read(length))
            content = validate(payload['content'])
            with LOCK:
                if payload.get('revision') != revision():
                    return self.json_response(409, {'error': 'Hay cambios guardados desde otra ventana. Recarga antes de continuar.'})
                # Keep a recoverable copy of the previous content.
                if PRIVATE.exists():
                    backup = PRIVATE.parent / 'history' / f'{uuid.uuid4()}.json'
                    atomic_write(backup, read_content())
                atomic_write(PRIVATE, content)
                atomic_write(PUBLIC, {kind: [item for item in items if item['status'] == 'Publicado'] for kind, items in content.items()})
                return self.json_response(200, {'content': content, 'revision': revision(), 'mode': 'local'})
        except (ValueError, KeyError, TypeError) as error:
            return self.json_response(400, {'error': str(error)})
        except OSError:
            return self.json_response(500, {'error': 'No se pudo guardar en disco. Conserva el formulario y vuelve a intentarlo.'})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4180)
    args = parser.parse_args()
    print(f'Riccie Oriach: http://127.0.0.1:{args.port}/ — Gestión: /admin/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
