// AquaSentinel front-end logic
// Modern, single-source JS for navigation, demo auth, dashboard/profile data, and animations.

// ---- Global state ----
let csvData = [];
let currentModal = null;
const tableState = {
  sortKey: null,
  sortDir: 'asc',
  filter: 'all', // all | high | medium | low
};

// GitHub repository URLs (data + visualizations)
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/zyronvon/Microplastics_results/main/final_results/';
const DATA_URLS = {
  csv: `${GITHUB_BASE_URL}predictions.csv`,
  confidenceHistogram: `${GITHUB_BASE_URL}confidence_histogram.png`,
  misclassifiedSamples: `${GITHUB_BASE_URL}misclassified_samples.png`,
  samplePredictions: `${GITHUB_BASE_URL}sample_predictions.png`,
};

// ---- Navigation ----
function goToDashboard() {
  window.location.href = 'dashboard.html';
}

function toggleMobileMenu() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;
  navLinks.classList.toggle('active');
}

function setupNavigation() {
  const navLinksContainer = document.getElementById('navLinks');
  const navLinkEls = document.querySelectorAll('.nav-links a');
  const navContainer = document.querySelector('.nav-container');
  const menuBtn = document.querySelector('.mobile-menu-btn');

  // Close menu when a link is clicked
  navLinkEls.forEach((link) => {
    link.addEventListener('click', () => {
      if (navLinksContainer) navLinksContainer.classList.remove('active');
    });
  });

  // Close menu when clicking outside nav
  document.addEventListener('click', (e) => {
    if (!navContainer || !navLinksContainer || !menuBtn) return;
    const isClickInsideNav = navContainer.contains(e.target);
    const isClickOnMenuBtn = menuBtn.contains(e.target);
    if (!isClickInsideNav && !isClickOnMenuBtn) {
      navLinksContainer.classList.remove('active');
    }
  });

  // Reset mobile nav on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navLinksContainer) {
      navLinksContainer.classList.remove('active');
    }
  });
}

// ---- Demo sign-in (client side only) ----
function showSignInModal() {
  const modal = document.getElementById('signInModal');
  if (!modal) return;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function hideSignInModal() {
  const modal = document.getElementById('signInModal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function handleSignIn(event) {
  if (event) event.preventDefault();

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert('Please enter demo credentials (e.g. admin / password).');
    return;
  }

  const user = {
    username,
    loginTime: new Date().toISOString(),
  };

  try {
    localStorage.setItem('aquasentinel_user', JSON.stringify(user));
  } catch (err) {
    console.warn('Unable to persist demo user in localStorage:', err);
  }

  logActivity('auth', `Signed in as ${username}`);

  hideSignInModal();
  window.location.href = 'dashboard.html';
}

function signOut() {
  try {
    localStorage.removeItem('aquasentinel_user');
  } catch (err) {
    console.warn('Unable to clear demo user from localStorage:', err);
  }
  logActivity('auth', 'Signed out');
  alert('You have been signed out successfully!');
  window.location.href = 'index.html';
}

function createNavUserBadge() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('aquasentinel_user') || 'null');
  } catch (err) {
    console.warn('Failed to read demo user from localStorage:', err);
  }

  // Toggle static "Sign Out" visibility based on user state
  const signOutLink = navLinks.querySelector('a[onclick*="signOut"]');
  if (signOutLink && signOutLink.parentElement) {
    if (user && user.username) {
      signOutLink.parentElement.style.display = '';
    } else {
      signOutLink.parentElement.style.display = 'none';
    }
  }

  // Remove any existing badge
  const existingBadge = navLinks.querySelector('.nav-user-item');
  if (existingBadge) existingBadge.remove();

  const li = document.createElement('li');
  li.className = 'nav-user-item';

  if (user && user.username) {
    const wrapper = document.createElement('button');
    wrapper.type = 'button';
    wrapper.className = 'nav-user';
    wrapper.style.background = 'transparent';
    wrapper.style.border = 'none';
    wrapper.style.cursor = 'pointer';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = user.username.slice(0, 2).toUpperCase();

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = user.username;

    wrapper.appendChild(avatar);
    wrapper.appendChild(name);
    wrapper.addEventListener('click', () => {
      window.location.href = 'profile.html';
    });

    li.appendChild(wrapper);
  } else {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'btn-secondary';
    a.textContent = 'Sign In';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showSignInModal();
    });
    li.appendChild(a);
  }

  navLinks.appendChild(li);
}

