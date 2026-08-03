const navEl = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  navEl.classList.toggle('scrolled', window.scrollY > 8);
});

const hamburger = document.getElementById('hamburger');
const mobilePanel = document.getElementById('mobilePanel');
hamburger.addEventListener('click', () => mobilePanel.classList.toggle('open'));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const heroVideo = document.querySelector('.hero-video');
if (heroVideo && reduceMotion) heroVideo.pause();

// promo video modal
const videoModal = document.getElementById('videoModal');
const videoModalBackdrop = document.getElementById('videoModalBackdrop');
const videoModalClose = document.getElementById('videoModalClose');
const promoVideo = document.getElementById('promoVideo');

function openVideoModal(e){
  if (e) e.preventDefault();
  videoModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  promoVideo.currentTime = 0;
  promoVideo.play().catch(() => {});
}
function closeVideoModal(){
  videoModal.classList.remove('open');
  document.body.style.overflow = '';
  promoVideo.pause();
}
document.getElementById('heroVideoBtn').addEventListener('click', openVideoModal);
document.querySelectorAll('.rail .cta').forEach(link => link.addEventListener('click', openVideoModal));
videoModalBackdrop.addEventListener('click', closeVideoModal);
videoModalClose.addEventListener('click', closeVideoModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeVideoModal(); });

const quickRail = document.getElementById('quickRail');
const railClose = document.getElementById('railClose');
const railToggle = document.getElementById('railToggle');
railClose.addEventListener('click', () => {
  quickRail.classList.add('collapsed');
  railToggle.classList.add('show');
});
railToggle.addEventListener('click', () => {
  quickRail.classList.remove('collapsed');
  railToggle.classList.remove('show');
});

function railBounds(){
  const navBottom = navEl.getBoundingClientRect().bottom;
  const half = quickRail.offsetHeight / 2;
  return { min: navBottom + half + 10, max: window.innerHeight - half - 12 };
}

function setRailY(px){
  const { min, max } = railBounds();
  const clamped = Math.min(max, Math.max(min, px));
  quickRail.style.top = clamped + 'px';
  railToggle.style.top = clamped + 'px';
}

function enableVerticalDrag(handle){
  let dragging = false, startY = 0, startTop = 0, moved = false;
  const suppressClick = (e) => { e.stopPropagation(); e.preventDefault(); };

  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.rail-close')) return;
    dragging = true; moved = false;
    startY = e.clientY;
    startTop = parseFloat(getComputedStyle(quickRail).top) || window.innerHeight / 2;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > 4) moved = true;
    setRailY(startTop + dy);
  });
  handle.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    handle.releasePointerCapture(e.pointerId);
    if (moved) handle.addEventListener('click', suppressClick, { once:true, capture:true });
  });
}

enableVerticalDrag(railToggle);
enableVerticalDrag(document.querySelector('.rail-head'));

window.addEventListener('resize', () => {
  if (quickRail.style.top) setRailY(parseFloat(quickRail.style.top));
});

const cards = document.querySelectorAll('.card');
if ('IntersectionObserver' in window && !reduceMotion){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .18 });
  cards.forEach(c => io.observe(c));
} else {
  cards.forEach(c => c.classList.add('in'));
}

// ---------- desktop: one scroll gesture jumps to the next/previous full-screen section ----------
(function(){
  if (reduceMotion) return;
  const mql = window.matchMedia('(min-width:901px)');

  function getStops(){
    const stops = [0];
    ['programlar', 'duyurular', 'haberler', 'istatistikler'].forEach(id => {
      const el = document.getElementById(id);
      if (el) stops.push(el.getBoundingClientRect().top + window.scrollY);
    });
    const footerEl = document.querySelector('footer');
    if (footerEl) stops.push(footerEl.getBoundingClientRect().top + window.scrollY);
    return stops;
  }

  function currentIndex(stops){
    let idx = 0;
    stops.forEach((y, i) => { if (window.scrollY >= y - 2) idx = i; });
    return idx;
  }

  let animating = false;
  let unlockTimer = null;

  function goTo(y){
    animating = true;
    window.scrollTo({ top: y, behavior: 'smooth' });
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => { animating = false; }, 800);
  }
  window.addEventListener('scrollend', () => { animating = false; clearTimeout(unlockTimer); });

  window.addEventListener('wheel', (e) => {
    if (!mql.matches) return;
    if (animating){ e.preventDefault(); return; }
    const stops = getStops();
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const idx = currentIndex(stops);
    if (e.deltaY > 0){
      const next = stops[idx + 1];
      if (next === undefined || next > maxScroll + 1) return;
      e.preventDefault();
      goTo(Math.min(next, maxScroll));
    } else if (e.deltaY < 0){
      const prev = stops[idx - 1];
      if (prev === undefined) return;
      e.preventDefault();
      goTo(prev);
    }
  }, { passive:false });

  window.addEventListener('keydown', (e) => {
    if (!mql.matches || animating) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    const stops = getStops();
    const idx = currentIndex(stops);
    if (e.key === 'PageDown'){
      const next = stops[idx + 1];
      if (next !== undefined){ e.preventDefault(); goTo(next); }
    } else if (e.key === 'PageUp'){
      const prev = stops[idx - 1];
      if (prev !== undefined){ e.preventDefault(); goTo(prev); }
    }
  });
})();

