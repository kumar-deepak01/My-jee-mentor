const PORTAL = '/api/student-reviews';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const REVIEWS = [
  {
    stars: 5,
    quote: "With only 10 students in a batch, the mentor knows exactly where I am weak. My doubts get solved the same day, one on one.",
    name: "Dirasantham Adithya",
    role: "JEE 2026-27",
    initials: "DA",
    svg: `<svg class="mjm-review-bg-art" viewBox="0 0 120 120" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="60" cy="52" rx="46" ry="18" transform="rotate(-30 60 52)"/><ellipse cx="60" cy="52" rx="46" ry="18" transform="rotate(30 60 52)"/><circle cx="60" cy="52" r="5" fill="#ea580c"/><path d="M22 96c10-5 24-5 38 0 14-5 28-5 38 0v-24c-10-5-24-5-38 0-14-5-28-5-38 0z" fill="#ea580c" fill-opacity="0.15"/><path d="M60 72v24"/></svg>`
  },
  {
    stars: 5,
    quote: "This is exactly what we were looking for for our child. Personal guidance, regular tests and a clear plan, and we always know how the progress is going.",
    name: "K. Ramachandran",
    role: "Parent of NEET aspirant",
    initials: "KR",
    svg: `<svg class="mjm-review-bg-art" viewBox="0 0 120 120" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="60,26 106,46 60,66 14,46" fill="#ea580c" fill-opacity="0.15"/><path d="M34 56v22c0 14 16 22 26 22s26-8 26-22V56"/><path d="M106 46v28"/><circle cx="106" cy="76" r="3" fill="#ea580c"/><path d="M20 28l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ea580c"/><path d="M96 22l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#ea580c"/></svg>`
  },
  {
    stars: 5,
    quote: "The daily DPP built a study habit for me. Live classes from home saved travel time, and the mentor is always there for doubts.",
    name: "Shriya S Nair",
    role: "NEET 2026-27",
    initials: "SN",
    svg: `<svg class="mjm-review-bg-art" viewBox="0 0 120 120" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M34 20c22 16 30 32 52 48M34 68c22-16 30-32 52-48M42 28l36 24M44 60l32-22"/><path d="M22 100c10-5 24-5 38 0 14-5 28-5 38 0v-22c-10-5-24-5-38 0-14-5-28-5-38 0z" fill="#ea580c" fill-opacity="0.15"/><path d="M60 78v22"/></svg>`
  },
  {
    stars: 5,
    quote: "Our son was weak in basics. The Foundation batch explained everything step by step, and his confidence in Science and Math has grown.",
    name: "M. Sundaresan",
    role: "Parent of Class 9 student",
    initials: "MS",
    svg: `<svg class="mjm-review-bg-art" viewBox="0 0 120 120" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M60 16v10M38 24l7 7M82 24l-7 7M26 44h10M94 44h-10"/><circle cx="60" cy="44" r="12" fill="#ea580c" fill-opacity="0.15"/><path d="M20 96c12-6 26-6 40 0 14-6 28-6 40 0V70c-12-6-26-6-40 0-14-6-28-6-40 0z" fill="#ea580c" fill-opacity="0.15"/><path d="M60 70v26"/></svg>`
  },
  {
    stars: 5,
    quote: "Regular tests showed me my mistakes early. The mentor gave a personal plan, so I stopped feeling lost and started improving.",
    name: "Regati Rishikesh Reddy",
    role: "JEE 2026-27",
    initials: "RR",
    svg: `<svg class="mjm-review-bg-art" viewBox="0 0 120 120" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="60,20 100,88 20,88" fill="#ea580c" fill-opacity="0.12"/><circle cx="60" cy="62" r="14"/><path d="M38 80a28 28 0 0 1 44 0"/><path d="M60 20v68"/></svg>`
  },
  {
    stars: 5,
    quote: "The teachers actually listen. Every doubt gets patient attention, and the small batch size makes a big difference.",
    name: "V. Subramanian",
    role: "Parent of Class 8 student",
    initials: "VS",
    svg: `<svg class="mjm-review-bg-art" viewBox="0 0 120 120" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M60 22a22 22 0 0 0-14 39c4 4 6 8 6 13h16c0-5 2-9 6-13a22 22 0 0 0-14-39z" fill="#ea580c" fill-opacity="0.15"/><path d="M52 79h16M55 85h10M57 91h6"/><path d="M60 11v6M34 23l4 4M86 23l-4 4M24 43h6M96 43h-6"/></svg>`
  }
];

