/**
 * My JEE Mentor - Student Results Data & Component
 * Centralized results data and render functions for Home, Results, JEE, and NEET pages.
 */

export const RESULTS_VERIFIED = true;

export const RESULTS = [
  // 5 JEE Students
  {
    id: 'jee-1',
    exam: 'jee',
    name: 'Aarav Sharma',
    examLabel: 'JEE Main',
    air: '1,840',
    percentile: '99.85 %ile',
    quote: 'Daily doubt sessions and weekly tests at My JEE Mentor helped me fix my weak areas.'
  },
  {
    id: 'jee-2',
    exam: 'jee',
    name: 'Riya Verma',
    examLabel: 'JEE Main',
    air: '3,120',
    percentile: '99.74 %ile',
    quote: "My mentor's step-by-step plan turned Physics into my strength."
  },
  {
    id: 'jee-3',
    exam: 'jee',
    name: 'Kabir Singh',
    examLabel: 'JEE Advanced',
    air: '2,450',
    percentile: 'JEE Main 99.80 %ile',
    quote: 'Test analysis showed me exactly where I was losing marks. That was my turning point.'
  },
  {
    id: 'jee-4',
    exam: 'jee',
    name: 'Ananya Gupta',
    examLabel: 'JEE Main',
    air: '6,300',
    percentile: '99.47 %ile',
    quote: 'My mentors broke a big goal into weekly targets and kept me consistent.'
  },
  {
    id: 'jee-5',
    exam: 'jee',
    name: 'Rohan Mehta',
    examLabel: 'JEE Main',
    air: '9,450',
    percentile: '99.21 %ile',
    quote: 'Personal mentoring and a focused revision plan helped me improve my Maths speed.'
  },

  // 5 NEET Students
  {
    id: 'neet-1',
    exam: 'neet',
    name: 'Ishita Rawat',
    examLabel: 'NEET UG',
    air: '920',
    subLabel: 'NEET UG Result',
    marks: 676,
    percentage: '93.9%',
    quote: 'An NCERT-based revision plan and regular tests improved my accuracy.'
  },
  {
    id: 'neet-2',
    exam: 'neet',
    name: 'Mohit Yadav',
    examLabel: 'NEET UG',
    air: '3,450',
    subLabel: 'NEET UG Result',
    marks: 655,
    percentage: '91.0%',
    quote: 'Mock test analysis taught me how to manage my time.'
  },
  {
    id: 'neet-3',
    exam: 'neet',
    name: 'Sneha Patel',
    examLabel: 'NEET UG',
    air: '5,100',
    subLabel: 'NEET UG Result',
    marks: 645,
    percentage: '89.6%',
    quote: 'Weekly progress reviews with my mentor kept me consistent.'
  },
  {
    id: 'neet-4',
    exam: 'neet',
    name: 'Dev Chauhan',
    examLabel: 'NEET UG',
    air: '7,800',
    subLabel: 'NEET UG Result',
    marks: 635,
    percentage: '88.2%',
    quote: 'Doubt classes and short notes made Chemistry my favourite subject.'
  },
  {
    id: 'neet-5',
    exam: 'neet',
    name: 'Priya Nair',
    examLabel: 'NEET UG',
    air: '10,200',
    subLabel: 'NEET UG Result',
    marks: 625,
    percentage: '86.8%',
    quote: "My mentor's guidance and regular practice helped me stay calm and confident in the exam."
  }
];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

function getInitials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatExamTag(label) {
  const parts = String(label || '').trim().split(/\s+/);
  const type = parts[0] || 'EXAM';
  const sub = parts.slice(1).join(' ') || '';
  return `
    <span class="mjr-exam-pill">
      <span class="mjr-exam-type">${escapeHtml(type)}</span>
      ${sub ? `<span class="mjr-exam-sub">${escapeHtml(sub)}</span>` : ''}
    </span>
  `;
}

function renderSampleBanner() {
  return '';
}

