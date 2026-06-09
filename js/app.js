// ===== ARTICLE DATA =====
// Articles are loaded from articles/manifest.json
// Content is lazy-fetched from each article's contentFile when the modal opens
// To add a new article: create the HTML file, then add an entry to manifest.json
let ARTICLES = [];

// ===== TAG COLOR MAP =====
const TAG_COLORS = {
  'HackTheBox': 'ctag-green', 'HTB': 'ctag-green',
  'Linux': 'ctag-yellow', 'Windows': 'ctag-blue',
  'Active Directory': 'ctag-red', 'ADCS': 'ctag-red', 'AD': 'ctag-red',
  'CVE': 'ctag-red', 'Web': 'ctag-cyan',
  'CompTIA': 'ctag-blue', 'Security+': 'ctag-blue', 'CySA+': 'ctag-blue',
  'Certification': 'ctag-purple',
  'SOC': 'ctag-purple', 'Blue Team': 'ctag-blue',
  'MSSQL': 'ctag-yellow', 'Pentest': 'ctag-red', 'Offensive': 'ctag-red',
  'TruffleHog': 'ctag-purple', 'Secrets': 'ctag-red', 'Detection Engineering': 'ctag-cyan',
  'Open Source': 'ctag-green',
};

function tagClass(tag) { return TAG_COLORS[tag] || ''; }

// ===== STATE =====
const state = {
  section: 'home',
  activeTag: null,
};

// ===== HELPERS =====
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function highlight(text, q) {
  if (!q) return text;
  return text.replace(new RegExp(`(${escRx(q)})`, 'gi'), '<mark>$1</mark>');
}


// ===== DATA LOADING =====
async function loadArticles() {
  const res = await fetch('articles/manifest.json');
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  ARTICLES = await res.json();
}

async function loadArticleContent(article) {
  if (article.content) return; // already cached
  const res = await fetch(article.contentFile);
  if (!res.ok) throw new Error(`Failed to load content: ${res.status}`);
  article.content = await res.text();
}

// ===== NAVIGATION =====
function goTo(section) {
  if (state.section === section) return;
  state.section = section;
  state.activeTag = null;

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab, .mobile-nav-tab').forEach(t => t.classList.remove('active'));

  const sec = document.getElementById(`section-${section}`);
  if (sec) sec.classList.add('active');

  document.querySelectorAll(`.nav-tab[data-section="${section}"], .mobile-nav-tab[data-section="${section}"]`)
    .forEach(t => t.classList.add('active'));

  if (section !== 'home') renderSection(section);
  window.scrollTo(0, 0);
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('mobile-nav');

  btn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('.mobile-nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      goTo(tab.dataset.section);
      nav.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', e => {
    if (nav.classList.contains('open') &&
        !nav.contains(e.target) &&
        !btn.contains(e.target)) {
      nav.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

// ===== RENDER SECTION =====
function renderSection(section) {
  const grid   = document.getElementById(`${section}-articles`);
  const tagBar = document.getElementById(`${section}-tags`);
  if (!grid) return;

  const sectionArticles = ARTICLES.filter(a => a.section === section);
  const allTags = [...new Set(sectionArticles.flatMap(a => a.tags))];

  if (allTags.length) {
    tagBar.innerHTML =
      `<button class="tag-btn ${!state.activeTag ? 'active' : ''}" data-tag="all">All</button>` +
      allTags.map(t =>
        `<button class="tag-btn ${state.activeTag === t ? 'active' : ''}" data-tag="${t}">${t}</button>`
      ).join('');

    tagBar.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTag = btn.dataset.tag === 'all' ? null : btn.dataset.tag;
        renderSection(section);
      });
    });
  } else {
    tagBar.innerHTML = '';
  }

  const visible = sectionArticles.filter(a =>
    !state.activeTag || a.tags.includes(state.activeTag)
  );

  if (!sectionArticles.length) {
    grid.innerHTML = emptyState(section);
  } else if (!visible.length) {
    grid.innerHTML = noResults();
  } else {
    grid.innerHTML = visible.map(articleCard).join('');
    grid.querySelectorAll('.article-card').forEach(card => {
      card.addEventListener('click', e => {
        const tagEl = e.target.closest('.ctag');
        if (tagEl) {
          e.stopPropagation();
          state.activeTag = tagEl.dataset.tag;
          renderSection(section);
          return;
        }
        openModal(parseInt(card.dataset.id, 10));
      });
    });
  }
}