const reviewsStyles = `<style>
.mjm-reviews-section {
  position: relative;
  padding: 56px 20px 68px;
  font-family: 'Montserrat', system-ui, sans-serif;
}
.mjm-reviews-container {
  max-width: 1560px;
  margin: 0 auto;
}
.mjm-reviews-header {
  text-align: center;
  margin-bottom: 38px;
}
.mjm-reviews-title {
  font-family: 'Montserrat', system-ui, sans-serif;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 900;
  color: #ea580c;
  line-height: 1.2;
  margin: 0 0 10px;
  letter-spacing: -0.01em;
  text-shadow: 0 2px 10px rgba(234, 88, 12, 0.14);
}
.mjm-reviews-subtitle {
  font-size: 15.5px;
  color: #5c4a3f;
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.mjm-reviews-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}
.mjm-review-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  min-height: 220px;
  padding: 26px 26px 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 24px;
  color: #1c1917;
  background:
    radial-gradient(circle at 92% 18%, rgba(254, 215, 170, 0.45) 0%, transparent 55%),
    linear-gradient(180deg, #ffffff 0%, #fffbf8 50%, #ffedd5 100%);
  border: 1px solid rgba(234, 88, 12, 0.32);
  box-shadow: 0 16px 36px -10px rgba(234, 88, 12, 0.20), 0 4px 14px rgba(0, 0, 0, 0.04);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  box-sizing: border-box;
}
.mjm-review-card::before {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: 16px;
  border: 1px solid rgba(234, 88, 12, 0.20);
  pointer-events: none;
  z-index: 0;
}
.mjm-review-card:hover {
  transform: translateY(-4px);
  border-color: rgba(234, 88, 12, 0.50);
  box-shadow: 0 22px 46px -10px rgba(234, 88, 12, 0.30), 0 6px 18px rgba(0, 0, 0, 0.06);
}
.mjm-review-bg-art {
  position: absolute;
  right: 12px;
  bottom: 10px;
  width: 110px;
  height: 110px;
  opacity: 0.08;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.mjm-review-card:hover .mjm-review-bg-art {
  opacity: 0.16;
  transform: scale(1.05) rotate(-2deg);
}
.mjm-review-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  z-index: 1;
  position: relative;
}
.mjm-review-stars {
  display: flex;
  gap: 3px;
  color: #ea580c;
  font-size: 17px;
  line-height: 1;
}
.mjm-review-quote-icon {
  display: flex;
  align-items: center;
  opacity: 0.85;
}
.mjm-review-text {
  color: #2b1f16;
  font-size: 14.5px;
  line-height: 1.62;
  font-weight: 500;
  margin: 0 0 22px;
  flex-grow: 1;
  z-index: 1;
  position: relative;
}
.mjm-review-author {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: auto;
  z-index: 1;
  position: relative;
}
.mjm-review-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff9e58 0%, #ea580c 58%, #b83a00 100%);
  color: #ffffff;
  font-weight: 900;
  font-size: 14.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.38), inset 0 1px 2px rgba(255, 255, 255, 0.6);
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}
.mjm-review-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mjm-review-name {
  font-size: 15px;
  font-weight: 800;
  color: #1c1917;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mjm-review-role {
  font-size: 12.5px;
  color: #78350f;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 1024px) {
  .mjm-reviews-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}
@media (max-width: 640px) {
  .mjm-reviews-section {
    padding: 40px 16px;
  }
  .mjm-reviews-header {
    margin-bottom: 26px;
  }
  .mjm-reviews-grid {
    grid-template-columns: 1fr;
    max-width: 540px;
    margin: 0 auto;
    gap: 16px;
  }
  .mjm-review-card {
    padding: 22px 20px 20px;
    border-radius: 20px;
  }
}
</style>`;

