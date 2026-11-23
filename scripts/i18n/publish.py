"""German publication gate for the post-build HTML translation pipeline.

A dictionary entry for a shared navigation label is not evidence that an
article, course, or lesson has been translated. The *content* of each page
must have a complete set of dictionary entries before its URL is published.
"""
import re

from common import inner, norm, page_url, soup, translatable, walk_units

PUBLIC_LOCALES = ('de',)


def content_kind(path):
    parts = [part for part in path.strip('/').split('/') if part]
    if len(parts) == 2 and parts[0] == 'teachings':
        return 'teaching'
    if parts and parts[0] == 'tracks':
        if len(parts) == 2:
            return 'course'
        if len(parts) == 3:
            return 'lesson'
    return None


def text_units(node):
    if node is None:
        return []
    result = []
    walk_units(node, lambda el: result.append(inner(el)),
               lambda item: result.append(norm(str(item))))
    return [unit for unit in result if translatable(unit)]


def content_units(page, kind):
    if kind == 'teaching':
        body = page.select_one('.tch-prose')
        extras = page.select('.tch-article-title, .tch-takeaways li, .tch-faq summary, .tch-faq details p')
    elif kind == 'course':
        body = page.select_one('.lesson-prose.page-prose')
        extras = page.select('.page-title, .page-lead')
    else:
        body = page.select_one('.lesson-prose:not(.page-prose)')
        extras = page.select(
            '.lesson-title, .pull-quote p, .key-points li, '
            '.scripture-block blockquote, .takeaway p, '
            '.action-callout p, .action-callout li, '
            '.reflection-card p'
        )
    body_text = text_units(body)
    if not body_text:
        return []  # Never call an empty/locked content body translated.
    result = list(body_text)
    for node in extras:
        result.extend(text_units(node))
    return result


def eligible_paths(rels, dictionary, dist):
    """English pages are all built; German content pages must pass 100% coverage."""
    available = set()
    rejected = {}
    for rel in rels:
        path = page_url(rel)
        kind = content_kind(path)
        if kind is None:
            available.add(path)
            continue
        page = soup(f'{dist}/{rel}')
        units = content_units(page, kind)
        missing = [unit for unit in units if unit not in dictionary]
        if units and not missing:
            available.add(path)
        else:
            rejected[path] = len(missing) if units else -1
    return available, rejected


def prune_unavailable_content(page, allowed, current_path):
    """Remove links/cards to untranslated content, without linking to English."""
    for anchor in list(page.find_all('a', href=True)):
        href = anchor.get('href', '')
        if not href.startswith('/') or href.startswith('//'):
            continue
        path = href.split('?', 1)[0].split('#', 1)[0].rstrip('/') or '/'
        if not content_kind(path) or path in allowed:
            continue
        if anchor.find_parent(class_=['lesson-prose', 'tch-prose']):
            anchor.unwrap()  # Keep the translated sentence, but no English link.
        elif 'au-pill' in anchor.get('class', []):
            anchor['href'] = '/de/tracks'
        elif anchor.find_parent('li'):
            anchor.find_parent('li').decompose()
        elif anchor.has_attr('data-filter-item') or 'tch-feature' in anchor.get('class', []):
            anchor.decompose()
        else:
            anchor.unwrap()

    # Planned lessons are not published translations.
    for card in page.select('.planned-lesson'):
        item = card.find_parent('li')
        (item or card).decompose()

    if content_kind(current_path) == 'course':
        for section in page.select('section[aria-labelledby="lesson-list-heading"]'):
            if not section.select('a.lesson-row'):
                section.decompose()

    # Progress/completion widgets must count *only* published German lessons.
    parts = current_path.strip('/').split('/')
    for node in page.select('[data-lesson-ids]'):
        track = node.get('data-track') or (parts[1] if len(parts) > 1 and parts[0] == 'tracks' else '')
        if not track:
            continue
        ids = [p.strip() for p in node.get('data-lesson-ids', '').split(',') if p.strip()]
        kept = [p for p in ids if f'/tracks/{track}/{p}' in allowed]
        node['data-lesson-ids'] = ','.join(kept)
        count = node.select_one('[data-progress-count]')
        if count is not None:
            # Keep the translated message, but never claim unlisted lessons exist.
            count.string = f'0 von {len(kept)} als erledigt markiert'
