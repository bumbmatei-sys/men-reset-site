// Checklist behavior: localStorage per page + list id, a count, Clear, and a Print that prints only one list.
const PREFIX = 'reset:checklist:';

function storageKey(root: HTMLElement): string {
  return `${PREFIX}${location.pathname.replace(/\/$/, '') || '/'}#${root.dataset.checklistId || 'list'}`;
}

function read(key: string): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function write(key: string, done: number[]) {
  try {
    if (done.length) localStorage.setItem(key, JSON.stringify(done));
    else localStorage.removeItem(key);
  } catch {
    // Storage blocked. The list still works for this visit.
  }
}

function paint(root: HTMLElement) {
  const boxes = [...root.querySelectorAll<HTMLInputElement>('[data-checklist-box]')];
  const checked = boxes.filter((box) => box.checked).length;
  const count = root.querySelector<HTMLElement>('[data-checklist-count]');
  if (count) count.textContent = `${checked} of ${boxes.length} ${root.dataset.countNoun || 'done'}`;
  root.classList.toggle('is-complete', boxes.length > 0 && checked === boxes.length);
}

function printOne(root: HTMLElement) {
  const html = document.documentElement;
  document.querySelector('.checklist-print-root')?.remove();
  const holder = document.createElement('div');
  holder.className = 'checklist-print-root';
  const copy = root.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  copy.removeAttribute('data-checklist');
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  const live = root.querySelectorAll<HTMLInputElement>('[data-checklist-box]');
  copy.querySelectorAll<HTMLInputElement>('[data-checklist-box]').forEach((box, i) => {
    box.toggleAttribute('checked', Boolean(live[i]?.checked));
    box.checked = Boolean(live[i]?.checked);
  });
  holder.append(copy);
  document.body.append(holder);
  html.classList.add('print-checklist');
  let cleaned = false;
  const done = () => {
    if (cleaned) return;
    cleaned = true;
    holder.remove();
    html.classList.remove('print-checklist');
  };
  window.addEventListener('afterprint', done, { once: true });
  window.print();
  // window.print() blocks in most browsers; this covers the ones where afterprint never fires.
  setTimeout(done, 1500);
}

export function mountChecklists() {
  document.querySelectorAll<HTMLElement>('[data-checklist]').forEach((root) => {
    if (root.dataset.checklistReady) return;
    root.dataset.checklistReady = '1';
    const key = storageKey(root);
    const boxes = [...root.querySelectorAll<HTMLInputElement>('[data-checklist-box]')];
    const saved = new Set(read(key));
    boxes.forEach((box, index) => {
      box.checked = saved.has(index);
      box.addEventListener('change', () => {
        write(
          key,
          boxes.flatMap((item, i) => (item.checked ? [i] : [])),
        );
        paint(root);
      });
    });
    root.querySelector('[data-checklist-clear]')?.addEventListener('click', () => {
      boxes.forEach((box) => (box.checked = false));
      write(key, []);
      paint(root);
    });
    root.querySelector('[data-checklist-print]')?.addEventListener('click', () => printOne(root));
    paint(root);
  });
}