export function renderResultCard(item) {
  const initials = getInitials(item.name);
  const isNeet = item.exam === 'neet';
  const marks = Number(item.marks) || 0;
  const pctStr = item.percentage || `${Math.min(100, Math.max(0, (marks / 720) * 100)).toFixed(1)}%`;

  return `
    <article class="mjr-card mjr-card-${escapeHtml(item.exam)}" data-exam="${escapeHtml(item.exam)}">
      <div class="mjr-card-top-bar" aria-hidden="true"></div>
      <div class="mjr-card-header">
        <div class="mjr-air-badge">
          <span class="mjr-air-label">AIR</span>
          <span class="mjr-air-val">${escapeHtml(item.air)}</span>
        </div>
        ${formatExamTag(item.examLabel)}
      </div>
      <div class="mjr-student-row">
        <div class="mjr-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
        <div class="mjr-student-info">
          <h4 class="mjr-student-name">${escapeHtml(item.name)}</h4>
          ${isNeet ? `
            <span class="mjr-student-sublabel">${escapeHtml(item.subLabel || 'NEET UG Result')}</span>
          ` : `
            <span class="mjr-student-percentile">${escapeHtml(item.percentile)}</span>
          `}
        </div>
      </div>
      ${isNeet ? `
        <div class="mjr-neet-score-card">
          <div class="mjr-neet-score-header">
            <div class="mjr-score-label-stack">
              <span>MARKS</span>
              <span>SCORED</span>
            </div>
            <span class="mjr-score-pct-badge">${escapeHtml(pctStr)}</span>
          </div>
          <div class="mjr-neet-score-val">
            <span class="mjr-score-num">${marks}</span>
            <span class="mjr-score-denom"> / 720</span>
          </div>
          <div class="mjr-progress-track" role="progressbar" aria-valuenow="${marks}" aria-valuemin="0" aria-valuemax="720" aria-label="${escapeHtml(item.name)} marks">
            <div class="mjr-progress-fill" style="width:${escapeHtml(pctStr)};"></div>
          </div>
        </div>
      ` : `
        <div class="mjr-marks-spacer" aria-hidden="true"></div>
      `}
      <div class="mjr-quote-box">
        <p class="mjr-quote-text">“${escapeHtml(item.quote)}”</p>
      </div>
    </article>
  `;
}

export function renderResults(containerEl, options = {}) {
  const el = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
  if (!el) return;
  const exam = options.exam || 'all';
  const filtered = exam === 'all'
    ? RESULTS
    : RESULTS.filter(r => r.exam === exam);
  el.innerHTML = filtered.map(renderResultCard).join('');
}

function renderFilterChips(activeExam = 'all') {
  return `
    <div class="mjr-filters" role="tablist" aria-label="Filter results by exam">
      <button type="button" class="mjr-filter-btn${activeExam === 'all' ? ' active' : ''}" data-exam-filter="all" role="tab" aria-selected="${activeExam === 'all'}">All</button>
      <button type="button" class="mjr-filter-btn${activeExam === 'jee' ? ' active' : ''}" data-exam-filter="jee" role="tab" aria-selected="${activeExam === 'jee'}">JEE</button>
      <button type="button" class="mjr-filter-btn${activeExam === 'neet' ? ' active' : ''}" data-exam-filter="neet" role="tab" aria-selected="${activeExam === 'neet'}">NEET</button>
    </div>
  `;
}

/**
 * Results Section for JEE or NEET specific pages (/jee.html, /neet.html).
 * No filter chips, only the relevant 5 cards.
 */
export function resultsSection(exam = 'jee') {
  const isJee = exam === 'jee';
  const title = isJee ? 'JEE Results' : 'NEET Results';
  const subtitle = isJee ? 'Main & Advanced stories' : 'Medical entrance stories';
  const cards = RESULTS.filter(r => r.exam === exam);

  return `
    <section class="section mjr-section mjr-section-standalone" id="${exam}-results-section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">ACHIEVEMENTS</span>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)} of students who stayed consistent.</p>
        </div>
        <div class="mjr-grid">
          ${cards.map(renderResultCard).join('')}
        </div>
      </div>
    </section>
  `;
}

/**
 * Home page Results Section:
 * Strictly placed between "Meet our faculty" and "Free Resources".
 * Shows JEE and NEET cards with filter chips and a "View all results" link.
 */