// ---------- shared: draggable scroll strip + progress thumb ----------
function initDragScroller(track, thumb, prevBtn, nextBtn, step){
  if (!track || !thumb) return () => {};

  function updateThumb(){
    const ratio = track.clientWidth / track.scrollWidth;
    const thumbWidth = Math.max(ratio * 100, 8);
    const maxScroll = track.scrollWidth - track.clientWidth;
    const scrollRatio = maxScroll > 0 ? track.scrollLeft / maxScroll : 0;
    thumb.style.width = thumbWidth + '%';
    thumb.style.left = scrollRatio * (100 - thumbWidth) + '%';
  }

  track.addEventListener('scroll', updateThumb);
  if (prevBtn) prevBtn.addEventListener('click', () => track.scrollBy({ left: -step, behavior: 'smooth' }));
  if (nextBtn) nextBtn.addEventListener('click', () => track.scrollBy({ left: step, behavior: 'smooth' }));

  let dragging = false, startX = 0, startScroll = 0, moved = false;
  const suppressClick = (e) => { e.stopPropagation(); e.preventDefault(); };
  track.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    startX = e.clientX; startScroll = track.scrollLeft;
    track.classList.add('dragging');
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = startScroll - dx;
  });
  track.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    track.releasePointerCapture(e.pointerId);
    if (moved) track.querySelectorAll('a').forEach(a => a.addEventListener('click', suppressClick, { once:true, capture:true }));
  });

  updateThumb();
  return updateThumb;
}

// ---------- announcements: tabs + draggable scroll strip ----------
function initAnnounceScroller(panel){
  return initDragScroller(
    panel.querySelector('.announce-track'),
    panel.querySelector('.announce-scrollbar-thumb'),
    panel.querySelector('.announce-prev'),
    panel.querySelector('.announce-next'),
    300
  );
}

const announceUpdaters = new Map();
document.querySelectorAll('.announce-panel').forEach(panel => {
  announceUpdaters.set(panel.dataset.panel, initAnnounceScroller(panel));
});

document.querySelectorAll('.announce-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.announce-tab').forEach(t => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });
    document.querySelectorAll('.announce-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));
    const update = announceUpdaters.get(target);
    if (update) requestAnimationFrame(update);
  });
});

window.addEventListener('resize', () => {
  const activePanel = document.querySelector('.announce-panel.active');
  if (activePanel){
    const update = announceUpdaters.get(activePanel.dataset.panel);
    if (update) update();
  }
});

// ---------- news filter pills (visual toggle) ----------
document.querySelectorAll('.news-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.news-filter').forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ---------- mobile app tab bar ----------
const appTabbar = document.getElementById('appTabbar');
if (appTabbar){
  const appTabs = Array.from(appTabbar.querySelectorAll('.app-tab'));
  const appTabMenu = document.getElementById('appTabMenu');

  function setActiveTab(target){
    appTabs.forEach(t => t.classList.toggle('active', t.dataset.target === target));
  }

  appTabMenu.addEventListener('click', () => mobilePanel.classList.toggle('open'));

  appTabs.forEach(tab => {
    if (tab.tagName === 'A'){
      tab.addEventListener('click', () => setActiveTab(tab.dataset.target));
    }
  });

  const spySections = ['hero', 'programlar', 'duyurular', 'iletisim']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  function updateActiveByScroll(){
    const refY = window.innerHeight * 0.3;
    let current = spySections[0];
    spySections.forEach(sec => { if (sec.getBoundingClientRect().top <= refY) current = sec; });
    if (current) setActiveTab(current.id);
  }
  window.addEventListener('scroll', updateActiveByScroll, { passive: true });
  updateActiveByScroll();
}
