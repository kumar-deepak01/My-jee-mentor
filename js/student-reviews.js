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
    initials: "DA"
  },
  {
    stars: 5,
    quote: "This is exactly what we were looking for for our child. Personal guidance, regular tests and a clear plan, and we always know how the progress is going.",
    name: "K. Ramachandran",
    role: "Parent of NEET aspirant",
    initials: "KR"
  },
  {
    stars: 5,
    quote: "The daily DPP built a study habit for me. Live classes from home saved travel time, and the mentor is always there for doubts.",
    name: "Shriya S Nair",
    role: "NEET 2026-27",
    initials: "SN"
  },
  {
    stars: 5,
    quote: "Our son was weak in basics. The Foundation batch explained everything step by step, and his confidence in Science and Math has grown.",
    name: "M. Sundaresan",
    role: "Parent of Class 9 student",
    initials: "MS"
  },
  {
    stars: 5,
    quote: "Regular tests showed me my mistakes early. The mentor gave a personal plan, so I stopped feeling lost and started improving.",
    name: "Regati Rishikesh Reddy",
    role: "JEE 2026-27",
    initials: "RR"
  },
  {
    stars: 5,
    quote: "The teachers actually listen. Every doubt gets patient attention, and the small batch size makes a big difference.",
    name: "V. Subramanian",
    role: "Parent of Class 8 student",
    initials: "VS"
  }
];

const reviewsStyles = `<style>
.mjm-reviews-section {
  position: relative;
  padding: 64px 20px;
}
.mjm-reviews-container {
  max-width: 1200px;
  margin: 0 auto;
}
.mjm-reviews-header {
  text-align: center;
  margin-bottom: 42px;
}
.mjm-reviews-title {
  font-family: inherit;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 800;
  color: #8d480e;
  line-height: 1.2;
  margin: 0 0 10px;
  letter-spacing: -0.02em;
}
.dark-theme .mjm-reviews-title {
  color: #fbd77a;
}
.mjm-reviews-subtitle {
  font-size: 16px;
  color: #525252;
  margin: 0;
  font-weight: 500;
}
.dark-theme .mjm-reviews-subtitle {
  color: #d1d5db;
}
.mjm-reviews-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.mjm-review-card {
  background: radial-gradient(110% 120% at 85% 15%, #241e17 0%, #151310 60%, #0d0c0a 100%);
  border: 1px solid rgba(249, 185, 52, 0.22);
  border-radius: 20px;
  padding: 26px 26px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.45);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  position: relative;
  box-sizing: border-box;
}
.mjm-review-card:hover {
  transform: translateY(-4px);
  border-color: rgba(249, 185, 52, 0.45);
  box-shadow: 0 18px 40px -10px rgba(0, 0, 0, 0.65), 0 0 20px rgba(249, 185, 52, 0.12);
}
.mjm-review-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.mjm-review-stars {
  display: flex;
  gap: 3px;
  color: #f9b934;
  font-size: 16px;
  line-height: 1;
}
.mjm-review-quote-icon {
  display: flex;
  align-items: center;
  opacity: 0.75;
}
.mjm-review-text {
  color: #e5e5e5;
  font-size: 14.5px;
  line-height: 1.62;
  font-weight: 400;
  margin: 0 0 24px;
  flex-grow: 1;
}
.mjm-review-author {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: auto;
}
.mjm-review-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f9b934 0%, #d97706 100%);
  color: #14120e;
  font-weight: 800;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(249, 185, 52, 0.35);
  letter-spacing: 0.5px;
}
.mjm-review-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mjm-review-name {
  font-size: 15px;
  font-weight: 700;
  color: #f9b934;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mjm-review-role {
  font-size: 12.5px;
  color: #a8a29e;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 980px) {
  .mjm-reviews-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}
@media (max-width: 640px) {
  .mjm-reviews-section {
    padding: 44px 16px;
  }
  .mjm-reviews-header {
    margin-bottom: 28px;
  }
  .mjm-reviews-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .mjm-review-card {
    padding: 22px 20px 20px;
  }
}
</style>`;

function renderReviewCards() {
  return REVIEWS.map(r => `
    <article class="mjm-review-card">
      <div class="mjm-review-top">
        <div class="mjm-review-stars" aria-label="5 out of 5 stars">
          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
        </div>
        <span class="mjm-review-quote-icon" aria-hidden="true">
          <svg width="26" height="22" viewBox="0 0 28 24" fill="none">
            <path d="M7.5 12C9.5 12 11 13.5 11 15.5C11 17.5 9.5 19 7.5 19C5.5 19 4 17.5 4 15.5C4 11.5 7 7.5 11.5 6L12.5 7.8C9.5 9 8 10.5 7.8 12.2C8 12.1 8.3 12 8.6 12H7.5ZM20.5 12C22.5 12 24 13.5 24 15.5C24 17.5 22.5 19 20.5 19C18.5 19 17 17.5 17 15.5C17 11.5 20 7.5 24.5 6L25.5 7.8C22.5 9 21 10.5 20.8 12.2C21 12.1 21.3 12 21.6 12H20.5Z" fill="#b47a24" fill-opacity="0.6"/>
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