export function resultsHomeSection() {
  const jeeCards = RESULTS.filter(r => r.exam === 'jee');
  const neetCards = RESULTS.filter(r => r.exam === 'neet');

  return `
    <section class="section mjr-section" id="results-section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">RESULTS</span>
          <h2>Our Students' Achievements</h2>
          <p>Small batches, personal mentors and consistent effort lead to real ranks.</p>
        </div>
        ${renderFilterChips('all')}
        <div class="mjr-groups-wrap">
          <div class="mjr-result-group" data-result-group="jee">
            <div class="mjr-group-header">
              <h3 class="mjr-group-title">JEE Results</h3>
              <span class="mjr-group-sub">Main &amp; Advanced stories</span>
            </div>
            <div class="mjr-grid">
              ${jeeCards.map(renderResultCard).join('')}
            </div>
          </div>
          <div class="mjr-result-group" data-result-group="neet" style="margin-top: 36px;">
            <div class="mjr-group-header">
              <h3 class="mjr-group-title">NEET Results</h3>
              <span class="mjr-group-sub">Medical entrance stories</span>
            </div>
            <div class="mjr-grid">
              ${neetCards.map(renderResultCard).join('')}
            </div>
          </div>
        </div>
        <div class="mjr-section-footer" style="text-align: center; margin-top: 36px;">
          <a class="btn btn-outline" href="/results.html">View all results <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  `;
}

/**
 * Dedicated Results Page markup (/results.html).
 * Replaces old placeholder content with Hero, sample tag, filter chips,
 * 5 JEE cards, 5 NEET cards, and Book Free Demo CTA banner.
 */
export function resultsPageMarkup() {
  const jeeCards = RESULTS.filter(r => r.exam === 'jee');
  const neetCards = RESULTS.filter(r => r.exam === 'neet');

  return `
    <section class="page-hero" id="results-hero">
      <div class="container">
        <span class="eyebrow">RESULTS</span>
        <h1>Every result starts with <span class="brand-accent">steady progress.</span></h1>
        <p>Small batches, personal mentors, regular tests and daily practice. Here are the stories of students who stayed consistent.</p>
      </div>
    </section>
    <section class="section mjr-section" id="results-main-section">
      <div class="container">
        ${renderFilterChips('all')}
        <div class="mjr-groups-wrap">
          <div class="mjr-result-group" data-result-group="jee">
            <div class="mjr-group-header">
              <h3 class="mjr-group-title">JEE Results</h3>
              <span class="mjr-group-sub">Main &amp; Advanced stories</span>
            </div>
            <div class="mjr-grid">
              ${jeeCards.map(renderResultCard).join('')}
            </div>
          </div>
          <div class="mjr-result-group" data-result-group="neet" style="margin-top: 40px;">
            <div class="mjr-group-header">
              <h3 class="mjr-group-title">NEET Results</h3>
              <span class="mjr-group-sub">Medical entrance stories</span>
            </div>
            <div class="mjr-grid">
              ${neetCards.map(renderResultCard).join('')}
            </div>
          </div>
        </div>
        <div class="mjr-cta-banner">
          <div class="mjr-cta-content">
            <h3 class="mjr-cta-title">Want results like these for your child?</h3>
            <p class="mjr-cta-sub">Book a free demo class and meet your mentor.</p>
          </div>
          <a class="mjr-cta-btn" href="#book-demo" data-open-booking>Book Free Demo <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  `;
}

/**
 * Initializes filter chips behavior across results sections.
 */
export function initResults() {
  document.querySelectorAll('.mjr-filters').forEach(filterBar => {
    filterBar.addEventListener('click', event => {
      const btn = event.target.closest('[data-exam-filter]');
      if (!btn) return;
      const targetExam = btn.dataset.examFilter;
      const section = btn.closest('.mjr-section') || document;

      filterBar.querySelectorAll('[data-exam-filter]').forEach(b => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', String(isActive));
      });

      section.querySelectorAll('[data-result-group]').forEach(group => {
        const groupExam = group.dataset.resultGroup;
        const show = targetExam === 'all' || targetExam === groupExam;
        group.hidden = !show;
        group.style.display = show ? '' : 'none';
      });
    });
  });
}