// ---- Activity logging ----
function logActivity(type, description) {
  try {
    const nowIso = new Date().toISOString();
    const raw = localStorage.getItem('aquasentinel_activity') || '[]';
    let events = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) events = parsed;
    } catch {
      events = [];
    }
    events.unshift({ type, description, at: nowIso });
    if (events.length > 50) {
      events = events.slice(0, 50);
    }
    localStorage.setItem('aquasentinel_activity', JSON.stringify(events));
  } catch (err) {
    console.warn('logActivity error:', err);
  }
}

function formatActivityTime(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderActivityTimeline() {
  const listEl = document.getElementById('activityTimeline');
  const emptyEl = document.getElementById('activityEmpty');
  if (!listEl) return;

  let events = [];
  try {
    const raw = localStorage.getItem('aquasentinel_activity') || '[]';
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) events = parsed;
  } catch {
    events = [];
  }

  listEl.innerHTML = '';
  if (!events.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  events.forEach((ev) => {
    const li = document.createElement('li');
    li.className = 'timeline-item';

    const dot = document.createElement('div');
    dot.className = 'timeline-dot';

    const title = document.createElement('div');
    title.className = 'timeline-title';
    title.textContent = ev.description || ev.type || 'Event';

    const meta = document.createElement('div');
    meta.className = 'timeline-meta';
    meta.textContent = formatActivityTime(ev.at);

    li.appendChild(dot);
    li.appendChild(title);
    li.appendChild(meta);
    listEl.appendChild(li);
  });
}

// ---- Modal (image zoom, etc.) ----
function openModal(img) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  if (!modal || !modalImg || !img) return;

  modal.style.display = 'block';
  modalImg.src = img.src;
  modalImg.alt = img.alt || 'Image';
  document.body.style.overflow = 'hidden';
  currentModal = modal;
}

function closeModal() {
  const modal = document.getElementById('imageModal');
  if (!modal) return;

  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  currentModal = null;
}

function setupModalHandlers() {
  // Close when clicking outside the content
  document.addEventListener('click', (e) => {
    if (currentModal && e.target === currentModal) {
      closeModal();
    }
  });

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentModal) {
      closeModal();
    }
  });
}

