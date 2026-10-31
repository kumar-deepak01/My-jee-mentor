/**
 * My JEE Mentor - Shared Faculty Data & Component
 * Used across Home, JEE, NEET, Foundation, and Our Faculty pages.
 */

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

export const FACULTY = [
  {
    id: 'ayushi',
    firstName: 'Dr. Ayushi',
    lastName: 'Aggarwal',
    degree: 'Ph.D., M.Sc. (Gold Medalist)',
    tag: 'Chemistry & Biology · JEE & NEET',
    quote: 'True rank-level excellence begins with absolute conceptual clarity from fundamentals.',
    points: [
      { label: 'Education', text: 'Ph.D. & M.Sc. in Sciences (Gold Medalist)' },
      { label: 'Experience', text: '8+ years teaching experience at premier national coaching institutes' },
      { label: 'Known for', text: 'Step-by-step conceptual clarity, structured notes & interactive doubt solving' },
      { label: 'Achievement', text: 'Mentored 500+ successful aspirants qualifying JEE & NEET with top scores' }
    ],
    chips: ['JEE & NEET', 'Concept Clarity', 'NCERT In-depth', 'Doubt Specialist'],
    photo: '/images/faculty/ayushi.jpg',
    initials: 'AA',
    courses: ['jee', 'neet']
  },
  {
    id: 'anil',
    firstName: 'Anil Kumar',
    lastName: 'Singh',
    degree: 'B.Tech / M.Sc. (Mathematics)',
    tag: 'Mathematics · JEE',
    quote: 'Mathematics is not about memorizing formulas; it is about recognizing patterns and mastering logical deduction.',
    points: [
      { label: 'Education', text: 'Engineering / Advanced Degree in Pure & Applied Mathematics' },
      { label: 'Experience', text: 'Senior Mathematics Faculty for JEE Main & Advanced with 9+ years experience' },
      { label: 'Known for', text: 'Calculus, Algebra, Coordinate Geometry & high-speed problem-solving tricks' },
      { label: 'Achievement', text: 'Guided multiple batches to 99+ percentile scores in JEE Mathematics' }
    ],
    chips: ['Mathematics', 'JEE Main & Adv', 'Calculus Mastery', '99+ Percentile Mentor'],
    photo: '/images/faculty/anil.jpg',
    initials: 'AS',
    courses: ['jee']
  },
  {
    id: 'lokesh',
    firstName: 'Lokesh',
    lastName: 'Gupta',
    degree: 'B.Tech / M.Sc. (Physics)',
    tag: 'Physics · JEE & NEET',
    quote: 'Physics becomes intuitive when you see how physical laws govern the real world and everyday phenomena.',
    points: [
      { label: 'Education', text: 'B.Tech / Masters in Physics with strong engineering foundation' },
      { label: 'Experience', text: '7+ years training JEE & NEET aspirants across leading coaching centers' },
      { label: 'Known for', text: 'Mechanics, Electrodynamics, Optics & systematic numerical breakdown' },
      { label: 'Achievement', text: 'Trained hundreds of top qualifiers scoring 150+ in NEET & top JEE percentiles' }
    ],
    chips: ['Physics', 'JEE Main & Adv', 'NEET-UG', 'Mechanics Specialist'],
    photo: '/images/faculty/lokesh.jpg',
    initials: 'LG',
    courses: ['jee', 'neet']
  },
  {
    id: 'soujanya',
    firstName: 'Soujanya',
    lastName: 'Mondal',
    degree: 'M.Sc. (Chemistry), NIT Warangal',
    tag: 'Chemistry · JEE & NEET',
    quote: 'Chemistry becomes effortless when concepts connect visually instead of just memorizing reactions.',
    points: [
      { label: 'Education', text: 'M.Sc. Chemistry NIT Warangal, B.Sc. Chemistry University of Burdwan' },
      { label: 'Experience', text: 'Senior Faculty Chemistry JEE & NEET at Unacademy, pehle ALLEN Career Institute Chennai' },
      { label: 'Known for', text: 'Complex chemistry concepts ko simple aur intuitive banana' },
      { label: 'Achievement', text: 'IIT JAM qualified 2023, Additional Secretary Society of Chemistry NITW' }
    ],
    chips: ['Chemistry', 'JEE Main & Adv', 'NEET-UG', 'IIT JAM Qualified', 'NIT Warangal'],
    photo: '/images/faculty/soujanya.jpg',
    initials: 'SM',
    courses: ['jee', 'neet']
  },
  {
    id: 'shubham',
    firstName: 'Shubham',
    lastName: 'Kumar',
    degree: 'B.Sc. / B.Ed. (Foundation Sciences & Math)',
    tag: 'Foundation · Class 7–10',
    quote: 'Building solid curiosity and fundamentals in middle school creates confident future achievers.',
    points: [
      { label: 'Education', text: 'Bachelor of Science (B.Sc.) & Academic Pedagogy Training' },
      { label: 'Experience', text: '6+ years dedicated to Science, Mathematics & Logical Reasoning for Class 7–10' },
      { label: 'Known for', text: 'Friendly mentoring, patient doubt resolution & foundation building' },
      { label: 'Achievement', text: 'Helped numerous students top school boards and excel in Olympiad competitions' }
    ],
    chips: ['Class 7–10', 'Maths & Science', 'Olympiad Base', 'Concept Builder'],
    photo: '/images/faculty/default-avatar.png',
    initials: 'SK',
    courses: ['foundation']
  }
];

