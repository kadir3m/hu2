const navEl = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  navEl.classList.toggle('scrolled', window.scrollY > 8);
});

const hamburger = document.getElementById('hamburger');
const mobilePanel = document.getElementById('mobilePanel');
const mobilePanelBackdrop = document.getElementById('mobilePanelBackdrop');
const mobilePanelClose = document.getElementById('mobilePanelClose');

function setMobilePanelOpen(open){
  mobilePanel.classList.toggle('open', open);
  mobilePanelBackdrop.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

hamburger.addEventListener('click', () => setMobilePanelOpen(!mobilePanel.classList.contains('open')));
mobilePanelClose.addEventListener('click', () => setMobilePanelOpen(false));
mobilePanelBackdrop.addEventListener('click', () => setMobilePanelOpen(false));
mobilePanel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMobilePanelOpen(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMobilePanelOpen(false); });

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
const railHandle = document.getElementById('railHandle');

function railBounds(){
  const navBottom = navEl.getBoundingClientRect().bottom;
  const half = quickRail.offsetHeight / 2;
  return { min: navBottom + half + 10, max: window.innerHeight - half - 12 };
}

function setRailY(px){
  const { min, max } = railBounds();
  const clamped = Math.min(max, Math.max(min, px));
  quickRail.style.top = clamped + 'px';
}

function enableVerticalDrag(handle){
  let dragging = false, startY = 0, startTop = 0, moved = false;
  const suppressClick = (e) => { e.stopPropagation(); e.preventDefault(); };

  handle.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    startY = e.clientY;
    startTop = parseFloat(getComputedStyle(quickRail).top) || window.innerHeight / 2;
    quickRail.classList.add('dragging');
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
    quickRail.classList.remove('dragging');
    handle.releasePointerCapture(e.pointerId);
    if (moved) {
      handle.addEventListener('click', suppressClick, { once:true, capture:true });
    } else {
      const open = quickRail.classList.toggle('open');
      handle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });
}

enableVerticalDrag(railHandle);

window.addEventListener('resize', () => {
  if (quickRail.style.top) setRailY(parseFloat(quickRail.style.top));
});

// ---------- desktop only: one scroll gesture jumps to the next/previous full-screen section (mobile keeps free scroll) ----------
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

  function jump(direction){
    if (animating) return;
    const stops = getStops();
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const idx = currentIndex(stops);
    if (direction > 0){
      const next = stops[idx + 1];
      if (next === undefined || next > maxScroll + 1) return;
      goTo(Math.min(next, maxScroll));
    } else {
      const prev = stops[idx - 1];
      if (prev === undefined) return;
      goTo(prev);
    }
  }

  window.addEventListener('wheel', (e) => {
    if (!mql.matches) return;
    if (animating){ e.preventDefault(); return; }
    if (e.deltaY > 0){ e.preventDefault(); jump(1); }
    else if (e.deltaY < 0){ e.preventDefault(); jump(-1); }
  }, { passive:false });

  window.addEventListener('keydown', (e) => {
    if (!mql.matches || animating) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if (e.key === 'PageDown'){ e.preventDefault(); jump(1); }
    else if (e.key === 'PageUp'){ e.preventDefault(); jump(-1); }
  });
})();

// ---------- announcements: tab switching ----------
document.querySelectorAll('.announce-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.announce-tab').forEach(t => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });
    document.querySelectorAll('.announce-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));
  });
});

// ---------- news filter pills (visual toggle) ----------
document.querySelectorAll('.news-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.news-filter').forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ---------- stats: count-up animation when the section is scrolled into view ----------
(function(){
  const statCards = document.querySelectorAll('#istatistikler .stat-card');
  if (!statCards.length) return;

  statCards.forEach((card, i) => { card.style.transitionDelay = (i * 0.08) + 's'; });

  function formatNumber(n){ return Math.round(n).toLocaleString('tr-TR'); }

  function animateCount(el, target){
    const duration = 1400;
    const start = performance.now();
    function tick(now){
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatNumber(eased * target);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function reveal(card){
    card.classList.add('in');
    const numEl = card.querySelector('.stat-number');
    const target = parseInt(numEl.dataset.target, 10);
    if (reduceMotion || isNaN(target)) {
      if (!isNaN(target)) numEl.textContent = formatNumber(target);
    } else {
      numEl.textContent = '0';
      animateCount(numEl, target);
    }
  }

  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){ reveal(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: .35 });
    statCards.forEach(c => io.observe(c));
  } else {
    statCards.forEach(reveal);
  }
})();

// ---------- scroll-to-top button ----------
(function(){
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (!scrollTopBtn) return;

  function toggleVisible(){
    scrollTopBtn.classList.toggle('visible', window.scrollY > window.innerHeight * 0.6);
  }
  window.addEventListener('scroll', toggleVisible, { passive:true });
  toggleVisible();

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top:0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();

// ---------- mobile app tab bar ----------
const appTabbar = document.getElementById('appTabbar');
if (appTabbar){
  const appTabs = Array.from(appTabbar.querySelectorAll('.app-tab'));

  function setActiveTab(target){
    appTabs.forEach(t => t.classList.toggle('active', t.dataset.target === target));
  }

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
