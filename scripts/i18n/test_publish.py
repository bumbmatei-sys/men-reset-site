"""Run with: python3 -m unittest discover -s scripts/i18n -p 'test_*.py'."""
import os
import tempfile
import unittest

from bs4 import BeautifulSoup
from publish import content_kind, eligible_paths, prune_unavailable_content


class GermanPublicationTests(unittest.TestCase):
    def test_content_routes_are_classified(self):
        self.assertEqual(content_kind('/teachings/faith'), 'teaching')
        self.assertEqual(content_kind('/tracks/know-gods-love'), 'course')
        self.assertEqual(content_kind('/tracks/know-gods-love/lesson-one'), 'lesson')
        self.assertIsNone(content_kind('/teachings'))
        self.assertIsNone(content_kind('/tracks'))

    def test_complete_content_is_required(self):
        with tempfile.TemporaryDirectory() as temp:
            os.makedirs(os.path.join(temp, 'tracks', 'love'), exist_ok=True)
            with open(os.path.join(temp, 'index.html'), 'w') as out:
                out.write('<html><body>Welcome</body></html>')
            with open(os.path.join(temp, 'tracks', 'love', 'one.html'), 'w') as out:
                out.write('<html><body><h1 class="lesson-title">Title</h1>'
                          '<div class="lesson-prose"><p>Translated paragraph.</p></div>'
                          '<div class="reflection-card"><p>Question?</p></div>'
                          '</body></html>')
            rels = ['index.html', 'tracks/love/one.html']
            allowed, rejected = eligible_paths(rels, {'Title': 'Titel',
                'Translated paragraph.': 'Übersetzter Absatz.', 'Question?': 'Frage?'}, temp)
            self.assertIn('/', allowed)
            self.assertIn('/tracks/love/one', allowed)
            self.assertEqual(rejected, {})

            allowed, rejected = eligible_paths(rels, {'Title': 'Titel',
                'Translated paragraph.': 'Übersetzter Absatz.'}, temp)
            self.assertNotIn('/tracks/love/one', allowed)
            self.assertEqual(rejected['/tracks/love/one'], 1)

    def test_untranslated_cards_and_navigation_are_removed(self):
        page = BeautifulSoup(
            '<html><body><ul><li><a class="lesson-row" '
            'href="/tracks/love/two">Two</a></li>'
            '<li><a href="/tracks/love/one">One</a></li></ul>'
            '<div class="lesson-prose"><p>Read <a '
            'href="/teachings/untranslated">this</a> first.</p></div>'
            '<div data-lesson-ids="one,two" data-track="love">'
            '<span data-progress-count>0 of 2 marked done</span></div>'
            '</body></html>', 'html.parser')
        allowed = {'/tracks/love/one'}
        prune_unavailable_content(page, allowed, '/tracks/love')
        self.assertIsNone(page.find('a', href='/tracks/love/two'))
        self.assertIsNotNone(page.find('a', href='/tracks/love/one'))
        self.assertIsNone(page.find('a', href='/teachings/untranslated'))
        self.assertIn('Read this first.', page.get_text(' ', strip=True))
        self.assertEqual(page.find(attrs={'data-lesson-ids': True})['data-lesson-ids'], 'one')


if __name__ == '__main__':
    unittest.main()