export const facultyStyles = `
<style>
  .mjm-faculty-section {
    position: relative;
    padding: 60px 20px 72px;
    font-family: 'Montserrat', system-ui, sans-serif;
  }
  .mjm-faculty-container {
    max-width: 1560px;
    margin: 0 auto;
  }
  .mjm-faculty-header {
    text-align: center;
    margin-bottom: 42px;
  }
  .mjm-faculty-title {
    font-family: 'Montserrat', system-ui, sans-serif;
    font-size: clamp(28px, 4vw, 42px);
    font-weight: 900;
    color: #1c1917;
    line-height: 1.2;
    margin: 0 0 10px;
    letter-spacing: -0.01em;
  }
  .mjm-faculty-title span {
    color: #ea580c;
    text-shadow: 0 2px 10px rgba(234, 88, 12, 0.18);
  }
  .mjm-faculty-subtitle {
    font-size: 15.5px;
    color: #5c4a3f;
    margin: 0;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .mjm-faculty-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .mjm-faculty-grid.grid-count-1 {
    max-width: 480px;
    margin: 0 auto;
    grid-template-columns: 1fr;
  }
  .mjm-faculty-grid.grid-count-2 {
    max-width: 960px;
    margin: 0 auto;
    grid-template-columns: repeat(2, 1fr);
  }
  .mjm-faculty-grid.grid-count-4 {
    grid-template-columns: repeat(2, 1fr);
    max-width: 1040px;
    margin: 0 auto;
  }
  .mjm-faculty-card {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    padding: 30px 26px 24px;
    display: flex;
    flex-direction: column;
    border-radius: 26px;
    color: #1c1917;
    background:
      radial-gradient(circle at 85% 15%, rgba(254, 215, 170, 0.40) 0%, transparent 50%),
      linear-gradient(180deg, #ffffff 0%, #fffbf8 55%, #ffedd5 100%);
    border: 1px solid rgba(234, 88, 12, 0.32);
    box-shadow: 0 16px 38px -10px rgba(234, 88, 12, 0.18), 0 4px 14px rgba(0, 0, 0, 0.04);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    box-sizing: border-box;
  }
  .mjm-faculty-card::before {
    content: "";
    position: absolute;
    inset: 10px;
    border-radius: 18px;
    border: 1px solid rgba(234, 88, 12, 0.18);
    pointer-events: none;
    z-index: 0;
  }
  .mjm-faculty-card:hover {
    transform: translateY(-5px);
    border-color: rgba(234, 88, 12, 0.55);
    box-shadow: 0 24px 48px -10px rgba(234, 88, 12, 0.28), 0 8px 22px rgba(0, 0, 0, 0.08);
  }
  .faculty-photo-wrap {
    width: 124px;
    height: 124px;
    border-radius: 50%;
    padding: 3.5px;
    background: linear-gradient(145deg, #fb923c, #ea580c);
    box-shadow: 0 8px 22px -3px rgba(234, 88, 12, 0.38), inset 0 2px 4px rgba(255, 255, 255, 0.6);
    margin: 0 auto 14px;
    position: relative;
    flex-shrink: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .faculty-photo {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    object-position: center top;
    display: block;
    background: #ffffff;
  }
  .faculty-initials-fallback {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ff9e58 0%, #ea580c 58%, #b83a00 100%);
    color: #ffffff;
    font-weight: 800;
    font-size: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: 1px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  }
  .faculty-tag {
    display: inline-flex;
    align-self: center;
    margin: 0 auto 12px;
    padding: 5px 14px;
    border-radius: 999px;
    background: linear-gradient(180deg, #f97316 0%, #ea580c 100%);
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    box-shadow: 0 3px 10px rgba(234, 88, 12, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.45);
    z-index: 1;
    position: relative;
  }
  .faculty-name {
    text-align: center;
    font-size: 22px;
    font-weight: 800;
    color: #1c1917;
    margin: 0 0 4px;
    line-height: 1.25;
    z-index: 1;
    position: relative;
  }
  .faculty-surname {
    color: #ea580c;
  }
  .faculty-degree {
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #78350f;
    margin: 0 0 16px;
    line-height: 1.35;
    z-index: 1;
    position: relative;
  }
  .faculty-quote {
    position: relative;
    background: rgba(254, 215, 170, 0.35);
    border-left: 3.5px solid #ea580c;
    border-radius: 0 12px 12px 0;
    padding: 10px 14px;
    margin: 0 0 18px;
    font-size: 12.5px;
    line-height: 1.55;
    color: #431407;
    font-style: italic;
    font-weight: 600;
    z-index: 1;
  }
  .faculty-quote::before {
    content: "“";
    font-size: 20px;
    line-height: 0;
    position: relative;
    top: 3px;
    margin-right: 3px;
    color: #ea580c;
    font-weight: 900;
  }
  .faculty-quote::after {
    content: "”";
    font-size: 20px;
    line-height: 0;
    position: relative;
    top: 3px;
    margin-left: 3px;
    color: #ea580c;
    font-weight: 900;
  }
  .faculty-points {
    list-style: none;
    padding: 0;
    margin: 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-grow: 1;
    z-index: 1;
    position: relative;
  }
  .faculty-point {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 12.5px;
    line-height: 1.52;
    color: #292524;
  }
  .faculty-point-bullet {
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: linear-gradient(180deg, #f97316, #ea580c);
    color: #ffffff;
    font-size: 10px;
    font-weight: 900;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
    box-shadow: 0 2px 5px rgba(234, 88, 12, 0.35);
  }
  .faculty-point-content {
    min-width: 0;
  }
  .faculty-point-label {
    font-weight: 800;
    color: #1c1917;
    margin-right: 4px;
  }
  .faculty-point-text {
    color: #44403c;
    font-weight: 500;
  }
  .faculty-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px dashed rgba(234, 88, 12, 0.22);
    z-index: 1;
    position: relative;
  }
  .faculty-chip {
    font-size: 11px;
    font-weight: 700;
    color: #9a3412;
    background: #ffedd5;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(234, 88, 12, 0.25);
    letter-spacing: 0.02em;
  }

  /* Dark theme & Foundation page overrides */
  body.foundation-page .mjm-faculty-title {
    color: #ffffff;
  }
  body.foundation-page .mjm-faculty-subtitle {
    color: #d3c9e2;
  }
  html.dark-theme .mjm-faculty-title {
    color: #f8fafc;
  }
  html.dark-theme .mjm-faculty-subtitle {
    color: #cbd5e1;
  }
  html.dark-theme .mjm-faculty-card {
    background:
      radial-gradient(circle at 85% 15%, rgba(234, 88, 12, 0.15) 0%, transparent 50%),
      linear-gradient(180deg, #18202c 0%, #131924 100%);
    border-color: rgba(234, 88, 12, 0.35);
    color: #f1f5f9;
    box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(234, 88, 12, 0.10);
  }
  html.dark-theme .mjm-faculty-card::before {
    border-color: rgba(234, 88, 12, 0.20);
  }
  html.dark-theme .mjm-faculty-card:hover {
    border-color: rgba(234, 88, 12, 0.65);
    box-shadow: 0 22px 48px -10px rgba(0, 0, 0, 0.65), 0 0 26px rgba(234, 88, 12, 0.20);
  }
  html.dark-theme .faculty-name {
    color: #f8fafc;
  }
  html.dark-theme .faculty-degree {
    color: #fed7aa;
  }
  html.dark-theme .faculty-quote {
    background: rgba(234, 88, 12, 0.16);
    color: #ffedd5;
    border-left-color: #f97316;
  }
  html.dark-theme .faculty-point {
    color: #e2e8f0;
  }
  html.dark-theme .faculty-point-label {
    color: #f8fafc;
  }
  html.dark-theme .faculty-point-text {
    color: #cbd5e1;
  }
  html.dark-theme .faculty-chips {
    border-top-color: rgba(234, 88, 12, 0.30);
  }
  html.dark-theme .faculty-chip {
    background: rgba(234, 88, 12, 0.18);
    color: #fed7aa;
    border-color: rgba(234, 88, 12, 0.35);
  }

  @media (max-width: 1180px) {
    .mjm-faculty-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
  }
  @media (max-width: 680px) {
    .mjm-faculty-section {
      padding: 40px 16px 52px;
    }
    .mjm-faculty-header {
      margin-bottom: 28px;
    }
    .mjm-faculty-grid {
      grid-template-columns: 1fr !important;
      max-width: 500px;
      margin: 0 auto;
      gap: 20px;
    }
    .mjm-faculty-card {
      padding: 24px 20px 22px;
      border-radius: 20px;
    }
  }
</style>
`;

