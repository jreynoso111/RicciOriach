"""Check the public site's local links, anchors, semantics and media references."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re

ROOT = Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'music.html', 'events.html', 'contact.html', 'blog.html', 'blog-post.html']


class Page(HTMLParser):
    def __init__(self, name):
        super().__init__()
        self.name, self.ids, self.links, self.headings = name, set(), [], 0

    def handle_starttag(self, tag, attributes):
        data = dict(attributes)
        if tag == 'h1':
            self.headings += 1
        if 'id' in data:
            assert data['id'] not in self.ids, (self.name, 'duplicate id', data['id'])
            self.ids.add(data['id'])
        if tag == 'img':
            assert 'alt' in data, (self.name, 'missing image alt')
        if tag == 'iframe':
            assert data.get('title'), (self.name, 'missing iframe title')
        for key in ('href', 'src'):
            if key in data:
                value = data[key]
                url = urlsplit(value)
                assert url.scheme not in ('javascript', 'vbscript'), (self.name, 'unsafe link')
                if not url.scheme and not url.netloc:
                    assert value != '#', (self.name, 'placeholder link')
                    self.links.append(url)


pages = {}
for name in PAGES:
    page = Page(name)
    page.feed((ROOT / name).read_text())
    assert page.headings == 1, (name, 'expected one h1')
    pages[name] = page

for name, page in pages.items():
    for link in page.links:
        target = unquote(link.path) if link.path else name
        assert (ROOT / target).is_file(), (name, 'missing local file', target)
        if link.fragment and target in pages:
            assert link.fragment in pages[target].ids, (name, 'missing anchor', link.fragment)
    print(f'{name}: local files, anchors and headings OK')

script = (ROOT / 'assets/site.js').read_text()
for asset in re.findall(r"['\"](assets/images/[^'\"]+)['\"]", script):
    assert (ROOT / asset).is_file(), ('script asset missing', asset)
print('Shared JavaScript media references OK')