function articleCard(a) {
  const badge = a.difficulty
    ? `<span class="badge badge-${a.difficulty}">${a.difficulty.toUpperCase()}</span>` : '';
  const tags = a.tags.map(t =>
    `<span class="ctag ${tagClass(t)}" data-tag="${t}">${t}</span>`
  ).join('');

  return `
    <div class="article-card" data-id="${a.id}">
      <div class="card-top">
        <span class="card-title">${a.title}</span>
        ${badge}
      </div>
      <p class="card-excerpt">${a.excerpt}</p>
      <div class="card-tags">${tags}</div>
      <div class="card-footer">
        <span>${fmtDate(a.date)}</span>
        <span class="card-read">read →</span>
      </div>
    </div>`;
}

function emptyState(section) {
  const cfg = {
    'blue-team': { icon: '🛡', title: 'Coming Soon', desc: 'Blue Team articles from my SOC work at Fidelity Investments will be added here.', code: '// TODO: Add Blue Team articles' },
    'red-team':  { icon: '⚔', title: 'Under Construction', desc: 'Red Team learning notes on Active Directory attacks and offensive techniques coming soon.', code: '// TODO: Add Red Team articles' },
    'blog':      { icon: '📝', title: 'No Posts Yet', desc: 'Certification reviews and study notes will appear here.', code: '// TODO: Add blog posts' },
    'ctf':       { icon: '🚩', title: 'No Writeups Yet', desc: 'HackTheBox and CTF writeups will appear once boxes are retired.', code: '// TODO: Add CTF writeups' },
  };
  const c = cfg[section] || cfg.blog;
  return `<div class="empty-state">
    <div class="empty-icon">${c.icon}</div>
    <h3>${c.title}</h3>
    <p>${c.desc}</p>
    <div class="empty-code">${c.code}</div>
  </div>`;
}

function noResults() {
  return `<div class="empty-state">
    <div class="empty-icon">🔍</div>
    <h3>No results</h3>
    <p>Try a different tag filter.</p>
  </div>`;
}

// ===== MODAL =====
async function openModal(id) {
  const a = ARTICLES.find(x => x.id === id);
  if (!a) return;

  const modal = document.getElementById('article-modal');

  document.getElementById('modal-title').textContent = a.title;
  document.getElementById('modal-date').textContent = `// ${fmtDate(a.date)}`;
  document.getElementById('modal-section').textContent = `~/${a.section}`;
  document.getElementById('modal-difficulty').textContent = a.difficulty ? ` / ${a.difficulty}` : '';
  document.getElementById('modal-tags').innerHTML = a.tags
    .map(t => `<span class="ctag ${tagClass(t)}">${t}</span>`).join('');

  const body = document.getElementById('modal-body');
  body.innerHTML = '<div class="modal-loading">// loading...</div>';
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  try {
    await loadArticleContent(a);
    body.innerHTML = a.content;
  } catch {
    body.innerHTML = '<p class="modal-error">Failed to load article content.</p>';
  }
}

function closeModal() {
  document.getElementById('article-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== SEARCH =====
function initSearch() {
  const input   = document.getElementById('search-input');
  const overlay = document.getElementById('search-overlay');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    q.length > 0 ? showSearch(q) : overlay.classList.add('hidden');
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { overlay.classList.add('hidden'); input.value = ''; input.blur(); }
  });

  document.getElementById('close-search').addEventListener('click', () => {
    overlay.classList.add('hidden'); input.value = '';
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) { overlay.classList.add('hidden'); input.value = ''; }
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault(); input.focus(); input.select();
    }
  });
}

function showSearch(q) {
  const results = ARTICLES.filter(a =>
    a.title.toLowerCase().includes(q.toLowerCase()) ||
    a.excerpt.toLowerCase().includes(q.toLowerCase()) ||
    a.tags.some(t => t.toLowerCase().includes(q.toLowerCase()))
  );

  const overlay = document.getElementById('search-overlay');
  const list    = document.getElementById('search-results-list');
  document.getElementById('search-count').textContent =
    `${results.length} result${results.length !== 1 ? 's' : ''} for "${q}"`;

  if (!results.length) {
    list.innerHTML = `<div class="no-results">No articles found for "<strong>${q}</strong>"</div>`;
  } else {
    list.innerHTML = results.map(a => `
      <div class="sr-item" data-id="${a.id}" data-section="${a.section}">
        <div class="sr-title">${highlight(a.title, q)}</div>
        <div class="sr-meta">
          <span>~/${a.section}</span>
          <span>${fmtDate(a.date)}</span>
        </div>
        <div class="sr-tags">
          ${a.tags.slice(0, 5).map(t => `<span class="ctag ${tagClass(t)}">${t}</span>`).join('')}
        </div>
      </div>`).join('');

    list.querySelectorAll('.sr-item').forEach(item => {
      item.addEventListener('click', () => {
        overlay.classList.add('hidden');
        document.getElementById('search-input').value = '';
        goTo(item.dataset.section);
        setTimeout(() => openModal(parseInt(item.dataset.id, 10)), 120);
      });
    });
  }

  overlay.classList.remove('hidden');
}