export function renderFacultyCard(f) {
  const isDummyAvatar = f.id === 'shubham';
  return `
    <article class="mjm-faculty-card" data-faculty-id="${escapeHtml(f.id)}">
      <div class="faculty-photo-wrap">
        ${f.photo ? `
          <img class="faculty-photo" src="${escapeHtml(f.photo)}" alt="${escapeHtml(f.firstName + ' ' + f.lastName)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="faculty-initials-fallback" style="display:none;" aria-label="${escapeHtml(f.firstName)}">${escapeHtml(f.initials || 'SK')}</div>
        ` : `
          <div class="faculty-initials-fallback" aria-label="${escapeHtml(f.firstName)}">${escapeHtml(f.initials || 'SK')}</div>
        `}
      </div>
      <span class="faculty-tag">${escapeHtml(f.tag)}</span>
      <h3 class="faculty-name">${escapeHtml(f.firstName)} <span class="faculty-surname">${escapeHtml(f.lastName)}</span></h3>
      <p class="faculty-degree">${escapeHtml(f.degree)}</p>
      <div class="faculty-quote">${escapeHtml(f.quote)}</div>
      <ul class="faculty-points">
        ${f.points.map(pt => `
          <li class="faculty-point">
            <span class="faculty-point-bullet" aria-hidden="true">✔</span>
            <div class="faculty-point-content">
              <strong class="faculty-point-label">${escapeHtml(pt.label)}:</strong>
              <span class="faculty-point-text">${escapeHtml(pt.text)}</span>
            </div>
          </li>
        `).join('')}
      </ul>
      <div class="faculty-chips">
        ${f.chips.map(chip => `
          <span class="faculty-chip">${escapeHtml(chip)}</span>
        `).join('')}
      </div>
    </article>
  `;
}

