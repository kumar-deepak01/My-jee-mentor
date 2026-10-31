/**
 * ============================================================================
 * Ollie the Owl - Interactive Website Guide
 * My JEE Mentor (JEE, NEET & Foundation)
 *
 * Requirements:
 * 1. Exact SVG, flying / wing-flap / bob / jump animations, and tour behavior.
 * 2. Debounced MutationObserver for dynamic SPA renders from main.js.
 * 3. Complete exclusion on portal / admin / exam routes.
 * 4. Separate steps for each faculty member with real qualifications.
 * 5. Strict adherence to site facts, batch sizes, and phone/WhatsApp numbers.
 * 6. Dynamic booking modal handling and mobile-bar safe docking.
 * 7. Steps ordered strictly according to DOM document order.
 * 8. Robust auto-explainer fallback and ?ollie-debug=1 console logger.
 * ============================================================================
 */

(function () {
  'use strict';

  // 1. ROUTE EXCLUSION GUARD
  // Exclude Ollie completely on fees, login, test, and classroom routes.
  const path = (location.pathname || '').toLowerCase();
  if (
    path.includes('fees') ||
    path.includes('login') ||
    path.includes('test') ||
    path.includes('classroom') ||
    path.includes('student-login')
  ) {
    return;
  }

  // Official contact information
  const WA_NUMBER = '917304256203';
  const PHONE_NUMBER = '+91 73042 56203';
  const isDebug = new URLSearchParams(location.search).get('ollie-debug') === '1';

  // ==========================================================================
  // CONFIGURATION: CUSTOM_STEPS
  // Real site information only: verified names, course details, faculty, & batches.
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
    {
      id: 'home-card-jee',
      page: '/',
      section: '.mjm-card.jee',
      target: '.mjm-card.jee .mjm-btn',
      title: 'JEE 2026-27 Card',
      text: 'This is our JEE 2026-27 program with max 10 students per batch. You get Physics, Chemistry and Math live classes, personal mentor tracking, regular tests and daily DPPs. Click Explore Now for full details.'
    },
    {
      id: 'home-card-neet',
      page: '/',
      section: '.mjm-card.neet',
      target: '.mjm-card.neet .mjm-btn',
      title: 'NEET 2026-27 Card',
      text: 'This is our NEET 2026-27 program for medical aspirants. Learn Physics, Chemistry and Biology with dedicated personal mentorship for every doubt and NCERT practice. Click Explore Now to see details.'
    },
    {
      id: 'home-card-foundation',
      page: '/',
      section: '.mjm-card.foundation',
      target: '.mjm-card.foundation .mjm-btn',
      title: 'Foundation Card',
      text: 'This is our Foundation program for Classes 7 to 10. We build rock-solid concepts in Science, Maths, Social Science and English with max 10 students per batch. Click Explore Now to view courses.'
    },
    {
      id: 'home-reviews',
      page: '/',
      section: 'section.mjm-reviews-section',
      target: '.mjm-review-card:first-child',
      title: 'Parents & Students Reviews',
      text: 'Read genuine reviews from parents and students who experienced our small 10-student batches, daily DPPs, and fast doubt resolution. Click any card to read their stories.'
    },
    // Faculty individual cards on Home
    {
      id: 'faculty-ayushi',
      page: '*',
      section: '.faculty-card[data-faculty-id="ayushi"]',
      target: '.faculty-card[data-faculty-id="ayushi"]',
      title: 'Dr. Ayushi Aggarwal',
      text: 'Dr. Ayushi Aggarwal (Ph.D., M.Sc. Gold Medalist) mentors Chemistry and Biology with 8+ years experience at premier national institutes, guiding 500+ JEE and NEET qualifiers with deep conceptual clarity.'
    },
    {
      id: 'faculty-anil',
      page: '*',
      section: '.faculty-card[data-faculty-id="anil"]',
      target: '.faculty-card[data-faculty-id="anil"]',
      title: 'Anil Kumar Singh',
      text: 'Anil Kumar Singh brings 9+ years of senior faculty experience in JEE Main and Advanced Mathematics, specializing in Calculus, Algebra, and Coordinate Geometry to help students achieve 99+ percentile scores.'
    },
    {
      id: 'faculty-lokesh',
      page: '*',
      section: '.faculty-card[data-faculty-id="lokesh"]',
      target: '.faculty-card[data-faculty-id="lokesh"]',
      title: 'Lokesh Gupta',
      text: 'Lokesh Gupta has 7+ years experience training JEE and NEET aspirants in Physics. He specializes in Mechanics, Electrodynamics, and systematic numerical breakdown for top competitive scores.'
    },
    {
      id: 'faculty-soujanya',
      page: '*',
      section: '.faculty-card[data-faculty-id="soujanya"]',
      target: '.faculty-card[data-faculty-id="soujanya"]',
      title: 'Soujanya Mondal',
      text: 'Soujanya Mondal holds an M.Sc. in Chemistry from NIT Warangal and qualified IIT JAM 2023. With senior faculty experience at Unacademy and Allen Chennai, he makes complex chemistry intuitive and scoring.'
    },
    {
      id: 'faculty-shubham',
      page: '*',
      section: '.faculty-card[data-faculty-id="shubham"]',
      target: '.faculty-card[data-faculty-id="shubham"]',
      title: 'Shubham Kumar',
      text: 'Shubham Kumar has 6+ years experience mentoring Classes 7 to 10 in Science, Mathematics, and Logical Reasoning, building strong fundamentals for school exams and Olympiads.'
    },
    {
      id: 'faculty-cta-step',
      page: '*',
      section: '.mjm-faculty-section .faculty-cta-bar',
      target: '.mjm-faculty-section .faculty-cta-bar .btn-primary',
      title: 'Faculty Free Demo Booking',
      text: 'Our subject mentors teach in small batches of max 10 students for real personal attention. Click Book Free Demo Session to reserve your student’s counseling and demo class.'
    },
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
      target: '.shared-resources-section .btn-primary',
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
      section: '.resource-grid .resource-card:nth-child(1)',
      target: '.resource-grid .resource-card:nth-child(1) .btn-primary',
      title: 'JEE Foundation Batch',
      text: 'The Foundation Batch builds JEE concepts from the basics, taught step by step in small batches of max 10 students with personal attention. Click Book Free Demo to reserve your seat.'
    },
    {
      id: 'jee-batch-2',
      page: '/jee.html',
      section: '.resource-grid .resource-card:nth-child(2)',
      target: '.resource-grid .resource-card:nth-child(2) .btn-primary',
      title: 'JEE Booster Batch',
      text: 'The Booster Batch is designed to accelerate problem solving, clear backlogs, and strengthen weak topics with rigorous DPPs and regular tests. Click Book Free Demo to get started.'
    },
    {
      id: 'jee-batch-3',
      page: '/jee.html',
      section: '.resource-grid .resource-card:nth-child(3)',
      target: '.resource-grid .resource-card:nth-child(3) .btn-primary',
      title: 'JEE Premium Batch',
      text: 'Our Premium Batch offers customized learning plans, direct teacher access, and one-on-one personal mentoring for dedicated IIT aspirants. Click Book Free Demo to learn more.'
    },
    {
      id: 'jee-batch-4',
      page: '/jee.html',
      section: '.resource-grid .resource-card:nth-child(4)',
      target: '.resource-grid .resource-card:nth-child(4) .btn-primary',
      title: 'JEE Ranker Batch',
      text: 'The Ranker Batch for IIT-JEE 2027 focuses on advanced problem solving, weekly rank analysis, and intense practice for top 1% rank aspirants. Click Book Free Demo to join.'
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
      section: '.resource-grid .resource-card:nth-child(1)',
      target: '.resource-grid .resource-card:nth-child(1) .btn-primary',
      title: 'NEET Personal Mentorship Batch',
      text: 'Our Personal Mentorship Batch is strictly limited to max 5 students. Get one-to-one mentoring, direct teacher support, and priority doubt solving. Click Book Free Demo to join.'
    },
    {
      id: 'neet-batch-2',
      page: '/neet.html',
      section: '.resource-grid .resource-card:nth-child(2)',
      target: '.resource-grid .resource-card:nth-child(2) .btn-primary',
      title: 'NEET Foundation Batch',
      text: 'The NEET Foundation Batch focuses on deep conceptual understanding from NCERT basics with regular practice and small batches of max 10 students. Click Book Free Demo to start.'
    },
    {
      id: 'neet-batch-3',
      page: '/neet.html',
      section: '.resource-grid .resource-card:nth-child(3)',
      target: '.resource-grid .resource-card:nth-child(3) .btn-primary',
      title: 'NEET One to One Program',
      text: 'The One to One Program offers 100% personalized attention with a dedicated mentor and custom learning plan tailored to your medical entrance goals. Click Book Free Demo to enroll.'
    },
    {
      id: 'neet-batch-4',
      page: '/neet.html',
      section: '.resource-grid .resource-card:nth-child(4)',
      target: '.resource-grid .resource-card:nth-child(4) .btn-primary',
      title: 'NEET Ranker Batch',
      text: 'The Ranker Batch for NEET 2027 provides advanced MCQ practice and weekly test analysis for ambitious medical aspirants. Click Book Free Demo to reserve your batch.'
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
      id: 'foundation-card-7',
      page: '/foundation.html',
      section: '.foundation-card-7',
      target: '.foundation-card-7 .foundation-card-cta',
      title: 'Class 7 Foundation',
      text: 'Class 7 Foundation focuses on fundamental Science, Mathematics, and Olympiad problem-solving skills with max 10 students per batch. Click Book Free Demo to learn more.'
    },
    {
      id: 'foundation-card-8',
      page: '/foundation.html',
      section: '.foundation-card-8',
      target: '.foundation-card-8 .foundation-card-cta',
      title: 'Class 8 Foundation',
      text: 'Class 8 Foundation introduces algebraic logic, physical sciences, and analytical thinking with dedicated mentor guidance. Click Book Free Demo to explore.'
    },
    {
      id: 'foundation-card-9',
      page: '/foundation.html',
      section: '.foundation-card-9',
      target: '.foundation-card-9 .foundation-card-cta',
      title: 'Class 9 Foundation',
      text: 'Class 9 Foundation builds core scientific principles and higher-order math skills essential for board exams and competitive exams. Click Book Free Demo to join.'
    },
    {
      id: 'foundation-card-10',
      page: '/foundation.html',
      section: '.foundation-card-10',
      target: '.foundation-card-10 .foundation-card-cta',
      title: 'Class 10 Foundation',
      text: 'Class 10 Foundation provides thorough board exam preparation alongside early bridge concepts for Class 11 JEE and NEET. Click Book Free Demo to reserve your demo.'
    },
    {
      id: 'foundation-why',
      page: '/foundation.html',
      section: 'section.foundation-why',
      target: '.foundation-why-card:first-child',
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
      text: 'Check if this program fits your needs: ideal for students with concept backlogs, independent question-solving struggles, or needing personal accountability. Review the details above.'
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
      section: '.resource-filter-bar',
      target: '[data-resource-search]',
      title: 'Resource Search Bar',
      text: 'Use this search bar and category filter to quickly find study notes and practice sheets for JEE, NEET, or Foundation. Type a subject to filter.'
    },
    {
      id: 'freeresource-grid',
      page: '/freeresource.html',
      section: '[data-public-resources]',
      target: '[data-public-resources] .btn',
      title: 'Public Resources Grid',
      text: 'Browse our curated study material. Click Open Resource or Download to view PDF notes and formula summaries directly in your browser.'
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

  // Read stored hide preference
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

    // Attach guide listeners
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
    void owlEl.offsetWidth; // force reflow
    owlEl.style.transition = '';

    if (!isHidden) {
      bubEl.hidden = false;
    }
  }

  // 3. TARGET POSITION & PLACEMENT CALCULATOR
  function getActiveTargetElement() {
    if (modalActive) {
      return document.querySelector('#booking-form button[type="submit"]') || document.querySelector('#book-demo');
    }
    if (currentStepIdx < 0 || currentStepIdx >= activeSteps.length) {
      return null;
    }
    const step = activeSteps[currentStepIdx];
    return step.targetEl || step.secEl;
  }

  function placeOllieAndBubble() {
    if (!owlEl || !bubEl) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 640;

    let targetX;
    let targetY;

    if (isHidden) {
      // Dock neatly above the floating .mobile-bar or in bottom-right corner
      owlEl.classList.add('ollie-docked');
      targetX = vw - 88;
      targetY = isMobile ? vh - 146 : vh - 110;
      bubEl.hidden = true;
    } else {
      owlEl.classList.remove('ollie-docked');
      bubEl.hidden = false;

      const target = getActiveTargetElement();
      if (!target) {
        targetX = vw - 96;
        targetY = vh - 120;
      } else {
        const rect = target.getBoundingClientRect();
        targetX = rect.right + 12;
        targetY = rect.top + rect.height / 2 - 46;

        // If target touches right edge, place Ollie on the left
        if (targetX > vw - 94) {
          targetX = rect.left - 92;
        }
        // If cramped on both sides, center above target
        if (targetX < 8) {
          targetX = Math.max(8, rect.left + rect.width / 2 - 42);
          targetY = rect.top - 100;
        }
      }

      // Keep Ollie inside viewport bounds safely
      targetX = Math.min(Math.max(8, targetX), vw - 90);
      const bottomLimit = isMobile ? vh - 220 : vh - 108;
      targetY = Math.min(Math.max(68, targetY), Math.max(70, bottomLimit));

      // Desktop bubble placement relative to Ollie
      if (!isMobile) {
        const bw = bubEl.offsetWidth || 300;
        const bh = bubEl.offsetHeight || 100;
        const bx = Math.min(Math.max(12, targetX + 42 - bw / 2), vw - bw - 14);
        const by = targetY > bh + 24 ? targetY - bh - 8 : targetY + 104;
        bubEl.style.transform = `translate(${bx}px, ${by}px)`;
      }
    }

    // Trigger wing flap during flight
    owlEl.classList.add('ollie-fly');
    clearTimeout(flyTimer);
    flyTimer = setTimeout(function () {
      owlEl.classList.remove('ollie-fly');
    }, 950);

    owlEl.style.transform = `translate(${targetX}px, ${targetY}px)`;
  }

  function sayMessage(text) {
    if (!txtEl) return;
    txtEl.textContent = text;
    txtEl.classList.remove('ollie-pop');
    void txtEl.offsetWidth; // retrigger animation
    txtEl.classList.add('ollie-pop');
  }

  function activateStep(index) {
    if (index === currentStepIdx && !modalActive) return;
    if (index < 0 || index >= activeSteps.length) return;

    if (highlightedEl) {
      highlightedEl.classList.remove('ollie-hl');
    }

    currentStepIdx = index;
    const step = activeSteps[index];

    sayMessage(step.text);

    highlightedEl = step.targetEl || step.secEl;
    if (highlightedEl) {
      highlightedEl.classList.remove('ollie-hl');
      void highlightedEl.offsetWidth;
      highlightedEl.classList.add('ollie-hl');
    }

    placeOllieAndBubble();
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

    activateStep(stepIdx);
    const step = activeSteps[stepIdx];
    const el = step.secEl || step.targetEl;

    if (el) {
      if (stepIdx === 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const dwellTime = 3000 + (step.text ? step.text.length * 48 : 2000);
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

  // 4. SCROLL PICKER (Section crossing 45% viewport height)
  function pickSectionByScroll() {
    if (isHidden || isTour || modalActive || activeSteps.length === 0) return;

    const line = window.innerHeight * 0.45;

    for (let i = 0; i < activeSteps.length; i++) {
      const step = activeSteps[i];
      const el = step.secEl || step.targetEl;
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      if (rect.top <= line && rect.bottom >= line) {
        activateStep(i);
        return;
      }
    }
  }

  function onScrollHandler() {
    if (isTick) return;
    isTick = true;
    requestAnimationFrame(function () {
      isTick = false;
      if (isHidden) return;
      if (!isTour) {
        pickSectionByScroll();
      }
      placeOllieAndBubble();
    });
  }

  // 5. AUTO-EXPLAINER FALLBACK ENGINE
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

  // 6. DYNAMIC SCANNER & MUTATIONOBSERVER
  function scanAndResolveSteps() {
    const currentPath = location.pathname || '/';
    const resolved = [];
    const matchedElements = new Set();
    const missingCustomSteps = [];

    // Step A: Match Hand-Crafted Steps
    for (const step of CUSTOM_STEPS) {
      // Check page match
      if (step.page !== '*' && step.page !== currentPath) {
        continue;
      }

      // Check section element
      let secEl = null;
      try {
        secEl = document.querySelector(step.section);
      } catch (err) {}

      if (!secEl) {
        missingCustomSteps.push(step);
        continue;
      }

      // Check target button element
      let targetEl = null;
      if (step.target) {
        try {
          targetEl = secEl.matches(step.target) ? secEl : secEl.querySelector(step.target);
        } catch (err) {}
      }

      resolved.push({
        ...step,
        secEl: secEl,
        targetEl: targetEl || secEl,
        isFallback: false
      });
      matchedElements.add(secEl);
    }

    // Step B: Auto-Explainer Fallback for unmapped main sections/articles
    const candidates = document.querySelectorAll('main > section, section.section, .mjm-card, .foundation-card, .resource-card');
    candidates.forEach(function (elem) {
      if (elem.closest('#book-demo, #ollie-owl, #ollie-bub, header, footer')) return;
      if (matchedElements.has(elem)) return;

      // Ensure this element is not inside an already-matched section
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

    // Debug logging when ?ollie-debug=1 is set
    if (isDebug) {
      console.group('🦉 [Ollie Guide Debugger]');
      console.log('Current URL Path:', currentPath);
      console.log('Active Steps Resolved (DOM Order):', activeSteps.length);
      activeSteps.forEach((s, idx) => {
        console.log(`[${idx + 1}] ${s.isFallback ? '⚡ (Auto Fallback)' : '✓ (Custom Step)'} ${s.title || s.id}`);
        console.log(`    Section:`, s.secEl);
        console.log(`    Target:`, s.targetEl);
        console.log(`    Message: "${s.text}"`);
      });
      if (missingCustomSteps.length > 0) {
        console.warn('⚠️ Custom steps defined for this page but missing in DOM:', missingCustomSteps.map(m => m.id));
      }
      console.groupEnd();
    }

    // If no step is active yet, activate first section or pick current view
    if (currentStepIdx < 0 && activeSteps.length > 0) {
      pickSectionByScroll();
      if (currentStepIdx < 0) {
        activateStep(0);
      }
    } else {
      placeOllieAndBubble();
    }
  }

  // 7. BOOKING POPUP MODAL MONITOR
  function checkBookingModal() {
    const modal = document.getElementById('book-demo');
    const wasModalActive = modalActive;
    const isTarget = location.hash === '#book-demo';
    const isOpen = Boolean(modal && (isTarget || modal.classList.contains('open') || window.getComputedStyle(modal).display === 'flex'));

    modalActive = isOpen;
    document.body.classList.toggle('ollie-modal-active', modalActive);

    if (modalActive && !wasModalActive) {
      // Find modal step
      const modalStep = CUSTOM_STEPS.find(s => s.id === 'modal-booking');
      if (modalStep) {
        sayMessage(modalStep.text);
        if (highlightedEl) highlightedEl.classList.remove('ollie-hl');
        highlightedEl = document.querySelector('#booking-form button[type="submit"]');
        if (highlightedEl) highlightedEl.classList.add('ollie-hl');
      }
      placeOllieAndBubble();
    } else if (!modalActive && wasModalActive) {
      // Modal closed: return to active section
      pickSectionByScroll();
    }
  }

  // 8. GLOBAL BUTTON CLICK REACTION ("Great choice!")
  function attachButtonReaction() {
    document.addEventListener('click', function (event) {
      const btn = event.target.closest('a.btn, button.btn, .mjm-btn, .foundation-btn, .foundation-card-cta');
      if (btn && !btn.closest('#ollie-owl, #ollie-bub')) {
        jumpReaction('Great choice! Opening the details for you now.');
      }
    }, { capture: true, passive: true });
  }

  // 9. INITIALIZATION & OBSERVERS
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

    // Scroll, resize, and interaction listeners
    window.addEventListener('scroll', onScrollHandler, { passive: true });
    window.addEventListener('resize', placeOllieAndBubble, { passive: true });
    window.addEventListener('hashchange', function () {
      checkBookingModal();
      triggerRescan();
    });

    ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, function () {
        if (isTour) stopTour();
      }, { passive: true });
    });

    // Debounced MutationObserver on dynamic rendering containers
    const observer = new MutationObserver(function (mutations) {
      for (const m of mutations) {
        // Skip mutations caused by Ollie's own nodes
        if (m.target && (m.target.id === 'ollie-owl' || m.target.id === 'ollie-bub' || m.target.closest?.('#ollie-owl, #ollie-bub'))) {
          continue;
        }
        triggerRescan();
        break;
      }
    });

    const rootTarget = document.getElementById('app') || document.body;
    observer.observe(rootTarget, { childList: true, subtree: true });

    // Initial entrance animation
    setTimeout(function () {
      if (!isHidden) {
        activateStep(0);
      }
    }, 600);
  }

  // Start after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOllie);
  } else {
    initOllie();
  }
})();