// ---- Data fetching & CSV parsing ----
async function fetchData(url, type = 'text') {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Network error (${response.status}) while fetching ${url}`);
  }
  return type === 'blob' ? response.blob() : response.text();
}

function parseCSV(csvText) {
  if (!csvText) return [];

  const rows = [];
  const lines = csvText.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (!lines.length) return rows;

  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^"|"$/g, ''));

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j += 1) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);

    const obj = {};
    for (let k = 0; k < headers.length; k += 1) {
      const key = headers[k] || `col${k}`;
      obj[key] = (cells[k] || '').trim().replace(/^"|"$/g, '');
    }
    rows.push(obj);
  }

  return rows;
}

function renderTable(data, containerId, tableId) {
  const container = document.getElementById(containerId);
  const thead = document.getElementById(`${tableId}Head`);
  const tbody = document.getElementById(`${tableId}Body`);
  if (!data.length || !container || !thead || !tbody) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  const headers = Object.keys(data[0]);
  const headerRow = document.createElement('tr');
  headers.forEach((h) => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const displayData = data.slice(0, 200);
  displayData.forEach((row) => {
    const tr = document.createElement('tr');
    headers.forEach((h) => {
      const td = document.createElement('td');
      td.textContent = row[h] != null ? row[h] : '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  container.style.display = 'block';
}

function getConfidenceKeyFromRow(row) {
  if (!row) return null;
  const keys = Object.keys(row);
  return keys.find((k) => /confidence|probability|score/i.test(k)) || null;
}

function normalizeConfidenceValue(raw) {
  if (raw == null || raw === '') return null;
  const val = parseFloat(String(raw).replace('%', '').trim());
  if (Number.isNaN(val)) return null;
  return val > 1 ? val / 100 : val;
}

function getFilteredSortedRows() {
  if (!csvData.length) return [];
  const rows = [...csvData];
  const confidenceKey = getConfidenceKeyFromRow(rows[0]);

  let filtered = rows;
  if (tableState.filter !== 'all' && confidenceKey) {
    filtered = rows.filter((row) => {
      const conf = normalizeConfidenceValue(row[confidenceKey]);
      if (conf == null) return false;
      if (tableState.filter === 'high') return conf >= 0.8;
      if (tableState.filter === 'medium') return conf >= 0.5 && conf < 0.8;
      if (tableState.filter === 'low') return conf < 0.5;
      return true;
    });
  }

  if (tableState.sortKey) {
    const key = tableState.sortKey;
    const dir = tableState.sortDir === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const an = parseFloat(av);
      const bn = parseFloat(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return (an - bn) * dir;
      }
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      if (as < bs) return -1 * dir;
      if (as > bs) return 1 * dir;
      return 0;
    });
  }

  return filtered;
}

function renderPredictionTable() {
  const container = document.getElementById('csvTableContainer');
  const thead = document.getElementById('csvTableHead');
  const tbody = document.getElementById('csvTableBody');
  if (!container || !thead || !tbody || !csvData.length) return;

  const rows = getFilteredSortedRows();
  const headers = Object.keys(csvData[0]);

  thead.innerHTML = '';
  tbody.innerHTML = '';

  const headerRow = document.createElement('tr');
  headers.forEach((h) => {
    const th = document.createElement('th');
    th.dataset.key = h;
    th.style.cursor = 'pointer';
    let label = h;
    if (tableState.sortKey === h) {
      label += tableState.sortDir === 'asc' ? ' ▲' : ' ▼';
    }
    th.textContent = label;
    th.addEventListener('click', () => {
      if (tableState.sortKey === h) {
        tableState.sortDir = tableState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        tableState.sortKey = h;
        tableState.sortDir = 'asc';
      }
      renderPredictionTable();
    });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const maxRows = 200;
  rows.slice(0, maxRows).forEach((row) => {
    const tr = document.createElement('tr');
    headers.forEach((h) => {
      const td = document.createElement('td');
      td.textContent = row[h] != null ? row[h] : '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  container.style.display = 'block';

  const rowCountEl = document.getElementById('tableRowCount');
  if (rowCountEl) {
    const total = csvData.length;
    const shown = Math.min(rows.length, maxRows);
    rowCountEl.textContent = `Showing ${shown.toLocaleString()} of ${rows.length.toLocaleString()} rows (total ${total.toLocaleString()} samples)`;
  }
}

function calculateStatistics(data) {
  if (!data.length) return null;

  const stats = {
    totalSamples: data.length,
    avgConfidence: '-',
    highConfSamples: 0,
    lowConfSamples: 0,
  };

  const keys = Object.keys(data[0]);
  const confidenceKey = keys.find((k) => /confidence|probability|score/i.test(k));
  if (!confidenceKey) return stats;

  let sum = 0;
  let count = 0;

  data.forEach((row) => {
    const raw = row[confidenceKey];
    if (raw == null || raw === '') return;

    const val = parseFloat(String(raw).replace('%', '').trim());
    if (Number.isNaN(val)) return;

    let normalized = val;
    if (val > 1) normalized = val / 100; // handle percent-like values (e.g. 80 => 0.8)

    sum += normalized;
    count += 1;

    if (normalized >= 0.8) stats.highConfSamples += 1;
    if (normalized < 0.5) stats.lowConfSamples += 1;
  });

  if (count) {
    stats.avgConfidence = `${Math.round((sum / count) * 100)}%`;
  }

  return stats;
}

function updateStatisticsDisplay(stats) {
  if (!stats) return;

  const id = (x) => document.getElementById(x);
  const totalEl = id('totalSamples');
  const avgEl = id('avgConfidence');
  const highEl = id('highConfSamples');
  const lowEl = id('lowConfSamples');

  if (totalEl) totalEl.textContent = stats.totalSamples ?? '-';
  if (avgEl) avgEl.textContent = stats.avgConfidence ?? '-';
  if (highEl) highEl.textContent = stats.highConfSamples ?? '-';
  if (lowEl) lowEl.textContent = stats.lowConfSamples ?? '-';
}

// ---- Dashboard: CSV + images ----
async function loadCSVData() {
  const loadingEl = document.getElementById('csvLoading');
  const errorEl = document.getElementById('csvError');
  const containerEl = document.getElementById('csvTableContainer');

  if (!loadingEl && !containerEl) return; // not on dashboard page

  if (loadingEl) loadingEl.style.display = 'flex';
  if (errorEl) errorEl.classList.add('hidden');
  if (containerEl) containerEl.style.display = 'none';

  try {
    const text = await fetchData(DATA_URLS.csv, 'text');
    csvData = parseCSV(text);
    if (!csvData.length) throw new Error('No CSV rows parsed');

    setupTableControls();
    renderPredictionTable();
    const stats = calculateStatistics(csvData);
    updateStatisticsDisplay(stats);

    if (loadingEl) loadingEl.style.display = 'none';
  } catch (err) {
    console.error('loadCSVData error:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.classList.remove('hidden');
  }
}

async function loadImage(url, imgId, containerId, loadingId, errorId) {
  const imgEl = document.getElementById(imgId);
  const container = document.getElementById(containerId);
  const loading = document.getElementById(loadingId);
  const error = document.getElementById(errorId);

  if (!imgEl) return;

  if (loading) loading.style.display = 'flex';
  if (error) error.classList.add('hidden');

  try {
    const preload = new Image();
    preload.crossOrigin = 'anonymous';

    preload.onload = () => {
      imgEl.src = url;
      if (container) container.style.display = 'block';
      if (loading) loading.style.display = 'none';
    };

    preload.onerror = () => {
      if (loading) loading.style.display = 'none';
      if (error) error.classList.remove('hidden');
    };

    preload.src = url;
  } catch (err) {
    console.error('loadImage error:', err);
    if (loading) loading.style.display = 'none';
    if (error) error.classList.remove('hidden');
  }
}

async function loadDashboardData() {
  // Fast exit if we are not on the dashboard
  if (!document.getElementById('csvTable')) return;

  await loadCSVData();
  await loadImage(
    DATA_URLS.confidenceHistogram,
    'histogramImg',
    'histogramContainer',
    'histogramLoading',
    'histogramError',
  );
  await loadImage(
    DATA_URLS.misclassifiedSamples,
    'misclassifiedImg',
    'misclassifiedContainer',
    'misclassifiedLoading',
    'misclassifiedError',
  );
  await loadImage(
    DATA_URLS.samplePredictions,
    'samplesImg',
    'samplesContainer',
    'samplesLoading',
    'samplesError',
  );
}

function exportCSV() {
  if (!csvData.length) {
    alert('No CSV data loaded yet.');
    return;
  }

  const headers = Object.keys(csvData[0]);
  const rows = [headers.join(',')];

  csvData.forEach((row) => {
    const line = headers
      .map((h) => {
        const cell = row[h] ?? '';
        const str = String(cell);
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
    rows.push(line);
  });

  const csvStr = rows.join('\n');
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'predictions_export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  logActivity('export', 'Exported predictions_export.csv');
}

// ---- Profile: gallery + last login ----
async function loadProfileGallery() {
  const gallery = document.getElementById('imageGallery');
  const loading = document.getElementById('galleryLoading');
  const error = document.getElementById('galleryError');

  if (!gallery) return; // not on profile page

  if (loading) loading.style.display = 'flex';
  if (error) error.classList.add('hidden');

  gallery.innerHTML = '';

  try {
    const images = [
      DATA_URLS.confidenceHistogram,
      DATA_URLS.samplePredictions,
      DATA_URLS.misclassifiedSamples,
    ];

    images.forEach((src) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';

      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Result image';
      img.loading = 'lazy';
      img.addEventListener('click', () => openModal(img));

      item.appendChild(img);
      gallery.appendChild(item);
    });

    gallery.style.display = 'grid';
    if (loading) loading.style.display = 'none';
  } catch (err) {
    console.error('loadProfileGallery error:', err);
    if (loading) loading.style.display = 'none';
    if (error) error.classList.remove('hidden');
  }
}

function updateLastLogin() {
  const lastLoginEl = document.getElementById('lastLogin');
  if (!lastLoginEl) return;

  let date = new Date();
  try {
    const user = JSON.parse(localStorage.getItem('aquasentinel_user') || 'null');
    if (user && user.loginTime) {
      const parsed = new Date(user.loginTime);
      if (!Number.isNaN(parsed.getTime())) {
        date = parsed;
      }
    }
  } catch (err) {
    console.warn('Unable to read login time from localStorage:', err);
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const dateLabel = sameDay ? 'Today' : date.toLocaleDateString();
  const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  lastLoginEl.textContent = `${dateLabel}, ${timeLabel}`;
}

function updateProfileFromUser() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('aquasentinel_user') || 'null');
  } catch {
    // ignore
  }

  if (!user || !user.username) return;

  const nameEl = document.querySelector('.profile-info h2');
  const avatarEl = document.querySelector('.profile-avatar');

  if (nameEl) nameEl.textContent = user.username;
  if (avatarEl) avatarEl.textContent = user.username.slice(0, 2).toUpperCase();
}

// ---- Smooth scrolling & scroll animations ----
function setupSmoothScrolling() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function setupTableControls() {
  const filtersContainers = document.querySelectorAll('.table-filters');
  if (!filtersContainers.length) return;

  filtersContainers.forEach((container) => {
    const buttons = container.querySelectorAll('button[data-filter]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.filter || 'all';
        tableState.filter = value;
        buttons.forEach((b) => b.classList.toggle('active', b === btn));
        renderPredictionTable();
      });
    });
  });
}

function addScrollAnimations() {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
  );

  const animatedElements = document.querySelectorAll('.card, .data-card, .gallery-item, .hero');
  animatedElements.forEach((el) => observer.observe(el));
}

// ---- Hero slider (landing page) ----
function initializeHeroSlider(selector = '#heroSlider', dotsSelector = '#heroDots', interval = 6000) {
  const slider = document.querySelector(selector);
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll('.hero-slide'));
  const dotsContainer = document.querySelector(dotsSelector);
  if (!slides.length) return;

  let current = 0;
  let timer = null;

  function goTo(index) {
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === index);
    });

    if (dotsContainer) {
      Array.from(dotsContainer.children).forEach((d, i) => {
        d.classList.toggle('active', i === index);
      });
    }

    current = index;
  }

  function next() {
    goTo((current + 1) % slides.length);
  }

  function resetTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(next, interval);
  }

  // Build dot controls
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `hero-dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => {
        goTo(i);
        resetTimer();
      });
      dotsContainer.appendChild(dot);
    });
  }

  // Optional arrow controls (accessibility + manual navigation)
  const createArrow = (dir) => {
    const existing = slider.querySelector(`.hero-arrow.${dir}`);
    if (existing) return existing;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `hero-arrow ${dir}`;
    btn.setAttribute('aria-label', dir === 'left' ? 'Previous slide' : 'Next slide');
    btn.innerHTML = dir === 'left' ? '&#9664;' : '&#9654;';
    slider.appendChild(btn);
    return btn;
  };

  const leftArrow = createArrow('left');
  const rightArrow = createArrow('right');

  leftArrow.addEventListener('click', () => {
    const prev = (current - 1 + slides.length) % slides.length;
    goTo(prev);
    resetTimer();
  });

  rightArrow.addEventListener('click', () => {
    const nextIndex = (current + 1) % slides.length;
    goTo(nextIndex);
    resetTimer();
  });

  slider.tabIndex = 0;
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') leftArrow.click();
    if (e.key === 'ArrowRight') rightArrow.click();
  });

  slider.addEventListener('mouseenter', () => {
    if (timer) clearInterval(timer);
  });
  slider.addEventListener('mouseleave', resetTimer);

  // Start
  goTo(0);
  resetTimer();
}

