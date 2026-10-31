/**
 * ============================================================================
 * Ollie the Owl - Interactive Website Guide
 * My JEE Mentor (JEE, NEET & Foundation)
 *
 * Core Features & Behaviors:
 * 1. Exact SVG, flying / wing-flap / bob / jump animations, and tour behavior.
 * 2. CARD_DATA config: maps real card data (name, fee, details, cta) with natural speech.
 * 3. Responsive interaction modes (via matchMedia '(hover: hover) and (pointer: fine)'):
 *    - Desktop: Hover is king with 150ms debounce, immediate jump, and 10s auto-hop pause.
 *    - Mobile/Touch: Scroll-driven (45% viewport line) and tap-driven with 10s pause.
 * 4. Precise 3-tier placement: ABOVE block -> BELOW block -> FIXED BOTTOM-CENTER.
 *    - Zero overlap with card contents, sticky header, or .mobile-bar.
 * 5. Dynamic MutationObserver and route exclusion on fees, login, test, classroom.
 * ============================================================================
 */

(function () {
  'use strict';

  // 1. ROUTE EXCLUSION GUARD
  // Exclude Ollie completely on fees, login, test, and classroom routes.
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

  const isDebug = new URLSearchParams(location.search).get('ollie-debug') === '1';

  // ==========================================================================
  // CONFIGURATION: CARD_DATA
  // Real site information: verified names, course details, real fees, & CTAs.
  // ==========================================================================
  const CARD_DATA = [
    // --- HOME COURSE CARDS ---
    {
      selector: '.mjm-card.jee',
      name: 'JEE 2026-27',
      fee: 'Fee: talk to our counselor',
      details: [
        'Max 10 students only in one batch',
        'Physics, Chemistry & Math with a mentor who tracks every student',
        'Personal mentorship, online live classes, regular tests and daily DPP'
      ],
      cta: '.mjm-card.jee .mjm-btn'
    },
    {
      selector: '.mjm-card.neet',
      name: 'NEET 2026-27',
      fee: 'Fee: talk to our counselor',
      details: [
        'Max 10 students only in one batch',
        'Physics, Chemistry & Biology with dedicated personal mentorship for every doubt',
        'Online live classes, regular tests and daily DPP'
      ],
      cta: '.mjm-card.neet .mjm-btn'
    },
    {
      selector: '.mjm-card.foundation',
      name: 'Foundation Program',
      fee: 'Fee: talk to our counselor',
      details: [
        'Class 7 to 10 with max 10 students only in one batch',
        'Strong basics in Science, Math, Social Science & English',
        'Online live classes, regular tests and daily DPP'
      ],
      cta: '.mjm-card.foundation .mjm-btn'
    },

    // --- JEE BATCHES (/jee.html) ---
    {
      selector: '.program-card.program-foundation:not(.neet-program-card), .resource-grid .resource-card:nth-child(1) .program-card',
      name: 'JEE Foundation Batch',
      fee: '₹3000/month',
      details: [
        'Build strong fundamentals, clear concepts and develop a solid JEE base',
        'Max 10 students per batch with personal mentorship',
        'Live classes, DPPs, homework, PYQs and regular tests'
      ],
      cta: '.program-card.program-foundation .program-cta, .resource-grid .resource-card:nth-child(1) .program-cta'
    },
    {
      selector: '.program-card.program-mentorship:not(.neet-program-card), .resource-grid .resource-card:nth-child(2) .program-card:not(.neet-program-card)',
      name: 'JEE Booster Batch',
      fee: '₹4000/month',
      details: [
        'Strengthen existing preparation and fix weak areas',
        'Improve problem-solving speed and boost performance',
        'Intensive practice, PYQs and targeted doubt clearing'
      ],
      cta: '.program-card.program-mentorship .program-cta, .resource-grid .resource-card:nth-child(2) .program-cta'
    },
    {
      selector: '.program-card.program-ranker:not(.neet-program-card), .resource-grid .resource-card:nth-child(3) .program-card:not(.neet-program-card)',
      name: 'JEE Ranker Batch',
      fee: '₹5000/month',
      details: [
        'Advanced problem-solving and intensive practice for top percentile',
        'Comprehensive PYQs and regular performance analysis',
        'Direct teacher support with maximum 10 students'
      ],
      cta: '.program-card.program-ranker .program-cta, .resource-grid .resource-card:nth-child(3) .program-cta'
    },
    {
      selector: '.program-card.program-one-to-one:not(.neet-program-card), .resource-grid .resource-card:nth-child(4) .program-card:not(.neet-program-card)',
      name: 'JEE Premium Batch',
      fee: '₹6000/month',
      details: [
        'Focused learning and 1-on-1 personalized guidance',
        'Structured preparation, regular practice and academic monitoring',
        'Continuous mentor check-ins and performance tracking'
      ],
      cta: '.program-card.program-one-to-one .program-cta, .resource-grid .resource-card:nth-child(4) .program-cta'
    },

    // --- NEET BATCHES (/neet.html) ---
    {
      selector: '.neet-program-card.program-foundation, .neet-program-card:nth-of-type(1)',
      name: 'NEET Foundation Batch',
      fee: '₹3000/month',
      details: [
        'Strong NCERT foundation and clear basic concepts',
        'Right approach for NEET preparation from ground up',
        'Max 10 students per batch with personal mentorship'
      ],
      cta: '.neet-program-card.program-foundation .program-cta, .neet-program-card:nth-of-type(1) .program-cta'
    },
    {
      selector: '.neet-program-card.program-mentorship, .neet-program-card:nth-of-type(2)',
      name: 'NEET Booster / Personal Mentorship Batch',
      fee: '₹4000/month',
      details: [
        'Strengthen concepts and improve weak areas in Physics, Chemistry & Biology',
        'Revise high-weightage topics and boost overall performance',
        'Priority doubt solving and regular test analysis'
      ],
      cta: '.neet-program-card.program-mentorship .program-cta, .neet-program-card:nth-of-type(2) .program-cta'
    },
    {
      selector: '.neet-personal-mentorship, .program-card.program-mentorship[data-slug="mentorship"]',
      name: 'NEET Personal Mentorship Batch',
      fee: 'Fee: talk to our counselor',
      details: [
        'Strictly limited to max 5 students per batch',
        '1:1 personal mentoring and direct teacher support',
        'Priority doubt solving and weekly performance review'
      ],
      cta: '.program-card.program-mentorship .program-cta'
    },
    {
      selector: '.neet-program-card.program-ranker, .neet-program-card:nth-of-type(3)',
      name: 'NEET Ranker Batch',
      fee: '₹5000/month',
      details: [
        'Intensive revision and NCERT-focused practice & PYQs',
        'Mock tests and regular performance analysis for top medical aspirants',
        'Small batches with dedicated medical entrance mentors'
      ],
      cta: '.neet-program-card.program-ranker .program-cta, .neet-program-card:nth-of-type(3) .program-cta'
    },
    {
      selector: '.neet-program-card.program-one-to-one, .neet-program-card:nth-of-type(4)',
      name: 'NEET Premium / One to One Program',
      fee: '₹6000/month',
      details: [
        'Personalised attention, structured preparation and custom study plan',
        'Regular practice, doubt support and continuous academic monitoring',
        '100% focused one-to-one mentor tracking'
      ],
      cta: '.neet-program-card.program-one-to-one .program-cta, .neet-program-card:nth-of-type(4) .program-cta'
    },
    {
      selector: '.neet-one-to-one, .program-card.program-one-to-one[data-slug="one-to-one"]',
      name: 'NEET One to One Program',
      fee: 'Fee: talk to our counselor',
      details: [
        '100% personalized learning with a dedicated medical entrance mentor',
        'Custom study plan aligned with your syllabus pace and targets',
        'Regular performance tracking and direct mentor access'
      ],
      cta: '.program-card.program-one-to-one .program-cta'
    },

    // --- FOUNDATION CLASSES (/foundation.html) ---
    {
      selector: '.foundation-card-7',
      name: 'Class 7 Foundation',
      fee: '₹2500/month',
      details: [
        'Max 10 students per batch for real individual attention',
        'Science, Math, English, Spoken English & Social Science',
        'CBSE & ICSE board aligned with daily practice papers'
      ],
      cta: '.foundation-card-7 .foundation-card-cta'
    },
    {
      selector: '.foundation-card-8',
      name: 'Class 8 Foundation',
      fee: '₹2500/month',
      details: [
        'Max 10 students per batch building fundamental concepts',
        'Science, Math, English, Spoken English and SST coverage',
        'Regular practice, tests and early Olympiad foundation'
      ],
      cta: '.foundation-card-8 .foundation-card-cta'
    },
    {
      selector: '.foundation-card-9',
      name: 'Class 9 Foundation',
      fee: '₹3000/month',
      details: [
        'Max 10 students per batch bridging high school concepts',
        'In-depth Science & Math curriculum for CBSE and ICSE',
        'Daily DPPs and early base for JEE and NEET competitive exams'
      ],
      cta: '.foundation-card-9 .foundation-card-cta'
    },
    {
      selector: '.foundation-card-10',
      name: 'Class 10 Foundation',
      fee: '₹3000/month',
      details: [
        'Max 10 students per batch with board exam focus',
        'Comprehensive syllabus coverage, daily DPPs and regular mock exams',
        'Strong conceptual bridge for Class 11 JEE and NEET'
      ],
      cta: '.foundation-card-10 .foundation-card-cta'
    },

    // --- FACULTY CARDS ---
    {
      selector: '.faculty-card[data-faculty-id="ayushi"], .faculty-card:nth-child(1)',
      name: 'Dr. Ayushi Aggarwal',
      fee: 'Fee: talk to our counselor',
      details: [
        'Chemistry & Biology faculty for JEE & NEET',
        'Ph.D., M.Sc. Gold Medalist with 8+ years premier coaching experience',
        'Known for step-by-step conceptual clarity and interactive doubt solving'
      ],
      cta: '.mjm-faculty-cta a, .faculty-cta-bar .btn-primary, a[href="#book-demo"], .site-header .btn.talk'
    },
    {
      selector: '.faculty-card[data-faculty-id="anil"], .faculty-card:nth-child(2)',
      name: 'Anil Kumar Singh',
      fee: 'Fee: talk to our counselor',
      details: [
        'Mathematics faculty for JEE Main & Advanced',
        'Senior Mathematics Faculty with 9+ years experience',
        'Specializes in Calculus, Algebra, and Coordinate Geometry for 99+ percentile scores'
      ],
      cta: '.mjm-faculty-cta a, .faculty-cta-bar .btn-primary, a[href="#book-demo"], .site-header .btn.talk'
    },
    {
      selector: '.faculty-card[data-faculty-id="lokesh"], .faculty-card:nth-child(3)',
      name: 'Lokesh Gupta',
      fee: 'Fee: talk to our counselor',
      details: [
        'Physics faculty for JEE & NEET',
        '7+ years experience training JEE & NEET aspirants across leading coaching centers',
        'Specializes in Mechanics, Electrodynamics, and systematic numerical breakdown'
      ],
      cta: '.mjm-faculty-cta a, .faculty-cta-bar .btn-primary, a[href="#book-demo"], .site-header .btn.talk'
    },
    {
      selector: '.faculty-card[data-faculty-id="soujanya"], .faculty-card:nth-child(4)',
      name: 'Soujanya Mondal',
      fee: 'Fee: talk to our counselor',
      details: [
        'Chemistry faculty for JEE & NEET',
        'M.Sc. Chemistry NIT Warangal, IIT JAM qualified 2023',
        'Senior Faculty at Unacademy and Allen Chennai, known for making chemistry intuitive'
      ],
      cta: '.mjm-faculty-cta a, .faculty-cta-bar .btn-primary, a[href="#book-demo"], .site-header .btn.talk'
    },
    {
      selector: '.faculty-card[data-faculty-id="shubham"], .faculty-card:nth-child(5)',
      name: 'Shubham Kumar',
      fee: 'Fee: talk to our counselor',
      details: [
        'Foundation faculty for Class 7 to 10',
        'B.Sc. & Academic Pedagogy Training with 6+ years experience in Science & Math',
        'Known for friendly mentoring, patient doubt resolution and Olympiad base building'
      ],
      cta: '.mjm-faculty-cta a, .faculty-cta-bar .btn-primary, a[href="#book-demo"], .site-header .btn.talk'
    },

    // --- OTHER PUBLIC BATCH / PROGRAM CARDS ---
    {
      selector: '.courses-jee-booster .split, main:has(.split) .split',
      name: 'JEE Booster Program',
      fee: 'Fee: talk to our counselor',
      details: [
        'Focused concept recovery and weakness fixing for Class 11-12 & droppers',
        'Live classes, DPPs, homework, PYQs, regular tests and doubt support',
        'Personal mentorship and performance tracking with counseling'
      ],
      cta: '.split a[href="#book-demo"], .split a.btn-primary, .site-header .btn.talk'
    }
  ];

  // Helper to format natural speech from CARD_DATA
  function formatCardSpeech(entry, ctaEl) {
    const rawCta = ctaEl ? ctaEl.textContent.trim().replace(/\s+/g, ' ').replace(/[→›»]/g, '').trim() : '';
    const ctaLabel = rawCta || 'Explore Now';
    const details = Array.isArray(entry.details)
      ? entry.details.map(d => d.replace(/\.+$/, '')).join('. ') + '.'
      : entry.details;
    const feeText = entry.fee.startsWith('Fee:') ? entry.fee : `Fee: ${entry.fee}`;

    let action = 'see full details';
    if (/book|demo/i.test(ctaLabel)) {
      action = 'reserve your free demo class';
    } else if (/talk|call/i.test(ctaLabel)) {
      action = 'speak with our academic counselor';
    } else if (/enquire/i.test(ctaLabel)) {
      action = 'enquire about this program';
    } else if (/explore/i.test(ctaLabel)) {
      action = 'see full details';
    }

    return `This is ${entry.name}. ${details} ${feeText}. Click ${ctaLabel} to ${action}.`;
  }

  // Helper to match an element to CARD_DATA
  function findCardDataForElement(el) {
    if (!el) return null;
    for (const card of CARD_DATA) {
      try {
        if (el.matches(card.selector) || el.closest(card.selector)) {
          return card;
        }
      } catch (e) {}
    }
    return null;
  }

  // Device capability detector: true for mouse/desktop, false for touch
  function isDesktopDevice() {
    try {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch (e) {
      return window.innerWidth > 900;
    }
  }

  // ==========================================================================
  // CONFIGURATION: CUSTOM_STEPS
  // Ordered strictly according to DOM document order.
  // ==========================================================================
  const CUSTOM_STEPS = [
    // --- GLOBAL MODAL ---
    {
      id: 'modal-booking',
      page: '*',
      section: '#book-demo',
      target: '#booking-form button[type="submit"]',
      title: 'Book Free Demo Modal',
      text: 'Book a free 1-on-1 demo session with our mentors. Enter your student name, phone number, target grade and course, then click Book Free Demo Session to confirm.'
    },

    // --- HOME PAGE (/) ---
    {
      id: 'home-header',
      page: '/',
      section: 'header.site-header',
      target: '.header-actions .btn.talk',
      title: 'Site Header',
      text: 'Welcome to My JEE Mentor! Have a question about courses or batch timings? Click Talk to Counselor to speak directly with our academic team.'
    },
    {
      id: 'home-hero',
      page: '/',
      section: 'section.hero',
      target: '.hero-actions .btn-primary',
      title: 'Hero Banner',
      text: 'Namaste! I’m Ollie, your guide to My JEE Mentor. We offer personalized online coaching for JEE, NEET and Foundation with max 10 students per batch. Click Book Free Demo to get started.'
    },
    // Home Program Section Heading (Spoken once before cards start)
    {
      id: 'home-programs-head',
      page: '/',
      section: 'section.program-section .section-head',
      target: '.mjm-card.jee .mjm-btn',
      title: 'Choose How You Want to Learn',
      text: 'This is Personal Mentorship Programs. Choose how you want to learn with focused support and a plan built around your goal. Explore our JEE, NEET and Foundation courses below.'
    },
    // Home Course Cards Group (Side-by-side group auto-hopping)
    {
      id: 'home-card-jee',
      page: '/',
      group: 'home-courses',
      section: '.mjm-card.jee',
      target: '.mjm-card.jee .mjm-btn',
      title: 'JEE 2026-27 Card',
      text: formatCardSpeech(CARD_DATA[0], { textContent: 'Explore Now' })
    },
    {
      id: 'home-card-neet',
      page: '/',
      group: 'home-courses',
      section: '.mjm-card.neet',
      target: '.mjm-card.neet .mjm-btn',
      title: 'NEET 2026-27 Card',
      text: formatCardSpeech(CARD_DATA[1], { textContent: 'Explore Now' })
    },
    {
      id: 'home-card-foundation',
      page: '/',
      group: 'home-courses',
      section: '.mjm-card.foundation',
      target: '.mjm-card.foundation .mjm-btn',
      title: 'Foundation Card',
      text: formatCardSpeech(CARD_DATA[2], { textContent: 'Explore Now' })
    },

    // Reviews Heading & Cards
    {
      id: 'reviews-section-head',
      page: '*',
      section: '.mjm-reviews-header',
      target: '.mjm-review-card:first-child',
      title: 'Reviews Heading',
      text: 'What Parents & Students Say: Small batches, personal mentors, and real attention. Read what families say before you decide.'
    },
    {
      id: 'home-reviews-card-1',
      page: '*',
      group: 'reviews-group',
      section: '.mjm-review-card:nth-child(1)',
      target: '.mjm-review-card:nth-child(1)',
      title: 'Review: Dirasantham Adithya',
      text: 'With only 10 students in a batch, mentors know exactly where students are weak and resolve doubts the same day, one-on-one.'
    },
    {
      id: 'home-reviews-card-2',
      page: '*',
      group: 'reviews-group',
      section: '.mjm-review-card:nth-child(2)',
      target: '.mjm-review-card:nth-child(2)',
      title: 'Review: K. Ramachandran',
      text: 'Parents appreciate personal guidance, regular test series, and transparent progress updates for NEET preparation.'
    },
    {
      id: 'home-reviews-card-3',
      page: '*',
      group: 'reviews-group',
      section: '.mjm-review-card:nth-child(3)',
      target: '.mjm-review-card:nth-child(3)',
      title: 'Review: Shriya S Nair',
      text: 'Daily DPPs build strong study habits from home, saving travel time with immediate mentor doubt support.'
    },
    {
      id: 'home-reviews-card-4',
      page: '*',
      group: 'reviews-group',
      section: '.mjm-review-card:nth-child(4)',
      target: '.mjm-review-card:nth-child(4)',
      title: 'Review: M. Sundaresan',
      text: 'Parents of Foundation students highlight how basics are explained step by step, growing confidence in Science and Math.'
    },
    {
      id: 'home-reviews-card-5',
      page: '*',
      group: 'reviews-group',
      section: '.mjm-review-card:nth-child(5)',
      target: '.mjm-review-card:nth-child(5)',
      title: 'Review: Regati Rishikesh Reddy',
      text: 'Regular tests show mistakes early, paired with personal study plans so students never feel lost during JEE prep.'
    },
    {
      id: 'home-reviews-card-6',
      page: '*',
      group: 'reviews-group',
      section: '.mjm-review-card:nth-child(6)',
      target: '.mjm-review-card:nth-child(6)',
      title: 'Review: V. Subramanian',
      text: 'Patient teachers who listen closely make a real difference in small batches, ensuring every student doubt is resolved.'
    },

    // Faculty Section Heading & Individual Cards
    {
      id: 'faculty-section-head',
      page: '*',
      section: '.mjm-faculty-header',
      target: '.faculty-card:first-child',
      title: 'Faculty Section Heading',
      text: 'Meet our dedicated faculty team. Learn from teachers who make concepts click with personalized attention in small batches of max 10 students.'
    },
    {
      id: 'faculty-ayushi',
      page: '*',
      group: 'faculty-group',
      section: '.faculty-card[data-faculty-id="ayushi"]',
      target: '.faculty-card[data-faculty-id="ayushi"]',
      title: 'Dr. Ayushi Aggarwal',
      text: formatCardSpeech(CARD_DATA[11], { textContent: 'Book Free Demo Session' })
    },
    {
      id: 'faculty-anil',
      page: '*',
      group: 'faculty-group',
      section: '.faculty-card[data-faculty-id="anil"]',
      target: '.faculty-card[data-faculty-id="anil"]',
      title: 'Anil Kumar Singh',
      text: formatCardSpeech(CARD_DATA[12], { textContent: 'Book Free Demo Session' })
    },
    {
      id: 'faculty-lokesh',
      page: '*',
      group: 'faculty-group',
      section: '.faculty-card[data-faculty-id="lokesh"]',
      target: '.faculty-card[data-faculty-id="lokesh"]',
      title: 'Lokesh Gupta',
      text: formatCardSpeech(CARD_DATA[13], { textContent: 'Book Free Demo Session' })
    },
    {
      id: 'faculty-soujanya',
      page: '*',
      group: 'faculty-group',
      section: '.faculty-card[data-faculty-id="soujanya"]',
      target: '.faculty-card[data-faculty-id="soujanya"]',
      title: 'Soujanya Mondal',
      text: formatCardSpeech(CARD_DATA[14], { textContent: 'Book Free Demo Session' })
    },
    {
      id: 'faculty-shubham',
      page: '*',
      group: 'faculty-group',
      section: '.faculty-card[data-faculty-id="shubham"]',
      target: '.faculty-card[data-faculty-id="shubham"]',
      title: 'Shubham Kumar',
      text: formatCardSpeech(CARD_DATA[15], { textContent: 'Book Free Demo Session' })
    },
    {
      id: 'faculty-cta-step',
      page: '*',
      section: '.mjm-faculty-section .faculty-cta-bar',
      target: '.mjm-faculty-section .faculty-cta-bar .btn-primary, .mjm-faculty-cta a',
      title: 'Faculty Free Demo Booking',
      text: 'Our subject mentors teach in small batches of max 10 students for real personal attention. Click Book Free Demo Session to reserve your student’s counseling and demo class.'
    },

    // Mentorship & Journey
    {
      id: 'home-mentorship',
      page: '/',
      section: 'section.mentorship-section',
      target: '.mentorship-cta .btn',
      title: 'Mentorship Section',
      text: 'Every batch gets one dedicated mentor assigned from day one for weekly progress tracking, 24/7 doubt support, and custom revision plans. Click Meet Your Mentor to connect with our counseling team.'
    },
    {
      id: 'home-steps',
      page: '/',
      section: 'section.section-soft:has(.step-grid)',
      target: '.step-card:first-child',
      title: 'Learning Journey',
      text: 'Here is how your learning journey starts: first book a free demo, then take a diagnostic session, receive a personalized study plan, and begin live daily classes. Follow these steps to begin.'
    },
    {
      id: 'home-resources',
      page: '/',
      section: 'section.shared-resources-section',
      target: '.shared-resources-section .btn-primary, .shared-resources-section .btn-outline',
      title: 'Free Learning Resources',
      text: 'Good learning starts before enrolment. Explore our free sample lecture videos, subject notes, and practice DPPs prepared by our faculty. Click Watch Free Classes to begin learning.'
    },
    {
      id: 'home-final-cta',
      page: '/',
      section: 'section.section-soft:last-of-type',
      target: 'section.section-soft:last-of-type .btn-primary',
      title: 'Final Demo Call to Action',
      text: 'Ready to give your preparation the focused attention it deserves? Book a free demo class or talk directly to our counselor today. Click Book Free Demo to reserve your seat.'
    },
    {
      id: 'home-footer',
      page: '*',
      section: 'footer.site-footer',
      target: 'footer.site-footer a[href^="https://wa.me"]',
      title: 'Site Footer',
      text: 'This is the site footer. You can explore our JEE, NEET and Foundation programs, read student reviews, or contact our team in Navi Mumbai at +91 73042 56203. Click WhatsApp to chat directly.'
    },

    // --- JEE PAGE (/jee.html) ---
    {
      id: 'jee-hero',
      page: '/jee.html',
      section: '.page-hero',
      target: '.page-hero .btn-primary',
      title: 'JEE Page Hero',
      text: 'Welcome to our JEE coaching program for Class 11, Class 12, and droppers. We offer concept-focused preparation, live teaching, and personal mentorship you can track. Click Book Free Demo to start.'
    },
    {
      id: 'jee-batch-1',
      page: '/jee.html',
      group: 'jee-batches',
      section: '.resource-grid .resource-card:nth-child(1), .program-card.program-foundation',
      target: '.resource-grid .resource-card:nth-child(1) .program-cta, .program-card.program-foundation .program-cta',
      title: 'JEE Foundation Batch',
      text: formatCardSpeech(CARD_DATA[3], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'jee-batch-2',
      page: '/jee.html',
      group: 'jee-batches',
      section: '.resource-grid .resource-card:nth-child(2), .program-card.program-mentorship',
      target: '.resource-grid .resource-card:nth-child(2) .program-cta, .program-card.program-mentorship .program-cta',
      title: 'JEE Booster Batch',
      text: formatCardSpeech(CARD_DATA[4], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'jee-batch-3',
      page: '/jee.html',
      group: 'jee-batches',
      section: '.resource-grid .resource-card:nth-child(3), .program-card.program-ranker',
      target: '.resource-grid .resource-card:nth-child(3) .program-cta, .program-card.program-ranker .program-cta',
      title: 'JEE Ranker Batch',
      text: formatCardSpeech(CARD_DATA[5], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'jee-batch-4',
      page: '/jee.html',
      group: 'jee-batches',
      section: '.resource-grid .resource-card:nth-child(4), .program-card.program-one-to-one',
      target: '.resource-grid .resource-card:nth-child(4) .program-cta, .program-card.program-one-to-one .program-cta',
      title: 'JEE Premium Batch',
      text: formatCardSpeech(CARD_DATA[6], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'jee-enquiry',
      page: '/jee.html',
      section: '.section-head.spaced-head',
      target: '.section-head.spaced-head .btn-primary',
      title: 'JEE Program Enquiry',
      text: 'Have questions about batch schedules or JEE class options? Talk with our counselor directly. Click Call for Enquiry or WhatsApp to connect with our academic team.'
    },

    // --- NEET PAGE (/neet.html) ---
    {
      id: 'neet-hero',
      page: '/neet.html',
      section: '.page-hero',
      target: '.page-hero .btn-primary',
      title: 'NEET Page Hero',
      text: 'Welcome to NEET Coaching for Class 11, 12, and droppers. Master Physics, Chemistry, and Biology with structured NCERT practice and personal mentor support. Click Book Free Demo to begin.'
    },
    {
      id: 'neet-batch-1',
      page: '/neet.html',
      group: 'neet-batches',
      section: '.neet-program-card.program-foundation, .resource-grid .resource-card:nth-child(1)',
      target: '.neet-program-card.program-foundation .program-cta, .resource-grid .resource-card:nth-child(1) .program-cta',
      title: 'NEET Foundation Batch',
      text: formatCardSpeech(CARD_DATA[7], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'neet-batch-2',
      page: '/neet.html',
      group: 'neet-batches',
      section: '.neet-program-card.program-mentorship, .resource-grid .resource-card:nth-child(2)',
      target: '.neet-program-card.program-mentorship .program-cta, .resource-grid .resource-card:nth-child(2) .program-cta',
      title: 'NEET Booster Batch',
      text: formatCardSpeech(CARD_DATA[8], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'neet-batch-3',
      page: '/neet.html',
      group: 'neet-batches',
      section: '.neet-program-card.program-ranker, .resource-grid .resource-card:nth-child(3)',
      target: '.neet-program-card.program-ranker .program-cta, .resource-grid .resource-card:nth-child(3) .program-cta',
      title: 'NEET Ranker Batch',
      text: formatCardSpeech(CARD_DATA[10], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'neet-batch-4',
      page: '/neet.html',
      group: 'neet-batches',
      section: '.neet-program-card.program-one-to-one, .resource-grid .resource-card:nth-child(4)',
      target: '.neet-program-card.program-one-to-one .program-cta, .resource-grid .resource-card:nth-child(4) .program-cta',
      title: 'NEET Premium Batch',
      text: formatCardSpeech(CARD_DATA[11], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'neet-enquiry',
      page: '/neet.html',
      section: '.section-head.spaced-head',
      target: '.section-head.spaced-head .btn-primary',
      title: 'NEET Program Enquiry',
      text: 'Need help choosing the right NEET batch? Speak with our academic counselor on WhatsApp or phone. Click Call for Enquiry for instant support.'
    },

    // --- FOUNDATION PAGE (/foundation.html) ---
    {
      id: 'foundation-hero',
      page: '/foundation.html',
      section: 'section.foundation-hero',
      target: '.foundation-btn-primary',
      title: 'Foundation Hero',
      text: 'Welcome to the Foundation Program for Classes 7 to 10. We build strong basics in Science and Mathematics to prepare students early for JEE, NEET, and Olympiads. Click Book Free Demo Class to get started.'
    },
    {
      id: 'foundation-classes-head',
      page: '/foundation.html',
      section: '.foundation-classes .foundation-heading',
      target: '.foundation-card-7',
      title: 'Choose Your Class Header',
      text: 'Choose your class for personalized foundation training. Max 10 students per batch with concept-first mentoring in Science and Maths.'
    },
    {
      id: 'foundation-card-7',
      page: '/foundation.html',
      group: 'foundation-classes',
      section: '.foundation-card-7',
      target: '.foundation-card-7 .foundation-card-cta',
      title: 'Class 7 Foundation',
      text: formatCardSpeech(CARD_DATA[13], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'foundation-card-8',
      page: '/foundation.html',
      group: 'foundation-classes',
      section: '.foundation-card-8',
      target: '.foundation-card-8 .foundation-card-cta',
      title: 'Class 8 Foundation',
      text: formatCardSpeech(CARD_DATA[14], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'foundation-card-9',
      page: '/foundation.html',
      group: 'foundation-classes',
      section: '.foundation-card-9',
      target: '.foundation-card-9 .foundation-card-cta',
      title: 'Class 9 Foundation',
      text: formatCardSpeech(CARD_DATA[15], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'foundation-card-10',
      page: '/foundation.html',
      group: 'foundation-classes',
      section: '.foundation-card-10',
      target: '.foundation-card-10 .foundation-card-cta',
      title: 'Class 10 Foundation',
      text: formatCardSpeech(CARD_DATA[16], { textContent: 'Book Free Demo Class' })
    },
    {
      id: 'foundation-why',
      page: '/foundation.html',
      section: 'section.foundation-why',
      target: '.foundation-why-grid article:first-child',
      title: 'Why Foundation Pillars',
      text: 'Discover why parents choose My JEE Mentor: max 10 students per batch, concept-first teaching, personal mentors, and regular progress updates. Explore our pillars above.'
    },
    {
      id: 'foundation-final-cta',
      page: '/foundation.html',
      section: 'section.foundation-final',
      target: '.foundation-final .foundation-btn-primary',
      title: 'Foundation Final Demo',
      text: 'Give your child a strong head start in middle school. Book a free demo class or talk to our counselor today. Click Book Free Demo Class to proceed.'
    },

    // --- JEE BOOSTER (/courses/jee-booster.html) ---
    {
      id: 'booster-hero',
      page: '/courses/jee-booster.html',
      section: '.page-hero',
      target: '.page-hero .btn-primary',
      title: 'JEE Booster Hero',
      text: 'The JEE Booster Program is tailored to strengthen concepts and fix weak areas with focused mentorship, daily practice, and live doubt resolution. Click Book Free Demo to enroll.'
    },
    {
      id: 'booster-split-info',
      page: '/courses/jee-booster.html',
      section: '.split > div:first-child',
      target: '.split .check-list',
      title: 'Program Checklist & FAQs',
      text: formatCardSpeech(CARD_DATA[CARD_DATA.length - 1], { textContent: 'Book Free Demo' })
    },
    {
      id: 'booster-split-form',
      page: '/courses/jee-booster.html',
      section: '.split form.enquiry-form',
      target: '.split form.enquiry-form button[type="submit"]',
      title: 'JEE Booster Enquiry',
      text: 'Fill out this brief enquiry form with your name, phone number, and current preparation level to receive batch details and schedule. Click Submit Enquiry to send.'
    },

    // --- REVIEWS PAGES (/reviews.html, /studentreview.html) ---
    {
      id: 'reviews-hero',
      page: '/reviews.html',
      section: '.page-hero',
      target: '.page-hero h1',
      title: 'Reviews Hero',
      text: 'Read genuine feedback and experiences from our students and parents across JEE, NEET, and Foundation programs. Click any review card to read details.'
    },
    {
      id: 'studentreview-hero',
      page: '/studentreview.html',
      section: '.page-hero',
      target: '.page-hero h1',
      title: 'Student Review Hero',
      text: 'Read genuine feedback and experiences from our students and parents across JEE, NEET, and Foundation programs. Click any review card to read details.'
    },
    {
      id: 'review-form-step',
      page: '*',
      section: '.student-review-form-card',
      target: '#student-review-form button[type="submit"]',
      title: 'Submit Review Form',
      text: 'Are you a current student or parent? Share your experience with My JEE Mentor. Enter your name, rating, and feedback, then click Submit Review.'
    },

    // --- FREE RESOURCES (/freeresource.html, /resources.html) ---
    {
      id: 'freeresource-hero',
      page: '*',
      section: '.page-hero:has(.eyebrow)',
      target: '.page-hero .btn-primary',
      title: 'Resource Library Hero',
      text: 'Explore our free learning library featuring notes, presentations, formula sheets, and study materials shared directly by our faculty. Click Book Free Demo or browse below.'
    },
    {
      id: 'freeresource-filter',
      page: '/freeresource.html',
      section: '.resource-library-tools, .resource-filter-bar',
      target: '[data-resource-search]',
      title: 'Resource Search Bar',
      text: 'Use this search bar and category filter to quickly find study notes and practice sheets for JEE, NEET, or Foundation. Type a subject to filter.'
    },
    {
      id: 'freeresource-grid',
      page: '/freeresource.html',
      section: '.shared-resource-track',
      target: '.shared-resource-card:first-child',
      title: 'Public Resources Grid',
      text: 'Browse our curated study material. Click any card to open notes and formula summaries directly in your browser.'
    },

    // --- WHY CHOOSE US (/why-my-jee-mentor.html) ---
    {
      id: 'why-hero',
      page: '/why-my-jee-mentor.html',
      section: '.page-hero',
      target: '.page-hero .btn-primary',
      title: 'Why Us Hero',
      text: 'Learn why our model works: small batches of max 10 students, interactive live classes, DPPs and PYQs, progress tracking, and affordable fees. Click Book Free Demo to start.'
    },

    // --- RESULTS (/results.html) ---
    {
      id: 'results-hero',
      page: '/results.html',
      section: '.page-hero',
      target: '.page-hero .btn-primary',
      title: 'Results Hero',
      text: 'Every result starts with steady progress. Verified student progress and success stories will be published here with parent permission. Click Book Free Demo to consult our mentors.'
    },

    // --- CONTACT US (/contact.html) ---
    {
      id: 'contact-hero',
      page: '/contact.html',
      section: '.page-hero',
      target: '.site-header .talk',
      title: 'Contact Hero',
      text: 'Have questions about our batches, fees, or schedules? Get in touch with our team in Navi Mumbai. Click Call for Enquiry or message us on WhatsApp.'
    },
    {
      id: 'contact-form-step',
      page: '/contact.html',
      section: '.split form.enquiry-form',
      target: '.split form.enquiry-form button[type="submit"]',
      title: 'Contact Form',
      text: 'Send our counseling team a direct message with your student grade and questions. Click Send Message and our team will get back to you promptly.'
    },

    // --- CAREERS (/career.html) ---
    {
      id: 'career-form-step',
      page: '/career.html',
      section: '[data-career-form]',
      target: '[data-career-form] button[type="submit"]',
      title: 'Careers Application',
      text: 'Interested in teaching with My JEE Mentor? Explore our faculty opportunities. Enter your details, subject expertise, and resume link, then click Submit Application.'
    }
  ];

  // ==========================================================================
  // OLLIE GUIDE STATE & CONTROLLER
  // ==========================================================================
  let owlEl = null;
  let bubEl = null;
  let txtEl = null;
  let actBtn = null;
  let hideBtn = null;

  let activeSteps = [];
  let currentStepIdx = -1;
  let isTour = false;
  let isHidden = false;
  let tourTimer = null;
  let flyTimer = null;
  let highlightedEl = null;
  let isTick = false;
  let modalActive = false;

  // Group Hopping & Interaction State
  let activeGroupId = null;
  let groupHopTimer = null;
  let groupHopPausedUntil = 0;
  let hoverDebounceTimer = null;
  let isCurrentlyHoveringCard = false;

  try {
    isHidden = sessionStorage.getItem('ollie-hidden') === 'true';
  } catch (e) {
    isHidden = false;
  }

  // 2. INLINE OWL SVG & BUBBLE CREATION
  function createOllieDOM() {
    if (document.getElementById('ollie-owl')) return;

    // Speech bubble container
    const bub = document.createElement('aside');
    bub.id = 'ollie-bub';
    bub.className = 'ollie-bub';
    bub.setAttribute('role', 'region');
    bub.setAttribute('aria-label', 'Guide message from Ollie the Owl');
    bub.hidden = true;
    bub.innerHTML = `
      <p id="ollie-txt" class="ollie-txt" aria-live="polite"></p>
      <div class="ollie-bc">
        <button type="button" class="ollie-btn" id="ollie-act">Take the tour</button>
        <button type="button" class="ollie-lnk" id="ollie-hide">Hide guide</button>
      </div>
    `;

    // Owl button container
    const owl = document.createElement('button');
    owl.id = 'ollie-owl';
    owl.className = 'ollie-owl';
    owl.type = 'button';
    owl.setAttribute('aria-label', 'Ollie, your website guide');
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

    document.body.appendChild(bub);
    document.body.appendChild(owl);

    owlEl = owl;
    bubEl = bub;
    txtEl = document.getElementById('ollie-txt');
    actBtn = document.getElementById('ollie-act');
    hideBtn = document.getElementById('ollie-hide');

    actBtn.onclick = function (e) {
      e.preventDefault();
      if (isTour) {
        stopTour();
      } else {
        startTour();
      }
    };

    hideBtn.onclick = function (e) {
      e.preventDefault();
      hideGuide();
    };

    owlEl.onclick = function () {
      if (isHidden) {
        showGuide();
      } else {
        jumpReaction();
      }
    };

    // Fly in from top-right corner on initial load
    owlEl.style.transition = 'none';
    owlEl.style.transform = 'translate(' + (window.innerWidth + 40) + 'px, -120px)';
    void owlEl.offsetWidth;
    owlEl.style.transition = '';

    if (!isHidden) {
      bubEl.hidden = false;
    }
  }

  // 3. PRECISE 3-TIER PLACEMENT ENGINE (Zero Overlap with Active Block)
  function calculatePlacement(activeBlock, targetEl) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 640;

    // Real Sticky Header Bottom
    const headerEl = document.querySelector('header.site-header');
    const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
    const headerBottom = (headerRect && headerRect.bottom > 0) ? Math.max(0, headerRect.bottom) : 0;
    const topSafeLimit = headerBottom + 10;

    // Real Mobile Bar Top
    const mobileBarEl = document.querySelector('.mobile-bar');
    const mobileBarVisible = mobileBarEl && window.getComputedStyle(mobileBarEl).display !== 'none';
    const mobileBarRect = mobileBarVisible ? mobileBarEl.getBoundingClientRect() : null;

    // Bottom Safe Boundary (above .mobile-bar on mobile)
    let bottomSafeLimit = vh - 12;
    if (mobileBarRect && mobileBarRect.top > 0) {
      bottomSafeLimit = Math.min(bottomSafeLimit, mobileBarRect.top - 8);
    }

    // Dimensions
    const owlW = isMobile ? 68 : 84;
    const owlH = isMobile ? 78 : 96;
    const bubW = bubEl.offsetWidth || (isMobile ? Math.min(300, vw - 24) : 310);
    const bubH = bubEl.offsetHeight || 108;

    const bRect = activeBlock.getBoundingClientRect();

    // Helper: test if a rectangle overlaps activeBlock
    function overlapsBlock(x, y, w, h) {
      return !(
        x + w <= bRect.left ||
        x >= bRect.right ||
        y + h <= bRect.top ||
        y >= bRect.bottom
      );
    }

    // --- POSITION 1: ABOVE THE BLOCK ---
    const bubYAbove = bRect.top - bubH - 12;
    const owlYAbove = bRect.top - owlH + 14;

    const fitsAbove = (bubYAbove >= topSafeLimit) && (owlYAbove >= topSafeLimit) && (bRect.top <= vh - 40);

    if (fitsAbove) {
      let bubX = bRect.left + 20;
      if (bubX + bubW > vw - 14) {
        bubX = vw - bubW - 14;
      }
      if (bubX < 12) {
        bubX = 12;
      }

      let owlX = bRect.left - (isMobile ? 12 : 24);
      if (owlX < 8) owlX = Math.max(8, bRect.left + 8);
      if (owlX + owlW > vw - 8) owlX = vw - owlW - 8;

      if (!overlapsBlock(bubX, bubYAbove, bubW, bubH)) {
        return {
          owlX: Math.round(owlX),
          owlY: Math.round(owlYAbove),
          bubX: Math.round(bubX),
          bubY: Math.round(bubYAbove),
          mode: 'above'
        };
      }
    }

    // --- POSITION 2: BELOW THE BLOCK ---
    const bubYBelow = bRect.bottom + 12;
    const owlYBelow = bRect.bottom - 12;

    const fitsBelow = (bubYBelow + bubH <= bottomSafeLimit) && (bRect.bottom >= topSafeLimit);

    if (fitsBelow) {
      let bubX = bRect.left + 20;
      if (bubX + bubW > vw - 14) {
        bubX = vw - bubW - 14;
      }
      if (bubX < 12) {
        bubX = 12;
      }

      let owlX = bRect.left - (isMobile ? 12 : 24);
      if (owlX < 8) owlX = Math.max(8, bRect.left + 8);
      if (owlX + owlW > vw - 8) owlX = vw - owlW - 8;

      if (!overlapsBlock(bubX, bubYBelow, bubW, bubH)) {
        return {
          owlX: Math.round(owlX),
          owlY: Math.round(owlYBelow),
          bubX: Math.round(bubX),
          bubY: Math.round(bubYBelow),
          mode: 'below'
        };
      }
    }

    // --- POSITION 3: FIXED BOTTOM-CENTER FALLBACK ---
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

    return {
      owlX: fixedOwlX,
      owlY: fixedOwlY,
      bubX: fixedBubX,
      bubY: fixedBubY,
      mode: 'fixed-bottom'
    };
  }

  function placeOllieAndBubble() {
    if (!owlEl || !bubEl) return;

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
        const step = activeSteps[currentStepIdx];
        activeBlock = step.secEl;
        targetEl = step.targetEl;
      }

      if (!activeBlock) {
        targetX = vw - 96;
        targetY = vh - 120;
        bubX = vw - 340;
        bubY = vh - 220;
      } else {
        const coords = calculatePlacement(activeBlock, targetEl);
        targetX = coords.owlX;
        targetY = coords.owlY;
        bubX = coords.bubX;
        bubY = coords.bubY;
      }

      bubEl.style.transform = `translate(${bubX}px, ${bubY}px)`;
    }

    // Trigger wing flap during flight
    owlEl.classList.add('ollie-fly');
    clearTimeout(flyTimer);
    flyTimer = setTimeout(function () {
      owlEl.classList.remove('ollie-fly');
    }, 900);

    owlEl.style.transform = `translate(${targetX}px, ${targetY}px)`;
  }

  function sayMessage(text) {
    if (!txtEl) return;
    txtEl.textContent = text;
    txtEl.classList.remove('ollie-pop');
    void txtEl.offsetWidth;
    txtEl.classList.add('ollie-pop');
  }

  function activateStep(index, fromUserInteraction = false) {
    if (index < 0 || index >= activeSteps.length) return;

    if (highlightedEl) {
      highlightedEl.classList.remove('ollie-hl');
    }

    currentStepIdx = index;
    const step = activeSteps[index];

    // Read and speak card info dynamically if step matches CARD_DATA
    let speechText = step.text;
    const matchedCard = step.cardData || findCardDataForElement(step.secEl);
    if (matchedCard) {
      const ctaButton = (step.targetEl && step.targetEl !== step.secEl)
        ? step.targetEl
        : (step.secEl ? step.secEl.querySelector(matchedCard.cta) : null);
      speechText = formatCardSpeech(matchedCard, ctaButton);
      step.text = speechText;
    }

    sayMessage(speechText);

    // Outline / pulse target CTA button
    highlightedEl = (step.targetEl && step.targetEl !== step.secEl)
      ? step.targetEl
      : (matchedCard && step.secEl ? (step.secEl.querySelector(matchedCard.cta) || step.secEl) : (step.targetEl || step.secEl));

    if (highlightedEl) {
      highlightedEl.classList.remove('ollie-hl');
      void highlightedEl.offsetWidth;
      highlightedEl.classList.add('ollie-hl');
    }

    placeOllieAndBubble();

    // Check if this step is part of a card group
    if (step.group) {
      activeGroupId = step.group;
      if (fromUserInteraction) {
        // User clicked, tapped, or hovered: pause auto-hopping for 10 seconds
        groupHopPausedUntil = Date.now() + 10000;
        clearTimeout(groupHopTimer);
        groupHopTimer = setTimeout(function () {
          hopToNextGroupCard(step.group);
        }, 10000);
      } else if (!isTour) {
        // Schedule auto-hop based on reading time (~4-6s)
        const readingTime = Math.max(4200, Math.min(6500, 3000 + (step.text ? step.text.length * 36 : 2000)));
        clearTimeout(groupHopTimer);
        groupHopTimer = setTimeout(function () {
          hopToNextGroupCard(step.group);
        }, readingTime);
      }
    } else {
      activeGroupId = null;
      clearTimeout(groupHopTimer);
    }
  }

  // 4. GROUP AUTO-HOPPING ENGINE
  function hopToNextGroupCard(groupId) {
    if (isTour || isHidden || modalActive) return;
    if (Date.now() < groupHopPausedUntil) return;

    // Desktop hover guard: do not hop away while cursor is actively hovering a card
    if (isDesktopDevice() && isCurrentlyHoveringCard) {
      return;
    }

    // Find all active steps in this group
    const groupSteps = activeSteps
      .map((s, idx) => ({ step: s, idx }))
      .filter(item => item.step.group === groupId);

    if (groupSteps.length <= 1) return;

    // Check if group is still in view
    const firstEl = groupSteps[0].step.secEl;
    const lastEl = groupSteps[groupSteps.length - 1].step.secEl;
    if (!firstEl || !lastEl) return;

    const rFirst = firstEl.getBoundingClientRect();
    const rLast = lastEl.getBoundingClientRect();
    const groupTop = Math.min(rFirst.top, rLast.top);
    const groupBottom = Math.max(rFirst.bottom, rLast.bottom);

    // If completely scrolled off screen, cancel hopping
    if (groupBottom < 60 || groupTop > window.innerHeight - 60) {
      activeGroupId = null;
      return;
    }

    // Find current index in group
    const currentPos = groupSteps.findIndex(item => item.idx === currentStepIdx);
    const nextPos = (currentPos + 1) % groupSteps.length;
    const nextStepIdx = groupSteps[nextPos].idx;

    activateStep(nextStepIdx, false);
  }

  // Jump animation on button click or guide tap
  function jumpReaction(message) {
    if (!owlEl) return;
    owlEl.classList.add('ollie-jump');
    setTimeout(function () {
      owlEl.classList.remove('ollie-jump');
    }, 1100);

    if (message) {
      const prevIdx = currentStepIdx;
      sayMessage(message);
      setTimeout(function () {
        if (currentStepIdx === prevIdx && activeSteps[prevIdx]) {
          sayMessage(activeSteps[prevIdx].text);
        }
      }, 4200);
    }
  }

  // Tour controls
  function updateTourButtonLabel() {
    if (actBtn) {
      actBtn.textContent = isTour ? 'Stop tour' : 'Take the tour';
    }
  }

  function stopTour() {
    isTour = false;
    clearTimeout(tourTimer);
    updateTourButtonLabel();
  }

  function runTourStep(stepIdx) {
    if (!isTour) return;

    if (stepIdx >= activeSteps.length) {
      stopTour();
      sayMessage('That’s the full tour! Book a free demo whenever you’re ready, or scroll up to revisit any section.');
      return;
    }

    activateStep(stepIdx, false);
    const step = activeSteps[stepIdx];
    const el = step.secEl || step.targetEl;

    if (el) {
      if (stepIdx === 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const dwellTime = 3400 + (step.text ? step.text.length * 48 : 2000);
    tourTimer = setTimeout(function () {
      runTourStep(stepIdx + 1);
    }, dwellTime);
  }

  function startTour() {
    if (activeSteps.length === 0) return;
    isTour = true;
    updateTourButtonLabel();
    runTourStep(0);
  }

  function hideGuide() {
    isHidden = true;
    try {
      sessionStorage.setItem('ollie-hidden', 'true');
    } catch (e) {}
    if (highlightedEl) {
      highlightedEl.classList.remove('ollie-hl');
    }
    stopTour();
    clearTimeout(groupHopTimer);
    placeOllieAndBubble();
  }

  function showGuide() {
    isHidden = false;
    try {
      sessionStorage.setItem('ollie-hidden', 'false');
    } catch (e) {}
    bubEl.hidden = false;
    placeOllieAndBubble();
    pickSectionByScroll();
  }

  // 5. SCROLL PICKER (Section crossing 45% viewport height)
  function pickSectionByScroll() {
    if (isHidden || isTour || modalActive || activeSteps.length === 0) return;

    // Desktop: If user is actively hovering over a card, hover is king
    if (isDesktopDevice() && isCurrentlyHoveringCard) {
      placeOllieAndBubble();
      return;
    }

    // If currently inside an active group and user is reading/interacting, check if group still in view
    if (activeGroupId && currentStepIdx >= 0) {
      const curStep = activeSteps[currentStepIdx];
      if (curStep && curStep.secEl) {
        const r = curStep.secEl.getBoundingClientRect();
        const inView = r.top <= window.innerHeight * 0.75 && r.bottom >= window.innerHeight * 0.25;
        if (inView) {
          // Keep current card, recalculate placement smoothly
          placeOllieAndBubble();
          return;
        }
      }
    }

    const line = window.innerHeight * 0.45;

    for (let i = 0; i < activeSteps.length; i++) {
      const step = activeSteps[i];
      const el = step.secEl || step.targetEl;
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      if (rect.top <= line && rect.bottom >= line) {
        if (i !== currentStepIdx) {
          activateStep(i, false);
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
    requestAnimationFrame(function () {
      isTick = false;
      if (isHidden) return;
      if (!isTour) {
        pickSectionByScroll();
      } else {
        placeOllieAndBubble();
      }
    });
  }

  // 6. AUTO-EXPLAINER FALLBACK ENGINE
  function buildFallbackStep(element) {
    const headingEl = element.querySelector('h1, h2, h3, h4, .title, .eyebrow');
    const headingText = headingEl ? headingEl.textContent.trim().replace(/\s+/g, ' ') : 'this section';

    const pEl = element.querySelector('p');
    let sentence = pEl ? pEl.textContent.trim().replace(/\s+/g, ' ') : '';
    if (sentence.includes('.')) {
      sentence = sentence.split('.')[0] + '.';
    } else if (sentence.length > 90) {
      sentence = sentence.substring(0, 90) + '...';
    }

    const btnEl = element.querySelector('a.btn, button.btn, button, .mjm-btn, a[href]');
    const btnText = btnEl ? btnEl.textContent.trim().replace(/\s+/g, ' ') : '';

    let text = `This is ${headingText}.`;
    if (sentence) text += ` ${sentence}`;
    if (btnText && btnText.length < 32) {
      text += ` Click ${btnText} to explore.`;
    }

    return {
      id: 'auto-' + Math.random().toString(36).substr(2, 6),
      secEl: element,
      targetEl: btnEl || element,
      title: 'Auto-explainer: ' + headingText,
      text: text,
      isFallback: true
    };
  }

  // 7. DYNAMIC SCANNER & MUTATIONOBSERVER
  function scanAndResolveSteps() {
    const currentPath = location.pathname || '/';
    const resolved = [];
    const matchedElements = new Set();
    const missingCustomSteps = [];

    // Step A: Match Hand-Crafted Steps
    for (const step of CUSTOM_STEPS) {
      if (step.page !== '*' && step.page !== currentPath) {
        continue;
      }

      let secEl = null;
      try {
        secEl = document.querySelector(step.section);
      } catch (err) {}

      if (!secEl) {
        missingCustomSteps.push(step);
        continue;
      }

      let targetEl = null;
      if (step.target) {
        try {
          targetEl = secEl.matches(step.target) ? secEl : secEl.querySelector(step.target);
        } catch (err) {}
      }

      const cardData = findCardDataForElement(secEl);

      resolved.push({
        ...step,
        secEl: secEl,
        targetEl: targetEl || secEl,
        cardData: cardData,
        isFallback: false
      });
      matchedElements.add(secEl);
    }

    // Step B: Auto-Explainer Fallback for unmapped standalone sections
    // CRITICAL: Skip any container that contains cards so section never replaces individual cards!
    const candidates = document.querySelectorAll('main > section, section.section');
    candidates.forEach(function (elem) {
      if (elem.closest('#book-demo, #ollie-owl, #ollie-bub, header, footer')) return;
      if (matchedElements.has(elem)) return;

      if (elem.querySelector('.mjm-card, .faculty-card, .foundation-card, .resource-card, .mjm-review-card, .step-card')) {
        return;
      }

      let alreadyCovered = false;
      for (const matched of matchedElements) {
        if (matched.contains(elem)) {
          alreadyCovered = true;
          break;
        }
      }
      if (alreadyCovered) return;

      const fallback = buildFallbackStep(elem);
      resolved.push(fallback);
      matchedElements.add(elem);
    });

    // Step C: Sort strictly in natural DOM document order
    resolved.sort(function (a, b) {
      if (a.secEl === b.secEl) return 0;
      const position = a.secEl.compareDocumentPosition(b.secEl);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    activeSteps = resolved;

    // Attach Desktop Hover (150ms debounce) & Mobile Tap listeners
    activeSteps.forEach((s, idx) => {
      const cardEl = s.secEl;
      if (!cardEl || cardEl.dataset.ollieCardBound) return;
      cardEl.dataset.ollieCardBound = 'true';

      // Desktop: mouseenter with 150ms debounce
      cardEl.addEventListener('mouseenter', function () {
        if (!isDesktopDevice()) return;
        if (isTour || modalActive || isHidden) return;
        clearTimeout(hoverDebounceTimer);
        hoverDebounceTimer = setTimeout(function () {
          isCurrentlyHoveringCard = true;
          activateStep(idx, true);
        }, 150);
      }, { passive: true });

      cardEl.addEventListener('mouseleave', function () {
        if (isDesktopDevice()) {
          clearTimeout(hoverDebounceTimer);
          isCurrentlyHoveringCard = false;
        }
      }, { passive: true });

      // Mobile / Touch: tap/click on card immediately jumps to it and pauses auto-hop 10s
      cardEl.addEventListener('click', function () {
        if (isDesktopDevice()) return;
        if (isTour || modalActive || isHidden) return;
        activateStep(idx, true);
      }, { passive: true });

      cardEl.addEventListener('focusin', function () {
        if (isTour || modalActive || isHidden) return;
        activateStep(idx, true);
      }, { passive: true });
    });

    // Debug logging when ?ollie-debug=1 is set
    if (isDebug) {
      console.group('🦉 [Ollie Guide Debugger]');
      console.log('Current URL Path:', currentPath);
      console.log('Active Steps Resolved (DOM Order):', activeSteps.length);
      activeSteps.forEach((s, idx) => {
        console.log(`[${idx + 1}] ${s.isFallback ? '⚡ (Auto Fallback)' : '✓ (Custom Step)'} [${s.group || 'single'}] ${s.title || s.id}`);
        console.log(`    Section:`, s.secEl);
        console.log(`    Target:`, s.targetEl);
        console.log(`    Message: "${s.text}"`);
      });
      if (missingCustomSteps.length > 0) {
        console.warn('⚠️ Custom steps defined for this page but missing in DOM:', missingCustomSteps.map(m => m.id));
      }
      console.groupEnd();
    }

    if (currentStepIdx < 0 && activeSteps.length > 0) {
      pickSectionByScroll();
      if (currentStepIdx < 0) {
        activateStep(0, false);
      }
    } else {
      placeOllieAndBubble();
    }
  }

  // 8. BOOKING POPUP MODAL MONITOR
  function checkBookingModal() {
    const modal = document.getElementById('book-demo');
    const wasModalActive = modalActive;
    const isTarget = location.hash === '#book-demo';
    const isOpen = Boolean(modal && (isTarget || modal.classList.contains('open') || window.getComputedStyle(modal).display === 'flex'));

    modalActive = isOpen;
    document.body.classList.toggle('ollie-modal-active', modalActive);

    if (modalActive && !wasModalActive) {
      clearTimeout(groupHopTimer);
      const modalStep = CUSTOM_STEPS.find(s => s.id === 'modal-booking');
      if (modalStep) {
        sayMessage(modalStep.text);
        if (highlightedEl) highlightedEl.classList.remove('ollie-hl');
        highlightedEl = document.querySelector('#booking-form button[type="submit"]');
        if (highlightedEl) highlightedEl.classList.add('ollie-hl');
      }
      placeOllieAndBubble();
    } else if (!modalActive && wasModalActive) {
      pickSectionByScroll();
    }
  }

  // 9. GLOBAL BUTTON CLICK REACTION ("Great choice!")
  function attachButtonReaction() {
    document.addEventListener('click', function (event) {
      const btn = event.target.closest('a.btn, button.btn, .mjm-btn, .foundation-btn, .foundation-card-cta, .program-cta');
      if (btn && !btn.closest('#ollie-owl, #ollie-bub')) {
        jumpReaction('Great choice! Opening the details for you now.');
      }
    }, { capture: true, passive: true });
  }

  // 10. INITIALIZATION & OBSERVERS
  let scanDebounce = null;
  function triggerRescan() {
    clearTimeout(scanDebounce);
    scanDebounce = setTimeout(function () {
      checkBookingModal();
      scanAndResolveSteps();
    }, 120);
  }

  function initOllie() {
    createOllieDOM();
    scanAndResolveSteps();
    checkBookingModal();
    attachButtonReaction();

    window.addEventListener('scroll', onScrollHandler, { passive: true });
    window.addEventListener('resize', function () {
      placeOllieAndBubble();
    }, { passive: true });

    window.addEventListener('hashchange', function () {
      checkBookingModal();
      triggerRescan();
    });

    ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, function () {
        if (isTour) stopTour();
      }, { passive: true });
    });

    const observer = new MutationObserver(function (mutations) {
      for (const m of mutations) {
        if (m.target && (m.target.id === 'ollie-owl' || m.target.id === 'ollie-bub' || m.target.closest?.('#ollie-owl, #ollie-bub'))) {
          continue;
        }
        triggerRescan();
        break;
      }
    });

    const rootTarget = document.getElementById('app') || document.body;
    observer.observe(rootTarget, { childList: true, subtree: true });

    setTimeout(function () {
      if (!isHidden) {
        activateStep(0, false);
      }
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOllie);
  } else {
    initOllie();
  }
})();