function renderReviewCards() {
  return REVIEWS.map(r => `
    <article class="mjm-review-card">
      ${r.svg || ''}
      <div class="mjm-review-top">
        <div class="mjm-review-stars" aria-label="5 out of 5 stars">
          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
        </div>
        <span class="mjm-review-quote-icon" aria-hidden="true">
          <svg width="26" height="22" viewBox="0 0 28 24" fill="none">
            <path d="M7.5 12C9.5 12 11 13.5 11 15.5C11 17.5 9.5 19 7.5 19C5.5 19 4 17.5 4 15.5C4 11.5 7 7.5 11.5 6L12.5 7.8C9.5 9 8 10.5 7.8 12.2C8 12.1 8.3 12 8.6 12H7.5ZM20.5 12C22.5 12 24 13.5 24 15.5C24 17.5 22.5 19 20.5 19C18.5 19 17 17.5 17 15.5C17 11.5 20 7.5 24.5 6L25.5 7.8C22.5 9 21 10.5 20.8 12.2C21 12.1 21.3 12 21.6 12H20.5Z" fill="#ea580c" fill-opacity="0.45"/>
          </svg>
        </span>
      </div>
      <p class="mjm-review-text">${escapeHtml(r.quote)}</p>
      <div class="mjm-review-author">
        <div class="mjm-review-avatar">${escapeHtml(r.initials)}</div>
        <div class="mjm-review-meta">
          <strong class="mjm-review-name">${escapeHtml(r.name)}</strong>
          <span class="mjm-review-role">${escapeHtml(r.role)}</span>
        </div>
      </div>
    </article>
  `).join('');
}

export function homeStudentReviewMarkup() {
  return `${reviewsStyles}<section class="mjm-reviews-section"><div class="mjm-reviews-container"><div class="mjm-reviews-header"><h2 class="mjm-reviews-title">What Parents &amp; Students Say</h2><p class="mjm-reviews-subtitle">Small batches. Personal mentors. Real attention.</p></div><div class="mjm-reviews-grid">${renderReviewCards()}</div></div></section>`;
}

export function studentReviewPageMarkup() {
  return `<section class="page-hero"><div class="container"><span class="eyebrow">STUDENT STORIES</span><h1>What Parents &amp; Students Say</h1><p>Small batches. Personal mentors. Real attention.</p></div></section>${reviewsStyles}<section class="mjm-reviews-section" style="padding-top:20px"><div class="mjm-reviews-container"><div class="mjm-reviews-grid">${renderReviewCards()}</div></div></section>`;
}

export function facultyStudentReviewMarkup() {
  return `<section class="faculty-review-manager" aria-labelledby="faculty-review-heading"><div class="faculty-review-heading"><div><span class="eyebrow">STUDENT STORIES</span><h3 id="faculty-review-heading">Student Reviews</h3></div><span class="review-count" data-review-count>0</span></div><p class="resource-drive-instruction">YouTube video public ya unlisted hona chahiye, taaki students use dekh saken.</p><form class="faculty-form student-review-form" data-review-form><label>Title / Student ka naam<input name="title" required maxlength="80" placeholder="Student name or review title"></label><label>YouTube Link<input name="url" type="url" required maxlength="2048" placeholder="https://www.youtube.com/watch?v=..."></label><label>Short description (optional)<input name="description" maxlength="120" placeholder="AIR 245, JEE Main 2026"></label><div class="resource-form-actions"><button class="btn btn-outline" type="button" data-review-test>Link test karo</button><button class="btn btn-primary" type="submit" data-review-submit>Add Review</button><button class="btn btn-outline" type="button" data-review-cancel hidden>Cancel</button></div><p class="faculty-status" data-review-status role="status" aria-live="polite"></p></form><div class="faculty-review-list" data-faculty-reviews></div></section>`;
}