// ===== CANVAS ANIMATION (starry night) =====
function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let stars = [], shootingStars = [];
  let lastShoot = 0;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    buildStars();
  }

  // --- Twinkling stars ---
  class Star {
    constructor() { this.reset(true); }
    reset(init) {
      this.x          = Math.random() * canvas.width;
      this.y          = init ? Math.random() * canvas.height : Math.random() * canvas.height;
      this.r          = Math.random() * 1.5 + 0.4;
      this.bright     = this.r > 1.4;           // large stars get a cross flare
      this.alpha      = Math.random() * 0.5 + 0.2;
      this.twinkleSpd = Math.random() * 0.012 + 0.003;
      this.twinkleDir = Math.random() > 0.5 ? 1 : -1;
      this.peakAlpha  = Math.random() * 0.4 + 0.6; // max brightness 0.6–1.0
      this.baseAlpha  = Math.random() * 0.1 + 0.08; // min brightness
    }
    step() {
      this.alpha += this.twinkleSpd * this.twinkleDir;
      if (this.alpha >= this.peakAlpha) { this.alpha = this.peakAlpha; this.twinkleDir = -1; }
      if (this.alpha <= this.baseAlpha) { this.alpha = this.baseAlpha; this.twinkleDir =  1; }
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;

      // Soft glow halo
      ctx.shadowColor = 'rgba(200,220,255,0.9)';
      ctx.shadowBlur  = this.r * 7;
      ctx.fillStyle   = 'rgba(255,255,245,1)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();

      // Cross flare on brighter stars
      if (this.bright && this.alpha > 0.55) {
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = this.alpha * 0.35;
        ctx.strokeStyle = 'rgba(200,220,255,1)';
        ctx.lineWidth   = 0.6;
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + Math.cos(a) * this.r * 7, this.y + Math.sin(a) * this.r * 7);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  // --- Shooting stars ---
  class ShootingStar {
    constructor() { this.reset(); }
    reset() {
      const angle = (Math.random() * 25 + 20) * Math.PI / 180;
      const speed = Math.random() * 5 + 4;
      this.x      = Math.random() * canvas.width;
      this.y      = Math.random() * canvas.height * 0.5;
      this.vx     = Math.cos(angle) * speed;
      this.vy     = Math.sin(angle) * speed;
      this.r      = Math.random() * 1.2 + 0.8;
      this.trail  = [];
      this.maxLen = Math.floor(Math.random() * 35 + 40);
      this.active = true;
    }
    step() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxLen) this.trail.shift();
      this.x += this.vx;
      this.y += this.vy;
      if (this.x > canvas.width + 60 || this.y > canvas.height + 60) this.active = false;
    }
    draw() {
      if (this.trail.length < 2) return;
      ctx.save();
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = `rgba(200,220,255,${t * 0.8})`;
        ctx.lineWidth   = this.r * t;
        ctx.shadowColor = 'rgba(180,210,255,0.8)';
        ctx.shadowBlur  = 6;
        ctx.stroke();
      }
      // Head
      ctx.shadowBlur  = 12;
      ctx.shadowColor = 'rgba(200,230,255,1)';
      ctx.fillStyle   = 'rgba(255,255,255,1)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function buildStars() {
    const n = Math.min(Math.floor(canvas.width * canvas.height / 5500), 220);
    stars = Array.from({ length: n }, () => new Star());
    shootingStars = [];
  }

  function tick(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Shoot every 0.6–1.6s, 1–2 at a time
    if (ts - lastShoot > 600 + Math.random() * 1000) {
      shootingStars.push(new ShootingStar());
      if (Math.random() > 0.5) shootingStars.push(new ShootingStar());
      lastShoot = ts;
    }

    stars.forEach(s => { s.step(); s.draw(); });
    shootingStars = shootingStars.filter(s => s.active);
    shootingStars.forEach(s => { s.step(); s.draw(); });

    requestAnimationFrame(tick);
  }

  resize();
  requestAnimationFrame(tick);
  window.addEventListener('resize', resize);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  initCanvas();
  initSearch();
  initMobileMenu();

  // nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab =>
    tab.addEventListener('click', () => goTo(tab.dataset.section))
  );

  // logo
  document.getElementById('logo-home').addEventListener('click', () => goTo('home'));

  // hero cards
  document.querySelectorAll('.hero-card[data-nav]').forEach(card =>
    card.addEventListener('click', () => goTo(card.dataset.nav))
  );

  // modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // load articles then render whichever section is active
  try {
    await loadArticles();
    if (state.section !== 'home') renderSection(state.section);
  } catch (err) {
    console.error('Could not load articles manifest:', err);
  }
});
