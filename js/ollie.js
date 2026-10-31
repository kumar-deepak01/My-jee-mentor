/**
 * ============================================================================
 * Ollie the Owl - Interactive Academic Guide & Lead Generator
 * My JEE Mentor (JEE, NEET & Foundation)
 *
 * Core Capabilities:
 * 1. Interactive "Ask Ollie" Panel with multilingual rule-based intent engine (English, Hindi, Hinglish).
 * 2. Real-time Live DOM Data Extraction for batches, fees, faculty, and navigation courses.
 * 3. Personalized onboarding greeting + 4-stop customized tour ("Show me around").
 * 4. In-panel Lead Generation Flow (reusing /api/leads & /api/csrf, ?ollie-test=1 dry-run).
 * 5. Value-add passive scroll nudges (<= 20 words) and desktop hover chips.
 * 6. Non-overlapping 3-tier placement, collision auto-collapse, and sticky header/.mobile-bar avoidance.
 * 7. Route exclusions (fees, login, test, classroom, student-login) and ?ollie-debug=1 logging.
 * ============================================================================
 */

(function () {
  'use strict';

  // 1. ROUTE EXCLUSION GUARD
  const routePath = (location.pathname || '').toLowerCase();
  if (
    routePath.includes('fees') ||
    routePath.includes('login') ||
    routePath.includes('test') ||
    routePath.includes('classroom') ||
    routePath.includes('student-login')
  ) {
    return;
  }

  // Configuration & Flags
  const isDebug = location.search.includes('ollie-debug=1');
  const isTestMode = location.search.includes('ollie-test=1');
  const PHONE_NUMBER = '+91 73042 56203';
  const WA_NUMBER = '917304256203';

  // Site map for route discovery and alias matching
  const SITE_MAP = {
    '/': { title: 'Home', keywords: ['home', 'main', 'start', 'shuru'] },
    '/jee.html': { title: 'JEE Coaching', exam: 'JEE', keywords: ['jee', 'iit', 'mains', 'advance', 'advanced', 'engineering'] },
    '/neet.html': { title: 'NEET Coaching', exam: 'NEET', keywords: ['neet', 'medical', 'doctor', 'mbbs', 'biology', 'aiims'] },
    '/foundation.html': { title: 'Foundation', exam: 'Foundation', keywords: ['foundation', 'class 7', 'class 8', 'class 9', 'class 10', 'middle school', 'olympiad', 'boards'] },
    '/faculty.html': { title: 'Our Faculty', keywords: ['faculty', 'teachers', 'teacher', 'sir', 'mam', 'mentors'] },
    '/reviews.html': { title: 'Reviews', keywords: ['reviews', 'results', 'feedback', 'students', 'parents', 'testimonials'] },
    '/freeresource.html': { title: 'Free Resources', keywords: ['resources', 'notes', 'pyq', 'dpp', 'free', 'formula', 'paper'] },
    '/why-my-jee-mentor.html': { title: 'Why Us', keywords: ['why', 'batch size', 'mentorship', 'compare'] },
    '/contact.html': { title: 'Contact', keywords: ['contact', 'call', 'whatsapp', 'phone', 'address', 'location'] },
    '/career.html': { title: 'Careers', keywords: ['career', 'jobs', 'hiring', 'work', 'teach'] }
  };

  // Device capability check (Desktop hover vs Touch)
  function isDesktopDevice() {
    try {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch (e) {
      return window.innerWidth > 900;
    }
  }

  // ==========================================================================
  // 2. LIVE SITE DATA EXTRACTION ENGINE (DOM wins, never hard-coded)
  // ==========================================================================
  function getLiveBatches(courseFilter = '') {
    const batches = [];
    const cards = document.querySelectorAll('.program-card, .foundation-card, .mjm-card');

    cards.forEach(card => {
      // 1. Title/Name
      const titleEl = card.querySelector('h3, .program-title-row, .mjm-title');
      if (!titleEl) return;
      let name = titleEl.childNodes[0]?.textContent?.trim() || titleEl.textContent.trim();
      name = name.replace(/\s+/g, ' ');

      // 2. Fee extraction matching ₹ + digits
      let fee = '';
      const feeMatch = card.textContent.match(/₹\s*[\d,]+(?:\s*\/\s*(?:month|mo))?/i);
      if (feeMatch) {
        fee = feeMatch[0].trim();
      }

      // 3. Key details
      const details = [];
      card.querySelectorAll('ul li, .mjm-points span, .foundation-subject').forEach(li => {
        const text = li.textContent.replace(/[✔✓]/g, '').trim();
        if (text && details.length < 3) details.push(text);
      });
      if (details.length === 0) {
        const p = card.querySelector('p:not(.mjm-tag):not(.foundation-kicker)');
        if (p) details.push(p.textContent.trim());
      }

      // 4. CTA Button
      const cta = card.querySelector('.program-cta, .foundation-card-cta, .mjm-btn, .btn-primary, a[href]');

      // 5. Inferred Course
      let course = 'General';
      if (card.matches('.neet-program-card, .neet') || location.pathname.includes('neet')) {
        course = 'NEET';
      } else if (card.matches('.foundation-card, .foundation') || location.pathname.includes('foundation')) {
        course = 'Foundation';
      } else if (card.matches('.jee') || location.pathname.includes('jee')) {
        course = 'JEE';
      }

      batches.push({ element: card, name, fee, details, cta, course });
    });

    if (courseFilter) {
      return batches.filter(b => b.course.toLowerCase() === courseFilter.toLowerCase());
    }
    return batches;
  }

  function getLiveFaculty() {
    const faculty = [];
    document.querySelectorAll('.faculty-card').forEach(card => {
      const nameEl = card.querySelector('.faculty-name, h3');
      const name = nameEl ? nameEl.textContent.trim().replace(/\s+/g, ' ') : '';
      const tagEl = card.querySelector('.faculty-tag, .faculty-badge');
      const tag = tagEl ? tagEl.textContent.trim() : '';
      const degreeEl = card.querySelector('.faculty-degree');
      const degree = degreeEl ? degreeEl.textContent.trim() : '';
      const quoteEl = card.querySelector('.faculty-quote');
      const quote = quoteEl ? quoteEl.textContent.trim() : '';
      const cta = card.querySelector('a, button');

      if (name) {
        faculty.push({ element: card, name, tag, degree, quote, cta });
      }
    });
    return faculty;
  }

  function getLiveCourses() {
    const courses = [];
    const navLinks = document.querySelectorAll('header.site-header nav a, .nav a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent.trim();
      if (['JEE', 'NEET', 'Foundation'].includes(text) || href.includes('jee') || href.includes('neet') || href.includes('foundation')) {
        courses.push({ name: text, url: href, id: text.toLowerCase() });
      }
    });
    if (courses.length === 0) {
      return [
        { name: 'JEE', url: '/jee.html', id: 'jee' },
        { name: 'NEET', url: '/neet.html', id: 'neet' },
        { name: 'Foundation', url: '/foundation.html', id: 'foundation' }
      ];
    }
    return courses;
  }

  // ==========================================================================
  // 3. FUZZY MATCHING & INTENT ENGINE (Multilingual English/Hindi/Hinglish)
  // ==========================================================================
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = [];
    for (let i = 0; i <= b.length; i++) row[i] = i;
    for (let i = 1; i <= a.length; i++) {
      let prev = i;
      for (let j = 1; j <= b.length; j++) {
        const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
        row[j - 1] = prev;
        prev = val;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  }

  function matchesFuzzy(token, targetWords, maxDist = 1) {
    if (token.length < 4) {
      return targetWords.includes(token);
    }
    for (const w of targetWords) {
      if (token === w) return true;
      if (Math.abs(token.length - w.length) <= maxDist) {
        if (levenshtein(token, w) <= maxDist) return true;
      }
    }
    return false;
  }

  function detectQueryIntent(rawQuery) {
    const q = rawQuery.toLowerCase().replace(/[?.,!/\\#@$%^&*()_\-+=:;"'~`]/g, ' ').trim();
    const tokens = q.split(/\s+/).filter(Boolean);

    // 1. Specific Teacher Name
    if (tokens.some(t => matchesFuzzy(t, ['ayushi', 'aayushi']))) return { intent: 'teacher_ayushi' };
    if (tokens.some(t => matchesFuzzy(t, ['anil', 'singh']))) return { intent: 'teacher_anil' };
    if (tokens.some(t => matchesFuzzy(t, ['lokesh', 'gupta']))) return { intent: 'teacher_lokesh' };
    if (tokens.some(t => matchesFuzzy(t, ['soujanya', 'mondal', 'soujnya']))) return { intent: 'teacher_soujanya' };
    if (tokens.some(t => matchesFuzzy(t, ['shubham', 'subham']))) return { intent: 'teacher_shubham' };

    // 2. Specific Batch Name
    if (tokens.some(t => matchesFuzzy(t, ['booster', 'boster']))) return { intent: 'batch_booster' };
    if (tokens.some(t => matchesFuzzy(t, ['ranker', 'rnker']))) return { intent: 'batch_ranker' };
    if (tokens.some(t => matchesFuzzy(t, ['premium', 'premum']))) return { intent: 'batch_premium' };
    if (q.includes('personal mentorship') || (tokens.includes('mentorship') && !q.includes('why'))) return { intent: 'batch_personal_mentorship' };
    if (q.includes('one to one') || q.includes('1:1') || q.includes('1 to 1')) return { intent: 'batch_one_to_one' };

    // 3. Class Specific Queries (e.g. "foundation class 9", "class 10 fees")
    const classMatch = q.match(/\b(?:class|standard|std|grade|kaksha|कक्षा)\s*([7-9]|10|11|12|dropper)\b/i) || q.match(/\b([7-9]|10|11|12)\s*(?:th|st|nd|rd)?\s*(?:class|std|grade)?\b/i);
    const hasFee = tokens.some(t => matchesFuzzy(t, ['fee', 'fees', 'feee', 'price', 'cost', 'charge', 'kitna', 'kitni', 'kitne', 'rupaye', 'paisa'])) || q.includes('फीस') || q.includes('दाम');
    const hasDemo = tokens.some(t => matchesFuzzy(t, ['demo', 'trial', 'free', 'book', 'sample'])) || q.includes('डेमो') || q.includes('ट्रायल');
    const hasAdmission = tokens.some(t => matchesFuzzy(t, ['admission', 'admissions', 'addmission', 'join', 'enrol', 'enroll', 'register', 'seat'])) || q.includes('दाखिला') || q.includes('प्रवेश');

    // Lead Flow Check
    if (hasDemo || hasAdmission) {
      return { intent: 'lead_flow' };
    }

    // Fees Queries
    if (hasFee) {
      if (tokens.some(t => matchesFuzzy(t, ['jee', 'iit', 'engineering'])) || q.includes('जेईई') || q.includes('आईआईटी')) return { intent: 'jee_fees' };
      if (tokens.some(t => matchesFuzzy(t, ['neet', 'medical', 'doctor', 'mbbs', 'biology'])) || q.includes('नीट') || q.includes('डॉक्टर')) return { intent: 'neet_fees' };
      if (tokens.some(t => matchesFuzzy(t, ['foundation'])) || q.includes('फाउंडेशन')) return { intent: 'foundation_fees' };
      if (classMatch && ['7', '8', '9', '10'].includes(classMatch[1])) return { intent: 'foundation_fees', cls: classMatch[1] };
      if (classMatch && ['11', '12', 'dropper'].includes(classMatch[1])) return { intent: 'jee_or_neet_fees', cls: classMatch[1] };
      return { intent: 'fees_general' };
    }

    // Faculty Queries
    if (tokens.some(t => matchesFuzzy(t, ['teacher', 'teachers', 'faculty', 'facluty', 'sir', 'mam', 'madam', 'mentor', 'mentors', 'padhata', 'padhate'])) || q.includes('शिक्षक') || q.includes('अध्यापक')) {
      return { intent: 'faculty' };
    }

    // Foundation Queries
    if (tokens.some(t => matchesFuzzy(t, ['foundation', 'olympiad', 'boards'])) || q.includes('फाउंडेशन') || (classMatch && ['7', '8', '9', '10'].includes(classMatch[1]))) {
      return { intent: 'foundation_info', cls: classMatch ? classMatch[1] : null };
    }

    // JEE Queries
    if (tokens.some(t => matchesFuzzy(t, ['jee', 'iit', 'engineering', 'mains', 'advance', 'advanced'])) || q.includes('जेईई') || q.includes('आईआईटी')) {
      return { intent: 'jee_info' };
    }

    // NEET Queries
    if (tokens.some(t => matchesFuzzy(t, ['neet', 'medical', 'doctor', 'mbbs', 'biology', 'aiims'])) || q.includes('नीट') || q.includes('डॉक्टर')) {
      return { intent: 'neet_info' };
    }

    // Reviews & Results
    if (tokens.some(t => matchesFuzzy(t, ['review', 'reviews', 'result', 'results', 'feedback', 'parent', 'parents', 'student', 'students', 'testimonial'])) || q.includes('रिव्यू') || q.includes('रिजल्ट')) {
      return { intent: 'reviews' };
    }

    // Resources / PYQ / Notes
    if (tokens.some(t => matchesFuzzy(t, ['notes', 'pyq', 'pyqs', 'dpp', 'resource', 'resources', 'formula', 'paper', 'pdf', 'material'])) || q.includes('नोट्स')) {
      return { intent: 'resources' };
    }

    // Contact
    if (tokens.some(t => matchesFuzzy(t, ['contact', 'call', 'whatsapp', 'phone', 'mobile', 'address', 'location', 'office', 'timing', 'time', 'sampark'])) || q.includes('संपर्क') || q.includes('फोन')) {
      return { intent: 'contact' };
    }

    // Why choose / Batches size
    if (tokens.some(t => matchesFuzzy(t, ['why', 'compare'])) || q.includes('batch size') || q.includes('10 students') || q.includes('kisi batch')) {
      return { intent: 'why_us' };
    }

    // Careers
    if (tokens.some(t => matchesFuzzy(t, ['career', 'careers', 'job', 'jobs', 'hiring', 'vacancy', 'apply']))) {
      return { intent: 'careers' };
    }

    // Student Portals
    if (tokens.some(t => matchesFuzzy(t, ['login', 'classroom', 'test', 'portal', 'exam']))) {
      return { intent: 'portals' };
    }

    return { intent: 'unknown', raw: rawQuery };
  }

  // ==========================================================================
  // 4. VALUE-ADD PASSIVE SCROLL NUDGES (Max 20 words each)
  // ==========================================================================
  const PASSIVE_NUDGES = [
    {
      id: 'home-hero',
      page: '/',
      section: 'section.hero',
      target: '.hero-actions .btn-primary',
      text: 'Preparing for JEE, NEET, or Foundation? Ask me anything or explore our personalized small batches below.'
    },
    {
      id: 'home-programs',
      page: '/',
      section: 'section.program-section .section-head',
      target: '.mjm-card.jee .mjm-btn',
      text: 'Strictly max 10 students per batch. Want to compare JEE, NEET and Foundation fees?'
    },
    {
      id: 'home-card-jee',
      page: '/',
      section: '.mjm-card.jee',
      target: '.mjm-card.jee .mjm-btn',
      text: 'Targeting IIT-JEE? Live classes, weekly test series and daily DPP tracking. Click Explore Now.'
    },
    {
      id: 'home-card-neet',
      page: '/',
      section: '.mjm-card.neet',
      target: '.mjm-card.neet .mjm-btn',
      text: 'Comprehensive NCERT mastery in Physics, Chemistry & Biology. Click Explore Now for full batch options.'
    },
    {
      id: 'home-card-foundation',
      page: '/',
      section: '.mjm-card.foundation',
      target: '.mjm-card.foundation .mjm-btn',
      text: 'Classes 7 to 10 build strong Science and Math logic for boards and Olympiads. Explore details.'
    },
    {
      id: 'home-reviews',
      page: '*',
      section: '.mjm-reviews-header',
      target: '.mjm-review-card:first-child',
      text: 'See how our small batch size and daily mentor attention helped students improve their ranks.'
    },
    {
      id: 'home-faculty',
      page: '*',
      section: '.mjm-faculty-header',
      target: '.faculty-card:first-child',
      text: 'Meet our premier faculty from NITs and top institutes. Tap any teacher to view qualifications.'
    },
    {
      id: 'home-mentorship',
      page: '/',
      section: 'section.mentorship-section',
      target: '.mentorship-cta .btn',
      text: 'Every batch gets one dedicated personal mentor for 24/7 doubt resolution and weekly study reviews.'
    },
    {
      id: 'home-resources',
      page: '/',
      section: 'section.shared-resources-section',
      target: '.shared-resources-section .btn-primary, .shared-resources-section .btn-outline',
      text: 'Study smarter with our free formula sheets, sample video lectures, and faculty notes.'
    },
    {
      id: 'home-final',
      page: '/',
      section: 'section.section-soft:last-of-type',
      target: 'section.section-soft:last-of-type .btn-primary',
      text: 'Experience real 1-on-1 teaching before deciding. Click Book Free Demo to reserve your session.'
    },
    {
      id: 'home-footer',
      page: '*',
      section: 'footer.site-footer',
      target: 'footer.site-footer a[href^="https://wa.me"]',
      text: 'Have a quick question? Call +91 73042 56203 or chat with our counselor on WhatsApp.'
    },
    // JEE page
    {
      id: 'jee-hero',
      page: '/jee.html',
      section: '.page-hero',
      target: '.page-hero .btn-primary',
      text: 'Concept-first JEE coaching with live teaching and tracked personal mentorship for Class 11, 12 & droppers.'
    },
    {
      id: 'jee-batches',
      page: '/jee.html',
      section: '.resource-grid, .program-card',
      target: '.program-cta',
      text: 'Here are our 4 specialized JEE batches. Tap any batch or ask me for fee breakdowns.'
    },
    // NEET page
    {
      id: 'neet-hero',
      page: '/neet.html',
      section: '.page-hero',
      target: '.page-hero .btn-primary',
      text: 'Structured Physics, Chemistry and Biology coaching with intensive NCERT practice and mock test series.'
    },
    {
      id: 'neet-batches',
      page: '/neet.html',
      section: '.resource-grid, .neet-program-card',
      target: '.program-cta',
      text: 'Review our NEET batch options. Need guidance choosing between 1-on-1 and small batch programs?'
    },
    // Foundation page
    {
      id: 'foundation-hero',
      page: '/foundation.html',
      section: 'section.foundation-hero',
      target: '.foundation-btn-primary',
      text: 'Strong foundations create more choices. Classes 7–10 in Science, Math, Social Science & English.'
    },
    {
      id: 'foundation-classes',
      page: '/foundation.html',
      section: '.foundation-classes, .foundation-card-grid',
      target: '.foundation-card-cta',
      text: 'Max 10 students per batch with CBSE & ICSE board alignment and daily practice sheets.'
    }
  ];

  // ==========================================================================
  // 5. OLLIE CONTROLLER & DOM CREATION
  // ==========================================================================
  let owlEl = null;
  let bubEl = null;
  let txtEl = null;
  let panelEl = null;
  let collapsedBarEl = null;
  let messagesListEl = null;
  let chipsBarEl = null;
  let inputFieldEl = null;
  let sendButtonEl = null;

  let activeSteps = [];
  let currentStepIdx = -1;
  let isTour = false;
  let isHidden = false;
  let isPanelOpen = false;
  let isTyping = false;
  let flyTimer = null;
  let tourTimer = null;
  let highlightedEl = null;
  let isTick = false;
  let modalActive = false;
  let consecutiveMisses = 0;
  let answeredCount = 0;

  try {
    isHidden = sessionStorage.getItem('ollie-hidden') === 'true';
    isPanelOpen = sessionStorage.getItem('ollie-panel-open') === 'true';
  } catch (e) {}

  function createOllieUI() {
    if (document.getElementById('ollie-owl')) return;

    // 1. Owl Floating Button
    const owl = document.createElement('button');
    owl.id = 'ollie-owl';
    owl.className = 'ollie-owl';
    owl.type = 'button';
    owl.setAttribute('aria-label', 'Ollie, your website guide and academic advisor');
    owl.innerHTML = `
      <svg viewBox="0 0 100 110" role="img" aria-hidden="true">
        <!-- Wings -->
        <path class="ollie-wl" d="M16 58 Q-2 82 14 102 Q26 86 24 62 Z" fill="#c9560c"/>
        <path class="ollie-wr" d="M84 58 Q102 82 86 102 Q74 86 76 62 Z" fill="#c9560c"/>
        <!-- Body & Chest -->
        <ellipse cx="50" cy="68" rx="37" ry="38" fill="#f47721"/>
        <ellipse cx="50" cy="84" rx="21" ry="20" fill="#ffd9b8"/>
        <!-- Chest Feathers -->
        <path d="M40 80 q4 4 8 0 M52 80 q4 4 8 0 M46 90 q4 4 8 0" stroke="#f47721" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Blinking Eyes -->
        <g class="ollie-eyes">
          <circle cx="35" cy="56" r="15" fill="#ffffff" stroke="#14213d" stroke-width="3"/>
          <circle cx="65" cy="56" r="15" fill="#ffffff" stroke="#14213d" stroke-width="3"/>
          <circle cx="37" cy="58" r="6.5" fill="#14213d"/>
          <circle cx="63" cy="58" r="6.5" fill="#14213d"/>
          <circle cx="39" cy="55" r="2" fill="#ffffff"/>
          <circle cx="65" cy="55" r="2" fill="#ffffff"/>
        </g>
        <!-- Beak -->
        <polygon points="44,66 56,66 50,78" fill="#ffd23f"/>
        <!-- Mortarboard Graduation Cap -->
        <polygon points="30,26 30,38 50,45 70,38 70,26" fill="#0d162b"/>
        <polygon points="50,4 90,19 50,34 10,19" fill="#14213d"/>
        <line x1="86" y1="20" x2="86" y2="38" stroke="#ffd23f" stroke-width="2.5"/>
        <circle cx="86" cy="40" r="3.5" fill="#ffd23f"/>
        <!-- Feet -->
        <ellipse cx="40" cy="106" rx="9" ry="4" fill="#ffd23f"/>
        <ellipse cx="60" cy="106" rx="9" ry="4" fill="#ffd23f"/>
      </svg>
    `;

    // 2. Nudge Speech Bubble
    const bub = document.createElement('aside');
    bub.id = 'ollie-bub';
    bub.className = 'ollie-bub';
    bub.setAttribute('role', 'region');
    bub.setAttribute('aria-label', 'Guide nudge from Ollie');
    bub.hidden = true;
    bub.innerHTML = `
      <div id="ollie-txt" class="ollie-txt" aria-live="polite"></div>
      <div class="ollie-bc">
        <button type="button" class="ollie-btn" id="ollie-act">Ask Ollie</button>
        <button type="button" class="ollie-lnk" id="ollie-hide">Hide</button>
      </div>
    `;

    // 3. Collapsed Bar Pill
    const bar = document.createElement('button');
    bar.id = 'ollie-collapsed-bar';
    bar.type = 'button';
    bar.setAttribute('aria-label', 'Open Ask Ollie Panel');
    bar.hidden = true;
    bar.innerHTML = `<span>🦉</span> <span>Ask Ollie</span>`;

    // 4. Interactive Ask Ollie Panel
    const panel = document.createElement('section');
    panel.id = 'ollie-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask Ollie Panel');
    panel.hidden = true;
    panel.innerHTML = `
      <div class="ollie-panel-head">
        <div class="ollie-panel-title-wrap">
          <span style="font-size:1.15rem;">🦉</span>
          <h3 class="ollie-panel-title">Ollie <span class="ollie-panel-badge">Guide</span></h3>
        </div>
        <div class="ollie-panel-controls">
          <button type="button" class="ollie-icon-btn" id="ollie-panel-min" title="Minimize panel" aria-label="Minimize panel">_</button>
          <button type="button" class="ollie-icon-btn" id="ollie-panel-close" title="Close guide" aria-label="Close guide">✕</button>
        </div>
      </div>
      <div class="ollie-messages-wrap" id="ollie-messages" role="log" aria-live="polite"></div>
      <div class="ollie-chips-bar" id="ollie-chips" role="toolbar" aria-label="Quick reply options"></div>
      <form class="ollie-input-bar" id="ollie-input-form">
        <input type="text" class="ollie-text-input" id="ollie-input" placeholder="Ask Ollie anything (e.g. jee fee, teachers, demo)..." autocomplete="off" maxlength="250">
        <button type="submit" class="ollie-send-button" id="ollie-send" title="Send question" aria-label="Send question">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    `;

    document.body.appendChild(bub);
    document.body.appendChild(owl);
    document.body.appendChild(bar);
    document.body.appendChild(panel);

    owlEl = owl;
    bubEl = bub;
    txtEl = document.getElementById('ollie-txt');
    panelEl = panel;
    collapsedBarEl = bar;
    messagesListEl = document.getElementById('ollie-messages');
    chipsBarEl = document.getElementById('ollie-chips');
    inputFieldEl = document.getElementById('ollie-input');
    sendButtonEl = document.getElementById('ollie-send');

    // Button Listeners
    document.getElementById('ollie-act').onclick = function (e) {
      e.preventDefault();
      openAskPanel();
    };

    document.getElementById('ollie-hide').onclick = function (e) {
      e.preventDefault();
      hideGuide();
    };

    document.getElementById('ollie-panel-min').onclick = function () {
      collapseAskPanel();
    };

    document.getElementById('ollie-panel-close').onclick = function () {
      collapseAskPanel();
    };

    collapsedBarEl.onclick = function () {
      openAskPanel();
    };

    owlEl.onclick = function () {
      if (isHidden) {
        showGuide();
      } else {
        openAskPanel();
      }
    };

    // Pause scroll narration while typing
    inputFieldEl.addEventListener('focus', function () {
      isTyping = true;
    });
    inputFieldEl.addEventListener('blur', function () {
      isTyping = false;
    });

    document.getElementById('ollie-input-form').onsubmit = function (e) {
      e.preventDefault();
      const query = inputFieldEl.value.trim();
      if (!query) return;
      inputFieldEl.value = '';
      isTyping = false;
      handleUserQuery(query);
    };

    // Initial entrance position
    owlEl.style.transition = 'none';
    owlEl.style.transform = 'translate(' + (window.innerWidth + 40) + 'px, -120px)';
    void owlEl.offsetWidth;
    owlEl.style.transition = '';

    if (!isHidden) {
      if (isPanelOpen) {
        openAskPanel();
      } else {
        collapsedBarEl.hidden = false;
        bubEl.hidden = false;
      }
    }
  }

  // ==========================================================================
  // 6. PANEL INTERACTION, CHAT MEMORY & TYPING FLOW
  // ==========================================================================
  let typingTimer = null;

  function openAskPanel(fromPendingAction = false) {
    isPanelOpen = true;
    try {
      sessionStorage.setItem('ollie_panel_open', 'true');
    } catch (e) {}

    panelEl.hidden = false;
    panelEl.classList.remove('ollie-minimized');
    collapsedBarEl.hidden = true;
    bubEl.hidden = true;

    // Perch owl on panel
    dockOwlOnPanel();

    // Ensure panel is never empty
    if (!messagesListEl || messagesListEl.children.length === 0) {
      const restored = restoreChatHistory();
      if (!restored && !fromPendingAction) {
        renderGreetingFlow();
      }
    }

    requestAnimationFrame(() => {
      inputFieldEl?.focus({ preventScroll: true });
    });
  }

  function collapseAskPanel() {
    isPanelOpen = false;
    try {
      sessionStorage.setItem('ollie_panel_open', 'false');
    } catch (e) {}

    panelEl.classList.add('ollie-minimized');
    setTimeout(() => {
      if (!isPanelOpen) panelEl.hidden = true;
    }, 300);

    collapsedBarEl.hidden = false;
    if (!isHidden) {
      bubEl.hidden = false;
      placeOllieAndBubble();
    }
  }

  function dockOwlOnPanel() {
    if (!owlEl || !panelEl) return;
    const pRect = panelEl.getBoundingClientRect();
    const targetX = Math.round(pRect.left - (isDesktopDevice() ? 32 : 16));
    const targetY = Math.round(pRect.top - (isDesktopDevice() ? 48 : 36));

    owlEl.classList.add('ollie-fly');
    clearTimeout(flyTimer);
    flyTimer = setTimeout(() => owlEl.classList.remove('ollie-fly'), 800);

    owlEl.style.transform = `translate(${targetX}px, ${targetY}px)`;
  }

  function saveChatHistory(item) {
    try {
      let history = [];
      const raw = sessionStorage.getItem('ollie_chat_history');
      if (raw) history = JSON.parse(raw);
      if (!Array.isArray(history)) history = [];
      history.push(item);
      if (history.length > 35) history = history.slice(-35);
      sessionStorage.setItem('ollie_chat_history', JSON.stringify(history));
    } catch (e) {}
  }

  function restoreChatHistory() {
    if (!messagesListEl) return false;
    let stored = [];
    try {
      const raw = sessionStorage.getItem('ollie_chat_history');
      if (raw) stored = JSON.parse(raw);
    } catch (e) {}

    if (Array.isArray(stored) && stored.length > 0) {
      messagesListEl.innerHTML = '';
      stored.forEach(item => {
        const msgEl = document.createElement('div');
        msgEl.className = 'ollie-msg ' + (item.role === 'user' ? 'ollie-user' : 'ollie-bot');
        msgEl.innerHTML = item.html;
        messagesListEl.appendChild(msgEl);
      });
      const lastBot = [...stored].reverse().find(i => i.role === 'bot' && Array.isArray(i.chips) && i.chips.length > 0);
      if (lastBot) {
        renderQuickChips(lastBot.chips);
      }
      messagesListEl.scrollTop = messagesListEl.scrollHeight;
      return true;
    }
    return false;
  }

  function botSay(htmlContent, quickChips = [], skipTyping = false) {
    if (!messagesListEl) return;

    if (skipTyping) {
      const msgEl = document.createElement('div');
      msgEl.className = 'ollie-msg ollie-bot';
      msgEl.innerHTML = htmlContent;
      messagesListEl.appendChild(msgEl);
      messagesListEl.scrollTop = messagesListEl.scrollHeight;
      renderQuickChips(quickChips);
      saveChatHistory({ role: 'bot', html: htmlContent, chips: quickChips });
      return;
    }

    const oldTyping = document.getElementById('ollie-typing-dots');
    if (oldTyping) oldTyping.remove();

    const typingEl = document.createElement('div');
    typingEl.id = 'ollie-typing-dots';
    typingEl.className = 'ollie-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    messagesListEl.appendChild(typingEl);
    messagesListEl.scrollTop = messagesListEl.scrollHeight;

    if (chipsBarEl) chipsBarEl.style.display = 'none';

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      if (typingEl && typingEl.parentNode) typingEl.remove();

      const msgEl = document.createElement('div');
      msgEl.className = 'ollie-msg ollie-bot';
      msgEl.innerHTML = htmlContent;
      messagesListEl.appendChild(msgEl);
      messagesListEl.scrollTop = messagesListEl.scrollHeight;

      renderQuickChips(quickChips);
      saveChatHistory({ role: 'bot', html: htmlContent, chips: quickChips });
    }, 480);
  }

  function userSay(text) {
    if (!messagesListEl) return;
    const msgEl = document.createElement('div');
    msgEl.className = 'ollie-msg ollie-user';
    msgEl.textContent = text;
    messagesListEl.appendChild(msgEl);
    messagesListEl.scrollTop = messagesListEl.scrollHeight;

    saveChatHistory({ role: 'user', html: text, chips: [] });
  }

  const appendBotMessage = botSay;
  const appendUserMessage = userSay;

  function renderQuickChips(chips = []) {
    if (!chipsBarEl) return;
    chipsBarEl.innerHTML = '';
    if (!chips || chips.length === 0) {
      chipsBarEl.style.display = 'none';
      return;
    }
    chipsBarEl.style.display = 'flex';
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ollie-chip-btn';
      btn.textContent = chip.label || chip;
      btn.onclick = function () {
        if (typeof chip.action === 'function') {
          chip.action();
        } else {
          handleMenuChoice(chip.query || chip.label || chip);
        }
      };
      chipsBarEl.appendChild(btn);
    });
  }

  // Greeting Flow & Main Menu
  function renderGreetingFlow() {
    botSay(
      "Namaste! 🙏 Welcome to My JEE Mentor. I'm Ollie, your guide. I can show you batches, fees, faculty and book a free demo for you. What are you preparing for?",
      [
        {
          label: 'JEE',
          action: () => {
            userSay('JEE');
            try { sessionStorage.setItem('ollie_exam', 'JEE'); } catch (e) {}
            askClassForExam('JEE');
          }
        },
        {
          label: 'NEET',
          action: () => {
            userSay('NEET');
            try { sessionStorage.setItem('ollie_exam', 'NEET'); } catch (e) {}
            askClassForExam('NEET');
          }
        },
        {
          label: 'Foundation (Class 7–10)',
          action: () => {
            userSay('Foundation (Class 7–10)');
            try { sessionStorage.setItem('ollie_exam', 'Foundation'); } catch (e) {}
            askClassForFoundation();
          }
        },
        {
          label: 'Just exploring',
          action: () => {
            userSay('Just exploring');
            try { sessionStorage.setItem('ollie_exam', 'General'); } catch (e) {}
            showMainMenu();
          }
        }
      ]
    );
  }

  function askClassForExam(exam) {
    botSay(
      `Great! Which class are you in for <strong>${exam}</strong>?`,
      [
        {
          label: 'Class 11',
          action: () => {
            userSay('Class 11');
            try { sessionStorage.setItem('ollie_class', '11'); } catch (e) {}
            showMainMenu();
          }
        },
        {
          label: 'Class 12',
          action: () => {
            userSay('Class 12');
            try { sessionStorage.setItem('ollie_class', '12'); } catch (e) {}
            showMainMenu();
          }
        },
        {
          label: 'Dropper',
          action: () => {
            userSay('Dropper');
            try { sessionStorage.setItem('ollie_class', 'Dropper'); } catch (e) {}
            showMainMenu();
          }
        }
      ]
    );
  }

  function askClassForFoundation() {
    botSay(
      `Great! Which class is the student entering?`,
      [
        {
          label: 'Class 7',
          action: () => {
            userSay('Class 7');
            try { sessionStorage.setItem('ollie_class', '7'); } catch (e) {}
            showMainMenu();
          }
        },
        {
          label: 'Class 8',
          action: () => {
            userSay('Class 8');
            try { sessionStorage.setItem('ollie_class', '8'); } catch (e) {}
            showMainMenu();
          }
        },
        {
          label: 'Class 9',
          action: () => {
            userSay('Class 9');
            try { sessionStorage.setItem('ollie_class', '9'); } catch (e) {}
            showMainMenu();
          }
        },
        {
          label: 'Class 10',
          action: () => {
            userSay('Class 10');
            try { sessionStorage.setItem('ollie_class', '10'); } catch (e) {}
            showMainMenu();
          }
        }
      ]
    );
  }

  function showMainMenu(skipTyping = false) {
    const savedExam = getSavedExam();
    const examLabel = savedExam && savedExam !== 'General' ? ` (${savedExam})` : '';
    botSay(
      `<strong>What would you like to know${examLabel}?</strong> Tap an option below or type your question:`,
      [
        { label: 'Batches & fees', action: () => handleMenuChoice('Batches & fees') },
        { label: 'Meet our faculty', action: () => handleMenuChoice('Meet our faculty') },
        { label: 'Book a free demo', action: () => handleMenuChoice('Book a free demo') },
        { label: 'Why My JEE Mentor', action: () => handleMenuChoice('Why My JEE Mentor') },
        { label: 'Student reviews', action: () => handleMenuChoice('Student reviews') },
        { label: 'Free study resources', action: () => handleMenuChoice('Free study resources') },
        { label: 'Talk to a counselor', action: () => handleMenuChoice('Talk to a counselor') }
      ],
      skipTyping
    );
  }

  function handleMenuChoice(choice) {
    userSay(choice);
    switch (choice) {
      case 'Batches & fees': {
        const savedExam = getSavedExam();
        if (savedExam === 'NEET') showExamBatchesAndFees('NEET');
        else if (savedExam === 'Foundation') showFoundationInfo(getSavedClass());
        else if (savedExam === 'JEE') showExamBatchesAndFees('JEE');
        else {
          botSay('Which program batches would you like to see?', [
            { label: 'JEE Batches', action: () => showExamBatchesAndFees('JEE') },
            { label: 'NEET Batches', action: () => showExamBatchesAndFees('NEET') },
            { label: 'Foundation Classes', action: () => showFoundationInfo() }
          ]);
        }
        break;
      }
      case 'Meet our faculty':
        showFacultyInfo('faculty');
        break;
      case 'Book a free demo':
        startLeadFlow();
        break;
      case 'Why My JEE Mentor':
        showWhyUs();
        break;
      case 'Student reviews':
        showReviews();
        break;
      case 'Free study resources':
        showResources();
        break;
      case 'Talk to a counselor':
        showContact();
        break;
      default:
        handleUserQuery(choice);
    }
  }

  function getSavedExam() {
    try {
      const e = sessionStorage.getItem('ollie_exam');
      if (e) return e;
    } catch (err) {}
    const p = normalizePath(location.pathname);
    if (p === '/jee') return 'JEE';
    if (p === '/neet') return 'NEET';
    if (p === '/foundation') return 'Foundation';
    return '';
  }

  function getSavedClass() {
    try {
      const c = sessionStorage.getItem('ollie_class');
      if (c) return c;
    } catch (err) {}
    return '';
  }

  // ==========================================================================
  // 7. QUERY PROCESSOR & ACTIONS
  // ==========================================================================
  let lastViewedBatch = 'Not selected yet';

  function getSiteWhatsAppNumber() {
    try {
      const link = document.querySelector('a[href*="wa.me/"]');
      if (link && link.href) {
        const match = link.href.match(/wa\.me\/(\d+)/);
        if (match && match[1]) return match[1];
      }
    } catch (e) {}
    return '917304256203';
  }

  function getISTDateTime() {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date());
    } catch (e) {
      return new Date().toLocaleString('en-IN');
    }
  }

  function buildWhatsAppMessage({ name, phone, className, exam, interestedIn }) {
    const cleanName = String(name || '').replace(/[\r\n\t]/g, ' ').replace(/[<>{}[\]]/g, '').trim();
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    const cleanClass = String(className || '').replace(/[\r\n\t]/g, ' ').trim();
    const cleanCourse = String(exam || '').replace(/[\r\n\t]/g, ' ').trim();
    const cleanInterested = String(interestedIn || lastViewedBatch || 'Not selected yet').replace(/[\r\n\t]/g, ' ').trim();
    const pageUrl = window.location.href;
    const istTime = getISTDateTime();

    return `*🎓 Free Demo Request – My JEE Mentor*
━━━━━━━━━━━━━━
*Student Name:* ${cleanName}
*Phone:* ${cleanPhone}
*Class:* ${cleanClass}
*Course:* ${cleanCourse}
*Interested in:* ${cleanInterested}
*Page:* ${pageUrl}
*Time:* ${istTime}
━━━━━━━━━━━━━━
✅ I agree to be contacted by My JEE Mentor about this free demo.`;
  }

  // Path Normalisation: strips origin, query, hash, trailing slash, .html suffix, lowercase
  function normalizePath(raw) {
    if (!raw) return '/';
    let p = String(raw).trim();
    try {
      if (p.startsWith('http://') || p.startsWith('https://')) {
        p = new URL(p).pathname;
      }
    } catch (e) {}
    p = p.split('#')[0].split('?')[0].toLowerCase();
    if (p.length > 1 && p.endsWith('/')) {
      p = p.slice(0, -1);
    }
    if (p.endsWith('.html')) {
      p = p.slice(0, -5);
    }
    if (p === '/index') p = '/';
    return p || '/';
  }

  // Hard loop guard: at most 1 programmatic navigation per user action, at most 3 per minute
  function checkNavRateLimit() {
    let list = [];
    try {
      const stored = sessionStorage.getItem('ollie_nav_guard');
      if (stored) list = JSON.parse(stored);
    } catch (e) {}
    const now = Date.now();
    list = (Array.isArray(list) ? list : []).filter(ts => typeof ts === 'number' && now - ts < 60000);
    if (list.length >= 3) return false;
    list.push(now);
    try {
      sessionStorage.setItem('ollie_nav_guard', JSON.stringify(list));
    } catch (e) {}
    return true;
  }

  function setPendingAction(actionData) {
    try {
      sessionStorage.setItem('ollie_pending_action', JSON.stringify({
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        intent: actionData.intent || '',
        exam: actionData.exam || '',
        cls: actionData.cls || '',
        target: actionData.target || '',
        createdAt: Date.now(),
        attempts: 1
      }));
    } catch (e) {}
  }

  function pollAndScroll(selector, onFound, onTimeout) {
    const start = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        pulseElement(el);
        if (typeof onFound === 'function') onFound(el);
        return;
      }
      if (Date.now() - start >= 5000) {
        clearInterval(interval);
        if (typeof onTimeout === 'function') onTimeout();
      }
    }, 100);
  }

  function safeNavigate(targetUrl, pendingData, pageTitle = 'Page') {
    const currentNorm = normalizePath(location.pathname);
    const targetNorm = normalizePath(targetUrl);

    if (currentNorm === targetNorm) {
      executeActionLocally(pendingData);
      return;
    }

    if (!checkNavRateLimit()) {
      if (isDebug) {
        console.warn('⚠️ [Ollie Navigation Guard]: Blocked programmatic navigation to', targetUrl, '- rate limit exceeded (max 3/min).');
      }
      botSay(
        `Please tap the link below to continue to <strong>${pageTitle}</strong>:`,
        [
          {
            label: `Go to ${pageTitle} →`,
            action: () => location.assign(targetUrl)
          }
        ]
      );
      return;
    }

    setPendingAction({ ...pendingData, target: targetUrl });
    botSay(`Taking you to our <strong>${pageTitle}</strong> page...`, [], true);
    setTimeout(() => {
      location.assign(targetUrl);
    }, 200);
  }

  function handleUserQuery(query) {
    if (!query) return;
    userSay(query);

    const { intent, cls } = detectQueryIntent(query);
    if (isDebug) {
      console.log(`🦉 [Ollie Intent Matcher]: Query "${query}" matched intent "${intent}"`);
    }

    answeredCount++;

    switch (intent) {
      case 'jee_fees':
      case 'jee_info':
        showExamBatchesAndFees('JEE');
        break;

      case 'neet_fees':
      case 'neet_info':
        showExamBatchesAndFees('NEET');
        break;

      case 'foundation_fees':
      case 'foundation_info':
        showFoundationInfo(cls);
        break;

      case 'fees_general': {
        const curExam = getSavedExam();
        if (location.pathname.includes('jee') || curExam === 'JEE') {
          showExamBatchesAndFees('JEE');
        } else if (location.pathname.includes('neet') || curExam === 'NEET') {
          showExamBatchesAndFees('NEET');
        } else if (location.pathname.includes('foundation') || curExam === 'Foundation') {
          showFoundationInfo(cls);
        } else {
          botSay('Which course fees would you like to see?', [
            { label: 'JEE Fees', action: () => showExamBatchesAndFees('JEE') },
            { label: 'NEET Fees', action: () => showExamBatchesAndFees('NEET') },
            { label: 'Foundation Fees', action: () => showFoundationInfo() }
          ]);
        }
        break;
      }

      case 'batch_booster':
      case 'batch_ranker':
      case 'batch_premium':
      case 'batch_personal_mentorship':
      case 'batch_one_to_one':
        showSpecificBatch(intent);
        break;

      case 'faculty':
      case 'teacher_ayushi':
      case 'teacher_anil':
      case 'teacher_lokesh':
      case 'teacher_soujanya':
      case 'teacher_shubham':
        showFacultyInfo(intent);
        break;

      case 'lead_flow':
        startLeadFlow();
        break;

      case 'reviews':
        showReviews();
        break;

      case 'resources':
        showResources();
        break;

      case 'contact':
        showContact();
        break;

      case 'why_us':
        showWhyUs();
        break;

      case 'careers':
        showCareers();
        break;

      case 'portals':
        showPortals();
        break;

      default: {
        consecutiveMisses++;
        triggerConfusedReaction();

        if (consecutiveMisses >= 2) {
          botSay(
            `I'm still learning! Would you like to speak directly with our academic team in Navi Mumbai?`,
            [
              { label: '📞 Call Counselor', action: () => location.assign('tel:+917304256203') },
              { label: '💬 WhatsApp Us', action: () => window.open(`https://wa.me/${getSiteWhatsAppNumber()}`, '_blank') },
              { label: 'Book a free demo', action: () => startLeadFlow() }
            ]
          );
        } else {
          botSay(
            `Hmm, I didn’t quite get that. Try asking one of these:`,
            [
              { label: 'Batches & fees', action: () => handleMenuChoice('Batches & fees') },
              { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') },
              { label: 'Book a free demo', action: () => startLeadFlow() },
              { label: 'Talk to a counselor', action: () => showContact() }
            ]
          );
        }
        break;
      }
    }

    checkNaturalLeadOffer();
  }

  function triggerConfusedReaction() {
    if (!owlEl) return;
    owlEl.classList.remove('ollie-confused');
    void owlEl.offsetWidth;
    owlEl.classList.add('ollie-confused');
    setTimeout(() => owlEl.classList.remove('ollie-confused'), 1000);
  }

  function checkNaturalLeadOffer() {
    let offered = false;
    try { offered = sessionStorage.getItem('ollie_demo_offered') === 'true'; } catch (e) {}
    if (!offered && answeredCount >= 2) {
      try { sessionStorage.setItem('ollie_demo_offered', 'true'); } catch (e) {}
      setTimeout(() => {
        if (!isPanelOpen) return;
        botSay(
          `Tip: You can experience our teaching first-hand with a <strong>Free 1-on-1 Demo Session</strong>. Would you like to book one?`,
          [
            { label: 'Book a free demo', action: () => startLeadFlow() },
            { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') }
          ]
        );
      }, 1500);
    }
  }

  // Feature Actions
  function showExamBatchesAndFees(exam) {
    const isJee = (exam || '').toUpperCase() === 'JEE';
    const targetUrl = isJee ? '/jee.html' : '/neet.html';
    const targetNorm = normalizePath(targetUrl);
    const currentNorm = normalizePath(location.pathname);

    lastViewedBatch = `${exam} Mentorship Batch`;

    if (currentNorm === targetNorm) {
      executeActionLocally({ intent: isJee ? 'jee_fees' : 'neet_fees', exam });
      return;
    }

    safeNavigate(targetUrl, { intent: isJee ? 'jee_fees' : 'neet_fees', exam }, `${exam} Coaching`);
  }

  function showFoundationInfo(specificClass = null) {
    const targetUrl = '/foundation.html';
    const targetNorm = normalizePath(targetUrl);
    const currentNorm = normalizePath(location.pathname);

    lastViewedBatch = specificClass ? `Foundation Class ${specificClass}` : 'Foundation Batch';

    if (currentNorm === targetNorm) {
      executeActionLocally({ intent: 'foundation_info', cls: specificClass });
      return;
    }

    safeNavigate(targetUrl, { intent: 'foundation_info', cls: specificClass }, 'Foundation Program');
  }

  function showSpecificBatch(intent) {
    const slugMap = {
      batch_booster: { name: 'Booster Batch', selector: '.program-mentorship, .program-booster' },
      batch_ranker: { name: 'Ranker Batch', selector: '.program-ranker' },
      batch_premium: { name: 'Premium Batch', selector: '.program-one-to-one, .program-premium' },
      batch_personal_mentorship: { name: 'Personal Mentorship Batch', selector: '.program-mentorship' },
      batch_one_to_one: { name: 'One to One Program', selector: '.program-one-to-one' }
    };
    const info = slugMap[intent];
    if (!info) return;

    lastViewedBatch = info.name;
    const el = document.querySelector(info.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulseElement(el);
      const feeMatch = el.textContent.match(/₹\s*[\d,]+(?:\s*\/\s*(?:month|mo))?/i);
      const fee = feeMatch ? feeMatch[0] : 'Talk to counselor';
      botSay(`Here is the <strong>${info.name}</strong> (Fee: ${fee}). We offer personal 1:1 guidance in small batches of max 10.`, [
        { label: 'Book a free demo', action: () => startLeadFlow() },
        { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') },
        { label: 'Batches & fees', action: () => showExamBatchesAndFees('JEE') }
      ]);
    } else {
      safeNavigate('/jee.html', { intent }, info.name);
    }
  }

  function showFacultyInfo(intent) {
    lastViewedBatch = 'Our Faculty';
    const targetUrl = '/faculty.html';
    const currentNorm = normalizePath(location.pathname);
    const targetNorm = normalizePath(targetUrl);

    const existingSection = document.querySelector('.mjm-faculty-section, #faculty-section, #foundation-faculty-mount');
    if (currentNorm === targetNorm || existingSection) {
      executeActionLocally({ intent: 'faculty', teacher: intent });
      return;
    }

    safeNavigate(targetUrl, { intent: 'faculty', teacher: intent }, 'Our Faculty');
  }

  function showReviews() {
    const targetUrl = '/reviews.html';
    const currentNorm = normalizePath(location.pathname);
    const targetNorm = normalizePath(targetUrl);

    const revSec = document.querySelector('.mjm-reviews-section, .mjm-reviews-header');
    if (currentNorm === targetNorm || currentNorm === '/studentreview' || revSec) {
      executeActionLocally({ intent: 'reviews' });
      return;
    }

    safeNavigate(targetUrl, { intent: 'reviews' }, 'Student Reviews');
  }

  function showResources() {
    const targetUrl = '/freeresource.html';
    const currentNorm = normalizePath(location.pathname);
    const targetNorm = normalizePath(targetUrl);

    if (currentNorm === targetNorm || currentNorm === '/resources') {
      executeActionLocally({ intent: 'resources' });
      return;
    }

    safeNavigate(targetUrl, { intent: 'resources' }, 'Free Study Resources');
  }

  function showContact() {
    const wa = getSiteWhatsAppNumber();
    botSay(
      `<strong>Contact My JEE Mentor</strong><br>
       📍 Location: Navi Mumbai, India<br>
       📞 Phone: <a href="tel:+917304256203">${PHONE_NUMBER}</a><br>
       💬 WhatsApp: <a href="https://wa.me/${wa}" target="_blank">+91 73042 56203</a><br>
       Our counseling team is available Monday to Sunday.`,
      [
        { label: 'Book a free demo', action: () => startLeadFlow() },
        { label: 'Batches & fees', action: () => showExamBatchesAndFees('JEE') },
        { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') }
      ]
    );
  }

  function showWhyUs() {
    botSay(
      `<strong>Why My JEE Mentor?</strong><br>
       1. Strictly max 10 students per batch.<br>
       2. Dedicated personal mentor assigned from day one.<br>
       3. Daily DPPs, 24/7 doubt resolution, and weekly progress check-ins.<br>
       4. Highly affordable subject-wise learning.`,
      [
        { label: 'Batches & fees', action: () => showExamBatchesAndFees('JEE') },
        { label: 'Book a free demo', action: () => startLeadFlow() },
        { label: 'Talk to a counselor', action: () => showContact() }
      ]
    );
  }

  function showCareers() {
    const targetUrl = '/career.html';
    const currentNorm = normalizePath(location.pathname);
    const targetNorm = normalizePath(targetUrl);

    if (currentNorm === targetNorm) {
      executeActionLocally({ intent: 'careers' });
      return;
    }

    safeNavigate(targetUrl, { intent: 'careers' }, 'Careers');
  }

  function showPortals() {
    botSay(
      `Existing students can sign in directly to their classroom or test portal:`,
      [
        { label: 'Open My Classroom ↗', action: () => window.open('https://myclassroom.myjeementor.com/', '_blank') },
        { label: 'Open Test Portal ↗', action: () => location.assign('/test.html') }
      ]
    );
  }

  // Local Action Executor: NEVER NAVIGATES. Only scrolls, pulses, and outputs live DOM data.
  function executeActionLocally(action) {
    if (!action || !action.intent) return;

    switch (action.intent) {
      case 'faculty': {
        const selector = '.mjm-faculty-section, #faculty-section, .faculty-grid, .page-hero';
        pollAndScroll(selector, () => {
          const liveFaculty = getLiveFaculty();
          if (liveFaculty.length > 0) {
            let html = `<strong>Meet Our Faculty Mentors:</strong><div class="ollie-batch-list">`;
            liveFaculty.forEach(f => {
              html += `
                <div class="ollie-batch-item">
                  <div class="ollie-batch-name-row">
                    <span class="ollie-batch-name">${f.name}</span>
                    <span class="ollie-batch-fee-badge" style="background:rgba(20,33,61,0.08);color:var(--ollie-ink);">${f.tag || 'Mentor'}</span>
                  </div>
                  ${f.degree ? `<span class="ollie-batch-desc">${f.degree}</span>` : ''}
                </div>
              `;
            });
            html += `</div>`;
            botSay(html, [
              { label: 'Book a free demo', action: () => startLeadFlow() },
              { label: 'Batches & fees', action: () => showExamBatchesAndFees('JEE') },
              { label: 'Student reviews', action: () => showReviews() }
            ]);
          } else {
            botSay('Here is our verified faculty team. Each mentor conducts small batches of max 10 students.', [
              { label: 'Book a free demo', action: () => startLeadFlow() },
              { label: 'Batches & fees', action: () => showExamBatchesAndFees('JEE') }
            ]);
          }
        }, () => {
          botSay('Our faculty section is available on our Faculty page:', [
            { label: 'Open Faculty Page →', action: () => location.assign('/faculty.html') },
            { label: 'Book a free demo', action: () => startLeadFlow() }
          ]);
        });
        break;
      }

      case 'jee_fees':
      case 'neet_fees': {
        const exam = action.exam || (action.intent === 'jee_fees' ? 'JEE' : 'NEET');
        const selector = '.resource-grid, .program-card, .mjm-cards, .page-hero';
        pollAndScroll(selector, () => {
          const liveBatches = getLiveBatches(exam);
          if (liveBatches.length > 0) {
            let html = `<strong>${exam} Batches & Live Fees:</strong><div class="ollie-batch-list">`;
            liveBatches.forEach(b => {
              const feeLine = b.fee ? `<span class="ollie-batch-fee-badge">${b.fee}</span>` : '';
              const descLine = b.details.slice(0, 2).join(' • ');
              html += `
                <div class="ollie-batch-item">
                  <div class="ollie-batch-name-row">
                    <span class="ollie-batch-name">${b.name}</span>
                    ${feeLine}
                  </div>
                  ${descLine ? `<span class="ollie-batch-desc">${descLine}</span>` : ''}
                </div>
              `;
            });
            html += `</div>`;
            botSay(html, [
              { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') },
              { label: 'Book a free demo', action: () => startLeadFlow() },
              { label: 'See another course', action: () => showMainMenu() }
            ]);
          } else {
            botSay(`All ${exam} programs feature max 10 students per batch and personalized 1:1 guidance.`, [
              { label: 'Book a free demo', action: () => startLeadFlow() },
              { label: 'Talk to a counselor', action: () => showContact() }
            ]);
          }
        }, () => {
          botSay(`Explore our full ${exam} batch lineup:`, [
            { label: `Open ${exam} Page →`, action: () => location.assign(exam === 'JEE' ? '/jee.html' : '/neet.html') },
            { label: 'Book a free demo', action: () => startLeadFlow() }
          ]);
        });
        break;
      }

      case 'foundation_info': {
        const selector = action.cls ? `.foundation-card-${action.cls}` : '.foundation-card-grid, .foundation-card, .page-hero';
        pollAndScroll(selector, () => {
          const liveBatches = getLiveBatches('Foundation');
          let html = `<strong>Foundation Courses (Classes 7–10):</strong><div class="ollie-batch-list">`;
          liveBatches.forEach(b => {
            const feeLine = b.fee ? `<span class="ollie-batch-fee-badge">${b.fee}</span>` : '';
            const descLine = b.details.slice(0, 2).join(' • ');
            html += `
              <div class="ollie-batch-item">
                <div class="ollie-batch-name-row">
                  <span class="ollie-batch-name">${b.name}</span>
                  ${feeLine}
                </div>
                ${descLine ? `<span class="ollie-batch-desc">${descLine}</span>` : ''}
              </div>
            `;
          });
          html += `</div>`;
          botSay(html, [
            { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') },
            { label: 'Book a free demo', action: () => startLeadFlow() },
            { label: 'See another course', action: () => showMainMenu() }
          ]);
        }, () => {
          botSay('Explore Foundation programs for Classes 7 to 10:', [
            { label: 'Open Foundation Page →', action: () => location.assign('/foundation.html') },
            { label: 'Book a free demo', action: () => startLeadFlow() }
          ]);
        });
        break;
      }

      case 'reviews': {
        const selector = '.mjm-reviews-section, .mjm-reviews-header, .page-hero';
        pollAndScroll(selector, () => {
          botSay('Here is what parents & students say about our small batches and real mentor attention:', [
            { label: 'Book a free demo', action: () => startLeadFlow() },
            { label: 'Batches & fees', action: () => showExamBatchesAndFees('JEE') },
            { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') }
          ]);
        }, () => {
          botSay('Explore our student & parent reviews:', [
            { label: 'Open Reviews Page →', action: () => location.assign('/reviews.html') },
            { label: 'Book a free demo', action: () => startLeadFlow() }
          ]);
        });
        break;
      }

      case 'resources': {
        const selector = '.container, .page-hero, h1';
        pollAndScroll(selector, () => {
          botSay('Welcome to our Free Learning Library! Access notes, formula sheets, and DPPs.', [
            { label: 'Batches & fees', action: () => showExamBatchesAndFees('JEE') },
            { label: 'Book a free demo', action: () => startLeadFlow() },
            { label: 'Talk to a counselor', action: () => showContact() }
          ]);
        }, () => {
          botSay('Free Resources library:', [
            { label: 'Open Free Resources →', action: () => location.assign('/freeresource.html') }
          ]);
        });
        break;
      }

      case 'careers': {
        botSay('We are always looking for passionate teachers and mentors. Check our open positions:', [
          { label: 'Open Careers Page →', action: () => location.assign('/career.html') }
        ]);
        break;
      }

      default: {
        showMainMenu(true);
      }
    }
  }

  // ==========================================================================
  // 8. IN-PANEL LEAD GENERATION FLOW (WhatsApp Direct + Background /api/leads)
  // ==========================================================================
  function startLeadFlow() {
    const savedExam = getSavedExam() || 'JEE';
    const savedClass = getSavedClass() || (savedExam === 'Foundation' ? '9' : '11');

    const formHtml = `
      <div class="ollie-lead-box">
        <h4>Book a Free 1-on-1 Demo</h4>
        <p>Enter details below to reserve your free counseling & demo session:</p>
        <form class="ollie-mini-form" id="ollie-lead-form" novalidate>
          <div class="ollie-field">
            <label>Student Name *</label>
            <input type="text" name="studentName" required minlength="2" maxlength="80" placeholder="e.g. Rahul Sharma" autocomplete="name">
          </div>
          <div class="ollie-field">
            <label>Parent or Student Phone (10 digits) *</label>
            <input type="tel" name="mobile" required pattern="[6-9][0-9]{9}" maxlength="14" placeholder="9876543210" inputmode="tel" autocomplete="tel">
          </div>
          <div class="ollie-two-col">
            <div class="ollie-field">
              <label>Class *</label>
              <select name="className" required>
                ${['7', '8', '9', '10', '11', '12', 'Dropper'].map(c => `<option value="${c}" ${c === String(savedClass) ? 'selected' : ''}>Class ${c}</option>`).join('')}
              </select>
            </div>
            <div class="ollie-field">
              <label>Course *</label>
              <select name="exam" required>
                ${['JEE', 'NEET', 'Foundation'].map(e => `<option value="${e}" ${e === savedExam ? 'selected' : ''}>${e}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="ollie-consent">
            <input type="checkbox" name="consent" id="ollie-consent" required checked>
            <label for="ollie-consent">I agree to be contacted by My JEE Mentor about this free demo (<a href="/privacy-policy.html" target="_blank">Privacy Policy</a>)</label>
          </div>
          <input type="text" name="website" style="display:none;" tabindex="-1" autocomplete="off">
          <div class="ollie-lead-actions">
            <button type="submit" class="ollie-lead-submit" id="ollie-lead-submit-btn">Book Demo & WhatsApp</button>
            <button type="button" class="ollie-lead-cancel" id="ollie-lead-cancel-btn">Not now</button>
          </div>
          <div class="ollie-form-status" id="ollie-lead-status" hidden></div>
        </form>
      </div>
    `;

    botSay(formHtml, [], true);

    const form = document.getElementById('ollie-lead-form');
    if (!form) return;

    document.getElementById('ollie-lead-cancel-btn').onclick = function () {
      form.closest('.ollie-msg')?.remove();
      botSay('No problem! Feel free to ask anytime.', [
        { label: 'Batches & fees', action: () => handleMenuChoice('Batches & fees') },
        { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') },
        { label: 'Free study resources', action: () => showResources() }
      ]);
    };

    form.onsubmit = function (e) {
      e.preventDefault();
      const statusEl = document.getElementById('ollie-lead-status');
      const submitBtn = document.getElementById('ollie-lead-submit-btn');

      // 1. Validation
      const studentName = form.studentName.value.trim().replace(/[\r\n\t]/g, ' ');
      let mobile = form.mobile.value.replace(/[^0-9]/g, '');
      if (mobile.length === 12 && mobile.startsWith('91')) mobile = mobile.slice(2);
      const className = form.className.value;
      const exam = form.exam.value;
      const consent = form.consent.checked;
      const honeypot = form.website.value.trim();

      if (honeypot) return;

      if (studentName.length < 2) {
        showStatus('Please enter student name (at least 2 letters).', true);
        return;
      }
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        showStatus('Please enter a valid 10-digit Indian phone number.', true);
        return;
      }
      if (!consent) {
        showStatus('Please check the consent box to proceed.', true);
        return;
      }

      // 30-Second Rate Limit Check
      let lastSubmit = 0;
      try { lastSubmit = Number(sessionStorage.getItem('ollie_last_submit')) || 0; } catch (err) {}
      if (Date.now() - lastSubmit < 30000) {
        showStatus('Please wait 30 seconds before submitting another request.', true);
        return;
      }

      function showStatus(text, isError) {
        if (!statusEl) return;
        statusEl.hidden = false;
        statusEl.className = 'ollie-form-status ' + (isError ? 'error' : 'success');
        statusEl.textContent = text;
      }

      try { sessionStorage.setItem('ollie_last_submit', String(Date.now())); } catch (err) {}

      const waNumber = getSiteWhatsAppNumber();
      const waMessage = buildWhatsAppMessage({
        name: studentName,
        phone: mobile,
        className,
        exam,
        interestedIn: lastViewedBatch
      });
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

      // 3. Dry-Run Mode (?ollie-test=1)
      if (isTestMode) {
        console.log('🦉 [Ollie Test Dry-Run Lead Payload]:', {
          studentName,
          mobile,
          className,
          exam,
          interestedIn: lastViewedBatch,
          page: location.href
        });
        console.log('🦉 [Ollie Test Dry-Run WhatsApp Message]:\n' + waMessage);
        finishLeadSuccess({ name: studentName, mobile, exam, cls: className, waUrl, isDryRun: true, apiSucceeded: true });
        return;
      }

      // 4. Synchronous WhatsApp Opening in Click Handler
      let popupOpened = false;
      try {
        const popup = window.open(waUrl, '_blank');
        if (popup && !popup.closed && typeof popup.closed !== 'undefined') {
          popupOpened = true;
        }
      } catch (err) {}

      if (!popupOpened && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        setTimeout(() => {
          location.assign(waUrl);
        }, 150);
      }

      // 5. In parallel, dispatch lead to backend
      submitBtn.disabled = true;
      submitBtn.textContent = 'Opening WhatsApp...';
      showStatus('Opening WhatsApp with your demo request...', false);

      const cleanName = studentName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'student';
      const payload = {
        studentName: studentName,
        parentName: studentName + ' (Parent)',
        email: `${cleanName}.${mobile.slice(-4)}@myjeementor.com`,
        mobile: mobile,
        whatsapp: mobile,
        className: className,
        exam: exam,
        city: 'Online Enquiry',
        message: `Free Demo Enquiry via Ollie. Interested in: ${lastViewedBatch}. Page: ${location.pathname}`
      };

      (async () => {
        let apiSucceeded = false;
        try {
          const csrfRes = await fetch('/api/csrf', { credentials: 'same-origin', cache: 'no-store' });
          const csrfData = await csrfRes.json().catch(() => ({}));
          if (csrfRes.ok && csrfData.token) {
            const res = await fetch('/api/leads', {
              method: 'POST',
              credentials: 'same-origin',
              headers: {
                'content-type': 'application/json',
                'x-csrf-token': csrfData.token
              },
              body: JSON.stringify(payload)
            });
            const resData = await res.json().catch(() => ({}));
            if (res.ok && resData.ok) {
              apiSucceeded = true;
            }
          }
        } catch (e) {
          apiSucceeded = false;
        }

        finishLeadSuccess({
          name: studentName,
          mobile,
          exam,
          cls: className,
          waUrl,
          isDryRun: false,
          apiSucceeded
        });
      })();
    };
  }

  function finishLeadSuccess({ name, mobile, exam, cls, waUrl, isDryRun, apiSucceeded }) {
    const formBox = document.getElementById('ollie-lead-form');
    if (formBox) {
      const msgParent = formBox.closest('.ollie-msg');
      if (msgParent) msgParent.remove();
    }

    let successHtml = '';
    if (isDryRun) {
      successHtml = `<strong>[Test Mode] Demo Request Preview:</strong><br>
        Thank you <strong>${name}</strong>! Your demo request for <strong>${exam} (Class ${cls})</strong> is previewed.<br>
        WhatsApp message was logged to the console.<br>
        <a class="ollie-wa-btn" href="${waUrl}" target="_blank">💬 Open WhatsApp Preview</a>`;
    } else if (apiSucceeded) {
      successHtml = `<strong>Almost done!</strong> Thank you <strong>${name}</strong>.<br>
        Press <strong>Send</strong> in WhatsApp and our counselor will confirm your free 1-on-1 demo for <strong>${exam} (Class ${cls})</strong>.<br>
        <a class="ollie-wa-btn" href="${waUrl}" target="_blank">💬 Open WhatsApp Again</a>`;
    } else {
      successHtml = `<strong>Almost done!</strong><br>
        Opened WhatsApp - please press <strong>Send</strong> to complete your request for <strong>${exam} (Class ${cls})</strong>.<br>
        <a class="ollie-wa-btn" href="${waUrl}" target="_blank">💬 Open WhatsApp Again</a>
        <a class="ollie-chip-btn" href="tel:+917304256203" style="display:inline-flex;margin-top:6px;">📞 Call Counselor</a>`;
    }

    botSay(successHtml, [
      { label: 'Batches & fees', action: () => handleMenuChoice('Batches & fees') },
      { label: 'Meet our faculty', action: () => showFacultyInfo('faculty') },
      { label: 'Free study resources', action: () => showResources() }
    ]);
  }

  // ==========================================================================
  // 9. PERSONALIZED 4-STOP TOUR ("Show me around")
  // ==========================================================================
  function startPersonalizedTour() {
    isTour = true;
    collapseAskPanel();

    const exam = sessionStorage.getItem('ollie_exam') || 'JEE';
    const cls = sessionStorage.getItem('ollie_class') || '11';

    // Stop 1: Batches
    sayMessage(`Stop 1 of 4: Here are our ${exam} batches with max 10 students and personalized mentoring.`);
    let target = document.querySelector('.program-card, .foundation-card, .mjm-card');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulseElement(target);
    }

    // Stop 2: Faculty (after 4.5s)
    tourTimer = setTimeout(() => {
      if (!isTour) return;
      sayMessage(`Stop 2 of 4: Learn from premier faculty mentors with proven rank-level results.`);
      const fac = document.querySelector('.mjm-faculty-header, .faculty-card');
      if (fac) {
        fac.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pulseElement(fac);
      }

      // Stop 3: Reviews (after 4.5s)
      tourTimer = setTimeout(() => {
        if (!isTour) return;
        sayMessage(`Stop 3 of 4: Real feedback from parents and students on how small batches made the difference.`);
        const rev = document.querySelector('.mjm-reviews-header, .mjm-review-card');
        if (rev) {
          rev.scrollIntoView({ behavior: 'smooth', block: 'center' });
          pulseElement(rev);
        }

        // Stop 4: Free Demo
        tourTimer = setTimeout(() => {
          if (!isTour) return;
          stopTour();
          sayMessage(`Stop 4 of 4: Ready to try a class? Opening the free demo booking session for you!`);
          openAskPanel();
          startLeadFlow();
        }, 4800);
      }, 4800);
    }, 4800);
  }

  function stopTour() {
    isTour = false;
    clearTimeout(tourTimer);
  }

  // ==========================================================================
  // 10. PLACEMENT & COLLISION ENGINE
  // ==========================================================================
  function pulseElement(el) {
    if (highlightedEl) highlightedEl.classList.remove('ollie-hl');
    highlightedEl = el;
    if (highlightedEl) {
      highlightedEl.classList.remove('ollie-hl');
      void highlightedEl.offsetWidth;
      highlightedEl.classList.add('ollie-hl');
    }
  }

  function calculatePlacement(activeBlock) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 640;

    const headerEl = document.querySelector('header.site-header');
    const headerBottom = headerEl ? Math.max(0, headerEl.getBoundingClientRect().bottom) : 0;
    const topSafeLimit = headerBottom + 10;

    const mobileBarEl = document.querySelector('.mobile-bar');
    const mobileBarVisible = mobileBarEl && window.getComputedStyle(mobileBarEl).display !== 'none';
    const mobileBarRect = mobileBarVisible ? mobileBarEl.getBoundingClientRect() : null;

    let bottomSafeLimit = vh - 12;
    if (mobileBarRect && mobileBarRect.top > 0) {
      bottomSafeLimit = Math.min(bottomSafeLimit, mobileBarRect.top - 8);
    }

    const owlW = isMobile ? 68 : 84;
    const owlH = isMobile ? 78 : 96;
    const bubW = bubEl.offsetWidth || (isMobile ? Math.min(300, vw - 24) : 310);
    const bubH = bubEl.offsetHeight || 108;

    const bRect = activeBlock.getBoundingClientRect();

    function overlapsBlock(x, y, w, h) {
      return !(x + w <= bRect.left || x >= bRect.right || y + h <= bRect.top || y >= bRect.bottom);
    }

    // 1. ABOVE
    const bubYAbove = bRect.top - bubH - 12;
    const owlYAbove = bRect.top - owlH + 14;
    const fitsAbove = (bubYAbove >= topSafeLimit) && (owlYAbove >= topSafeLimit) && (bRect.top <= vh - 40);

    if (fitsAbove) {
      let bubX = Math.max(12, Math.min(vw - bubW - 14, bRect.left + 20));
      let owlX = Math.max(8, Math.min(vw - owlW - 8, bRect.left - (isMobile ? 12 : 24)));
      if (!overlapsBlock(bubX, bubYAbove, bubW, bubH)) {
        return { owlX: Math.round(owlX), owlY: Math.round(owlYAbove), bubX: Math.round(bubX), bubY: Math.round(bubYAbove) };
      }
    }

    // 2. BELOW
    const bubYBelow = bRect.bottom + 12;
    const owlYBelow = bRect.bottom - 12;
    const fitsBelow = (bubYBelow + bubH <= bottomSafeLimit) && (bRect.bottom >= topSafeLimit);

    if (fitsBelow) {
      let bubX = Math.max(12, Math.min(vw - bubW - 14, bRect.left + 20));
      let owlX = Math.max(8, Math.min(vw - owlW - 8, bRect.left - (isMobile ? 12 : 24)));
      if (!overlapsBlock(bubX, bubYBelow, bubW, bubH)) {
        return { owlX: Math.round(owlX), owlY: Math.round(owlYBelow), bubX: Math.round(bubX), bubY: Math.round(bubYBelow) };
      }
    }

    // 3. FIXED BOTTOM-CENTER
    let fixedBubX, fixedBubY, fixedOwlX, fixedOwlY;
    if (isMobile) {
      fixedBubX = 12;
      fixedBubY = Math.max(topSafeLimit + 10, bottomSafeLimit - bubH - 4);
      fixedOwlX = 14;
      fixedOwlY = fixedBubY - owlH + 18;
    } else {
      fixedBubX = Math.round(Math.max(12, (vw - bubW) / 2));
      fixedBubY = Math.round(Math.max(topSafeLimit + 10, bottomSafeLimit - bubH - 10));
      fixedOwlX = Math.max(8, fixedBubX - owlW + 16);
      fixedOwlY = Math.round(fixedBubY + (bubH - owlH) / 2);
    }

    return { owlX: fixedOwlX, owlY: fixedOwlY, bubX: fixedBubX, bubY: fixedBubY };
  }

  function placeOllieAndBubble() {
    if (!owlEl || !bubEl) return;
    if (isPanelOpen) {
      dockOwlOnPanel();
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 640;

    let targetX, targetY, bubX, bubY;

    if (isHidden) {
      owlEl.classList.add('ollie-docked');
      targetX = vw - 86;
      targetY = isMobile ? vh - 146 : vh - 100;
      bubEl.hidden = true;
    } else {
      owlEl.classList.remove('ollie-docked');
      bubEl.hidden = false;

      let activeBlock = null;
      let targetEl = null;

      if (modalActive) {
        activeBlock = document.querySelector('#book-demo .booking-dialog') || document.querySelector('#book-demo');
        targetEl = document.querySelector('#booking-form button[type="submit"]') || activeBlock;
      } else if (currentStepIdx >= 0 && currentStepIdx < activeSteps.length) {
        activeBlock = activeSteps[currentStepIdx].secEl;
        targetEl = activeSteps[currentStepIdx].targetEl;
      }

      if (!activeBlock) {
        targetX = vw - 96;
        targetY = vh - 120;
        bubX = vw - 340;
        bubY = vh - 220;
      } else {
        // Auto-collapse check: If activeBlock would overlap the Ask panel, collapse it!
        if (panelEl && !panelEl.hidden) {
          const bRect = activeBlock.getBoundingClientRect();
          const pRect = panelEl.getBoundingClientRect();
          const wouldOverlap = !(bRect.right < pRect.left || bRect.left > pRect.right || bRect.bottom < pRect.top || bRect.top > pRect.bottom);
          if (wouldOverlap) {
            collapseAskPanel();
          }
        }

        const coords = calculatePlacement(activeBlock);
        targetX = coords.owlX;
        targetY = coords.owlY;
        bubX = coords.bubX;
        bubY = coords.bubY;
      }

      bubEl.style.transform = `translate(${bubX}px, ${bubY}px)`;
    }

    owlEl.classList.add('ollie-fly');
    clearTimeout(flyTimer);
    flyTimer = setTimeout(() => owlEl.classList.remove('ollie-fly'), 800);

    owlEl.style.transform = `translate(${targetX}px, ${targetY}px)`;
  }

  function sayMessage(text) {
    if (!txtEl) return;
    txtEl.innerHTML = text;
    txtEl.classList.remove('ollie-pop');
    void txtEl.offsetWidth;
    txtEl.classList.add('ollie-pop');
  }

  function activateStep(index) {
    if (index < 0 || index >= activeSteps.length) return;
    if (isTyping || isPanelOpen) return; // Pause narration while user is interacting with panel

    currentStepIdx = index;
    const step = activeSteps[index];

    sayMessage(step.text);
    pulseElement(step.targetEl || step.secEl);
    placeOllieAndBubble();
  }

  // ==========================================================================
  // 11. SCROLL & HOVER LISTENERS
  // ==========================================================================
  function pickSectionByScroll() {
    if (isHidden || isTour || modalActive || isTyping || isPanelOpen || activeSteps.length === 0) return;

    const line = window.innerHeight * 0.45;
    for (let i = 0; i < activeSteps.length; i++) {
      const step = activeSteps[i];
      const el = step.secEl || step.targetEl;
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      if (rect.top <= line && rect.bottom >= line) {
        if (i !== currentStepIdx) {
          activateStep(i);
        } else {
          placeOllieAndBubble();
        }
        return;
      }
    }
    placeOllieAndBubble();
  }

  function onScrollHandler() {
    if (isTick) return;
    isTick = true;
    requestAnimationFrame(() => {
      isTick = false;
      if (isHidden || isPanelOpen || isTyping) return;
      if (!isTour) {
        pickSectionByScroll();
      } else {
        placeOllieAndBubble();
      }
    });
  }

  // Attach Desktop Hover Chip & Mobile Tap
  let hoverTimer = null;
  function bindCardInteractions() {
    document.querySelectorAll('.program-card, .foundation-card, .mjm-card, .faculty-card').forEach(card => {
      if (card.dataset.ollieBound) return;
      card.dataset.ollieBound = 'true';

      // Desktop: 150ms debounced hover shows compact chip
      card.addEventListener('mouseenter', function () {
        if (!isDesktopDevice() || isTour || modalActive || isHidden || isPanelOpen) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          // Extract title & fee
          const title = card.querySelector('h3, .program-title-row, .mjm-title, .faculty-name')?.textContent.trim() || 'Course';
          const feeMatch = card.textContent.match(/₹\s*[\d,]+(?:\s*\/\s*(?:month|mo))?/i);
          const fee = feeMatch ? feeMatch[0] : '';
          const detail = card.querySelector('ul li, .mjm-points span, .foundation-subject, .faculty-tag')?.textContent.replace(/[✔✓]/g, '').trim() || '';

          const chipHtml = `
            <div class="ollie-hover-chip">
              <div class="ollie-chip-title-row">
                <span class="ollie-chip-name">${title}</span>
                ${fee ? `<span class="ollie-chip-fee">${fee}</span>` : ''}
              </div>
              ${detail ? `<span class="ollie-chip-detail">${detail}</span>` : ''}
            </div>
          `;
          sayMessage(chipHtml);

          const cta = card.querySelector('.program-cta, .foundation-card-cta, .mjm-btn, .btn');
          pulseElement(cta || card);

          const coords = calculatePlacement(card);
          owlEl.style.transform = `translate(${coords.owlX}px, ${coords.owlY}px)`;
          bubEl.style.transform = `translate(${coords.bubX}px, ${coords.bubY}px)`;
        }, 150);
      }, { passive: true });

      card.addEventListener('mouseleave', function () {
        if (isDesktopDevice()) clearTimeout(hoverTimer);
      }, { passive: true });

      // Mobile Tap jumps to card
      card.addEventListener('click', function (e) {
        if (isDesktopDevice() || isTour || modalActive || isHidden || isPanelOpen) return;
        if (e.target.closest('a, button')) return; // Let links fire naturally
        const cta = card.querySelector('.program-cta, .foundation-card-cta, .mjm-btn, .btn');
        pulseElement(cta || card);
      }, { passive: true });
    });
  }

  // ==========================================================================
  // 12. DYNAMIC SCANNER & MUTATIONOBSERVER
  // ==========================================================================
  function scanAndResolveSteps() {
    const currentPath = location.pathname || '/';
    const resolved = [];

    PASSIVE_NUDGES.forEach(nudge => {
      if (nudge.page !== '*' && nudge.page !== currentPath) return;
      const secEl = document.querySelector(nudge.section);
      if (!secEl) return;
      const targetEl = nudge.target ? (secEl.matches(nudge.target) ? secEl : secEl.querySelector(nudge.target)) : secEl;
      resolved.push({ ...nudge, secEl, targetEl: targetEl || secEl });
    });

    resolved.sort((a, b) => {
      if (a.secEl === b.secEl) return 0;
      return a.secEl.compareDocumentPosition(b.secEl) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    activeSteps = resolved;
    bindCardInteractions();

    // Debugging summary
    if (isDebug) {
      console.group('🦉 [Ollie Debugger - Live Extraction & State]');
      console.log('Courses in Navigation:', getLiveCourses());
      console.log('Live Extracted Batches:', getLiveBatches());
      console.log('Live Extracted Faculty:', getLiveFaculty());
      console.log('Resolved Passive Nudges:', activeSteps.length);
      console.groupEnd();
    }

    if (currentStepIdx < 0 && activeSteps.length > 0) {
      pickSectionByScroll();
    } else {
      placeOllieAndBubble();
    }
  }

  // Cross-page action consumer: consumed BEFORE any execution, 20s expiration, single-attempt guard
  function handlePendingCrossPageAction() {
    let pending = null;
    try {
      const stored = sessionStorage.getItem('ollie_pending_action');
      if (stored) {
        // CONSUME IMMEDIATELY BEFORE ANY OTHER LOGIC
        sessionStorage.removeItem('ollie_pending_action');
        pending = JSON.parse(stored);
      }
    } catch (e) {}

    if (!pending) return;

    // Expire after 20 seconds
    const createdAt = pending.createdAt || pending.timestamp || 0;
    if (Date.now() - createdAt > 20000) {
      if (isDebug) console.warn('⚠️ [Ollie Pending Action]: Discarded expired action', pending);
      return;
    }

    // Hard single-attempt guard: only use once
    if (pending.attempts > 1) return;

    // Open panel (without repeating greeting)
    openAskPanel(true);

    // Execute locally on this page (never re-navigates)
    setTimeout(() => {
      executeActionLocally(pending);
    }, 250);
  }

  function hideGuide() {
    isHidden = true;
    try { sessionStorage.setItem('ollie-hidden', 'true'); } catch (e) {}
    if (highlightedEl) highlightedEl.classList.remove('ollie-hl');
    stopTour();
    collapseAskPanel();
    placeOllieAndBubble();
  }

  function showGuide() {
    isHidden = false;
    try { sessionStorage.setItem('ollie-hidden', 'false'); } catch (e) {}
    bubEl.hidden = false;
    collapsedBarEl.hidden = false;
    placeOllieAndBubble();
    pickSectionByScroll();
  }

  // ==========================================================================
  // 13. INITIALIZATION
  // ==========================================================================
  let rescanDebounce = null;
  function triggerRescan() {
    clearTimeout(rescanDebounce);
    rescanDebounce = setTimeout(() => {
      scanAndResolveSteps();
      placeOllieAndBubble();
    }, 200); // Debounced 200ms
  }

  function initOllie() {
    createOllieUI();
    scanAndResolveSteps();
    setupVisualViewport();

    window.addEventListener('scroll', onScrollHandler, { passive: true });
    window.addEventListener('resize', () => placeOllieAndBubble(), { passive: true });

    ['wheel', 'touchstart', 'keydown'].forEach(evt => {
      window.addEventListener(evt, () => {
        if (isTour) stopTour();
      }, { passive: true });
    });

    // MutationObserver only rescans steps and repositions owl; NEVER navigates
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        const t = m.target;
        if (!t) continue;
        if (t.id === 'ollie-owl' || t.id === 'ollie-bub' || t.id === 'ollie-panel' || t.id === 'ollie-collapsed-bar') continue;
        if (t.closest && t.closest('#ollie-panel, #ollie-owl, #ollie-bub, #ollie-collapsed-bar, .ollie-hover-chip')) continue;
        triggerRescan();
        break;
      }
    });

    const rootTarget = document.getElementById('app') || document.body;
    observer.observe(rootTarget, { childList: true, subtree: true });

    // Consume pending action once upon page load
    setTimeout(() => {
      handlePendingCrossPageAction();
    }, 180);

    setTimeout(() => {
      if (!isHidden && !isPanelOpen) {
        activateStep(0);
      }
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOllie);
  } else {
    initOllie();
  }
})();