// ---- Particles background (landing) ----
function initializeParticles(canvasSelector = '#particleCanvas') {
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const particles = [];
  const config = {
    count: 80,
    maxSize: 2.4,
    maxSpeed: 0.25,
  };

  let width = window.innerWidth;
  let height = window.innerHeight;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * config.maxSpeed,
      vy: (Math.random() - 0.5) * config.maxSpeed,
      r: Math.random() * config.maxSize + 0.6,
      alpha: 0.2 + Math.random() * 0.6,
    };
  }

  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < config.count; i += 1) {
    particles.push(createParticle());
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    // Optional connecting lines for a subtle "network" feel
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        const maxDistSq = 160 * 160;
        if (distSq < maxDistSq) {
          const t = 1 - distSq / maxDistSq;
          ctx.strokeStyle = `rgba(148,163,184,${0.12 * t})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      gradient.addColorStop(0, `rgba(56,189,248,${p.alpha})`);
      gradient.addColorStop(1, 'rgba(56,189,248,0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(step);
  }

  step();
}

// ---- Global network handlers & console banner ----
window.addEventListener('online', () => {
  console.log('Connection restored');
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
  alert('Network connection lost. Some features may not work properly.');
});

console.log(`\n🌊 AquaSentinel - AI-Powered Microplastics Detection\n=====================================================\nGitHub: https://github.com/zyronvon/Microplastics_results\n`);

// ---- App bootstrap ----
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupModalHandlers();
  setupSmoothScrolling();
  addScrollAnimations();
  createNavUserBadge();
  initializeHeroSlider();

  const path = window.location.pathname.toLowerCase();
  const isLanding = path.endsWith('/') || path.includes('index.html');

  if (isLanding) {
    initializeParticles();
    loadDashboardData()
      .then(() => {
        logActivity('view', 'Viewed landing predictions & diagnostics');
      })
      .catch((err) => console.error('Landing data init error:', err));
  }

  if (path.includes('dashboard.html')) {
    loadDashboardData()
      .then(() => {
        logActivity('view', 'Viewed dashboard model results');
      })
      .catch((err) => console.error('Dashboard init error:', err));
  }
  if (path.includes('profile.html')) {
    loadProfileGallery()
      .then(() => {
        logActivity('view', 'Opened profile page');
      })
      .catch((err) => console.error('Profile gallery init error:', err));
    updateLastLogin();
    updateProfileFromUser();
    renderActivityTimeline();
  }
});

// ---- Optional exports for testing (Node / bundlers) ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchData,
    parseCSV,
    loadDashboardData,
    exportCSV,
  };
}