async function apiRequest(action = '', options = {}) {
  const query = action ? `?action=${encodeURIComponent(action)}` : '';
  const response = await fetch(`${PORTAL}${query}`, { credentials: 'same-origin', cache: 'no-store', ...options });
  const result = await response.json().catch(() => ({ message: 'The service could not be reached.' }));
  if (!response.ok) throw new Error(result.message || 'The request could not be completed.');
  return result;
}

export function initStudentReviews() {
  // Static reviews are rendered directly into HTML markup.
}

export function initFacultyStudentReviews() {
  const form = document.querySelector('[data-review-form]');
  const list = document.querySelector('[data-faculty-reviews]');
  if (!form || !list) return;
  const title = form.elements.title;
  const url = form.elements.url;
  const description = form.elements.description;
  const submit = form.querySelector('[data-review-submit]');
  const cancel = form.querySelector('[data-review-cancel]');
  const status = form.querySelector('[data-review-status]');
  let items = [];
  let editingId = '';
  const message = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
    status.classList.toggle('is-success', Boolean(text) && !isError);
  };
  const reset = () => {
    editingId = '';
    form.reset();
    submit.textContent = 'Add Review';
    cancel.hidden = true;
  };
  const draw = () => {
    const counter = document.querySelector('[data-review-count]');
    if (counter) counter.textContent = String(items.length);
    list.innerHTML = items.length ? items.map(item => `<article class="faculty-resource-row faculty-review-row"><div class="faculty-resource-row-icon" aria-hidden="true">▶</div><div class="faculty-resource-row-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description || 'Student video review')}</span></div><a class="faculty-open-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(item.videoId)}" target="_blank" rel="noopener noreferrer">Open ↗</a><button type="button" class="faculty-edit" data-review-edit="${escapeHtml(item.id)}">Edit</button><button type="button" class="faculty-delete" data-review-delete="${escapeHtml(item.id)}">Delete</button></article>`).join('') : '<p class="faculty-empty-list">Abhi koi student review nahi hai.</p>';
  };
  const refresh = async () => {
    const response = await apiRequest();
    items = Array.isArray(response.reviews) ? response.reviews : [];
    draw();
  };
  list.addEventListener('click', async event => {
    const edit = event.target.closest('[data-review-edit]');
    const remove = event.target.closest('[data-review-delete]');
    if (edit) {
      const item = items.find(review => review.id === edit.dataset.reviewEdit);
      if (!item) return;
      editingId = item.id;
      title.value = item.title;
      description.value = item.description || '';
      url.value = `https://www.youtube.com/watch?v=${item.videoId}`;
      submit.textContent = 'Update Review';
      cancel.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      title.focus({ preventScroll: true });
      return;
    }
    if (remove) {
      const item = items.find(review => review.id === remove.dataset.reviewDelete);
      if (!item || !window.confirm(`Ye review delete karna hai? ${item.title}`)) return;
      remove.disabled = true;
      message('Deleting review…');
      try {
        await apiRequest('delete', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
        await refresh();
        message('Review delete ho gaya');
      } catch (error) {
        message(error.message, true);
      } finally {
        remove.disabled = false;
      }
    }
  });
  form.querySelector('[data-review-test]')?.addEventListener('click', () => {
    try {
      const parsed = new URL(url.value.trim());
      if (parsed.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(parsed.hostname)) throw new Error();
      window.open(parsed.href, '_blank', 'noopener,noreferrer');
    } catch {
      message('Valid HTTPS YouTube video link enter karein.', true);
    }
  });
  cancel?.addEventListener('click', () => {
    reset();
    message('');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    submit.disabled = true;
    cancel.disabled = true;
    message(editingId ? 'Updating review…' : 'Adding review…');
    const body = {
      title: title.value,
      url: url.value,
      description: description.value,
      ...(editingId ? { id: editingId } : {})
    };
    try {
      await apiRequest(editingId ? 'update' : 'add', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const updated = Boolean(editingId);
      reset();
      await refresh();
      message(updated ? 'Review update ho gaya' : 'Review add ho gaya');
    } catch (error) {
      message(error.message, true);
    } finally {
      submit.disabled = false;
      cancel.disabled = false;
    }
  });
  refresh().catch(error => message(error.message, true));
}
