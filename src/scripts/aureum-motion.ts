import Lenis from 'lenis';

let lenis: Lenis | null = null;
let onFrame: (() => void) | null = null;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setupLoader() {
  const loader = document.querySelector<HTMLElement>('[data-loader]');
  if (!loader || loader.dataset.ready === '1') return;
  loader.dataset.ready = '1';
  window.setTimeout(() => {
    loader.classList.add('is-done');
    window.setTimeout(() => loader.remove(), 700);
    try {
      sessionStorage.setItem('reset-loader', '1');
    } catch {
      /* storage can be blocked */
    }
  }, 900);
}

function setupReveals(reduce: boolean) {
  const nodes = document.querySelectorAll<HTMLElement>('.au-reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-in'));
    return;
  }
  const seen = new WeakSet<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18 },
  );
  nodes.forEach((node) => observer.observe(node));
}

function setupProcess() {
  const root = document.querySelector<HTMLElement>('[data-process]');
  if (!root) return () => {};
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const desktop = window.matchMedia('(min-width: 960px)');

  return () => {
    if (!desktop.matches || steps.length === 0) {
      steps.forEach((step) => step.classList.add('is-active'));
      return;
    }
    const total = Math.max(root.offsetHeight - window.innerHeight, 1);
    const passed = Math.min(Math.max(-root.getBoundingClientRect().top, 0), total);
    const index = Math.min(steps.length - 1, Math.floor((passed / total) * steps.length));
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
  };
}

function setupRails() {
  const hero = document.querySelector<HTMLElement>('.au-hero');
  const rails = [...document.querySelectorAll<HTMLElement>('.sponsor-rail')];
  if (!hero || rails.length === 0) return () => {};

  return () => {
    const header = document.querySelector('#header');
    const limit = header?.getBoundingClientRect().bottom ?? 0;
    const show = hero.getBoundingClientRect().bottom <= limit + 8;
    rails.forEach((rail) => rail.classList.toggle('is-shown', show));
  };
}

function setupParallax(reduce: boolean) {
  const layers = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  if (reduce || layers.length === 0) {
    layers.forEach((layer) => {
      layer.style.transform = '';
    });
    return () => {};
  }
  return () => {
    layers.forEach((layer) => {
      const section = layer.closest('section');
      if (!section) return;
      const speed = Number(layer.dataset.parallax || '0');
      const rect = section.getBoundingClientRect();
      const shift = (rect.top / window.innerHeight) * speed;
      layer.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
    });
  };
}

/** Smooth scroll, scroll reveals, the pinned process, and a light parallax. */
export function mountMotion() {
  const reduce = reducedMotion();

  lenis?.destroy();
  lenis = null;
  if (!reduce) {
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      anchors: true,
      stopInertiaOnNavigate: true,
      respectReducedMotion: true,
    });
  }

  setupLoader();
  setupReveals(reduce);
  const updateProcess = setupProcess();
  const updateParallax = setupParallax(reduce);
  const updateRails = setupRails();

  if (onFrame) {
    window.removeEventListener('scroll', onFrame);
    window.removeEventListener('resize', onFrame);
  }
  onFrame = () => {
    updateProcess();
    updateParallax();
    updateRails();
  };
  window.addEventListener('scroll', onFrame, { passive: true });
  window.addEventListener('resize', onFrame);
  onFrame();
}