export function facultySection(course = 'all') {
  const filtered = course === 'all'
    ? FACULTY
    : FACULTY.filter(f => Array.isArray(f.courses) && f.courses.includes(course));
  const gridCountClass = filtered.length === 1
    ? 'grid-count-1'
    : filtered.length === 2
    ? 'grid-count-2'
    : filtered.length === 4
    ? 'grid-count-4'
    : '';

  return `
    ${facultyStyles}
    <section class="mjm-faculty-section" id="faculty-section">
      <div class="mjm-faculty-container">
        <div class="mjm-faculty-header">
          <h2 class="mjm-faculty-title">Meet Our <span>Faculty</span></h2>
          <p class="mjm-faculty-subtitle">Experienced mentors dedicated to personal attention, concept mastery and real results.</p>
        </div>
        <div class="mjm-faculty-grid ${gridCountClass}">
          ${filtered.map(renderFacultyCard).join('')}
        </div>
      </div>
    </section>
  `;
}

export function facultyPageMarkup() {
  return `
    <section class="page-hero">
      <div class="container">
        <span class="eyebrow">OUR TEACHING TEAM</span>
        <h1>Meet Our <span style="color:#ea580c">Faculty</span></h1>
        <p>Learn from teachers who make concepts click. Small batches, 1-on-1 mentorship, and personal attention for every student.</p>
      </div>
    </section>
    ${facultySection('all')}
  `;
}
