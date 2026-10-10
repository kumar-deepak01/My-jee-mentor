const bookingCourses = new Set(['JEE', 'NEET', 'Foundation']);

export function renderLeadForm(id = 'lead-form') {
  const field = (name, label, control, required = false) => `<div class="field"><label for="${id}-${name}">${label}${required ? ' *' : ''}</label>${control.replace('<control-id>', `${id}-${name}`)}</div>`;
  return `<form id="${id}" class="card form-grid" data-lead-form novalidate>
    ${field('studentName', 'Student Name', '<input id="<control-id>" name="studentName" required minlength="2" maxlength="80" autocomplete="name">', true)}
    ${field('parentName', 'Parent Name', '<input id="<control-id>" name="parentName" required minlength="2" maxlength="80">', true)}
    ${field('email', 'Email', '<input id="<control-id>" name="email" type="email" required maxlength="254" autocomplete="email">', true)}
    ${field('mobile', 'Mobile', '<input id="<control-id>" name="mobile" type="tel" required inputmode="tel" autocomplete="tel" maxlength="18">', true)}
    ${field('whatsapp', 'WhatsApp Number', '<input id="<control-id>" name="whatsapp" type="tel" inputmode="tel" maxlength="18">')}
    ${field('className', 'Class', `<select id="<control-id>" name="className" required><option value="">Select class</option>${['7', '8', '9', '10', '11', '12', 'Dropper'].map(value => `<option>${value}</option>`).join('')}</select>`, true)}
    ${field('course', 'Course', '<select id="<control-id>" name="course" required data-course-field><option value="">Select course</option><option>JEE</option><option>NEET</option><option>Foundation</option></select>', true)}
    ${field('targetYear', 'Target Year', '<input id="<control-id>" name="targetYear" maxlength="10">')}
    ${field('currentCoaching', 'Current Coaching', '<input id="<control-id>" name="currentCoaching" maxlength="100">')}
    ${field('subject', 'Preferred Subject', '<input id="<control-id>" name="subject" maxlength="60">')}
    ${field('city', 'City', '<input id="<control-id>" name="city" required maxlength="80" autocomplete="address-level2">', true)}
    ${field('language', 'Preferred Language', '<select id="<control-id>" name="language"><option>English</option><option>Hindi</option><option>Other</option></select>')}
    ${field('message', 'Message', '<textarea id="<control-id>" name="message" maxlength="1000"></textarea>')}
    <div class="hidden-field" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="field full"><div class="booking-turnstile" data-turnstile hidden></div><div class="form-status" role="status" aria-live="polite"></div><p class="notice">By submitting, you agree that our team may contact you about your enquiry. Please do not enter sensitive personal information.</p><button class="btn btn-primary" type="submit">Book Free Counselling</button></div>
  </form>`;
}

export function renderBookingModal() {
  return `<div class="booking-overlay" data-booking-overlay hidden><section class="booking-dialog" data-booking-dialog role="dialog" aria-modal="true" aria-labelledby="booking-title" tabindex="-1"><button class="booking-close" type="button" data-booking-close aria-label="Close booking form">&times;</button><h2 id="booking-title">Book Free Counselling</h2><p class="booking-intro">Share a few details and our team will contact you shortly.</p><div data-booking-form-view>${renderLeadForm('booking-lead-form')}</div><div class="booking-success" data-booking-success tabindex="-1" hidden><span class="booking-success-icon" aria-hidden="true">✓</span><h3>Thank you!</h3><p>Hum jaldi contact karenge</p></div></section></div>`;
}

let turnstileReady;
const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve();
  if (turnstileReady) return turnstileReady;
  turnstileReady = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('The security check could not be loaded.'));
    document.head.append(script);
  });
  return turnstileReady;
};

export function initBooking() {
  const overlay = document.querySelector('[data-booking-overlay]');
  if (!overlay) return;
  const dialog = overlay.querySelector('[data-booking-dialog]');
  const closeButton = overlay.querySelector('[data-booking-close]');
  const formView = overlay.querySelector('[data-booking-form-view]');
  const successView = overlay.querySelector('[data-booking-success]');
  let previousFocus = null;
  let closeTimer = 0;
  let siteKey = '';
  const captchaWidgets = new WeakMap();

  const showStatus = (form, message, error = false) => {
    const status = form.querySelector('.form-status');
    status.textContent = message;
    status.style.display = message ? 'block' : 'none';
    status.classList.toggle('error', error);
  };
  const resetCaptcha = form => {
    const widget = captchaWidgets.get(form);
    if (widget !== undefined && window.turnstile) window.turnstile.reset(widget);
    const token = form.querySelector('[name="turnstileToken"]');
    if (token) token.value = '';
  };
  const mountCaptcha = async form => {
    const slot = form.querySelector('[data-turnstile]');
    if (!slot || !siteKey || captchaWidgets.has(form) || form.closest('[data-booking-overlay]')?.hidden) return;
    try {
      await loadTurnstile();
      if (!slot.isConnected || captchaWidgets.has(form)) return;
      slot.hidden = false;
      const widget = window.turnstile.render(slot, {
        sitekey: siteKey,
        callback: token => {
          let input = form.querySelector('[name="turnstileToken"]');
          if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'turnstileToken';
            form.append(input);
          }
          input.value = token;
        },
        'expired-callback': () => resetCaptcha(form),
        'error-callback': () => showStatus(form, 'Please complete the security check and try again.', true)
      });
      captchaWidgets.set(form, widget);
    } catch (error) {
      showStatus(form, error.message, true);
    }
  };
  const open = (course = '') => {
    previousFocus = document.activeElement;
    clearTimeout(closeTimer);
    formView.hidden = false;
    successView.hidden = true;
    const form = overlay.querySelector('[data-lead-form]');
    form.reset();
    showStatus(form, '');
    if (bookingCourses.has(course)) form.elements.course.value = course;
    overlay.hidden = false;
    document.body.classList.add('booking-open');
    mountCaptcha(form);
    requestAnimationFrame(() => form.querySelector('input:not([type="hidden"])')?.focus({ preventScroll: true }));
  };
  const close = () => {
    clearTimeout(closeTimer);
    overlay.hidden = true;
    document.body.classList.remove('booking-open');
    previousFocus?.focus?.({ preventScroll: true });
  };

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-booking]');
    if (trigger) {
      event.preventDefault();
      open(trigger.dataset.course || '');
      return;
    }
    if (event.target === overlay || event.target.closest('[data-booking-close]')) close();
  });
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(element => !element.hidden && element.getClientRects().length);
    if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });

  document.querySelectorAll('[data-lead-form]').forEach(form => {
    mountCaptcha(form);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.dataset.submitting === 'true') return;
      if (!form.reportValidity()) return;
      if (form.elements.website.value.trim()) return;
      if (siteKey && !form.elements.turnstileToken?.value) {
        showStatus(form, 'Please complete the security check and try again.', true);
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      const originalText = submit.textContent;
      submit.textContent = 'Sending...';
      form.dataset.submitting = 'true';
      showStatus(form, 'Sending your enquiry...');
      try {
        const csrfResponse = await fetch('/api/csrf', { credentials: 'same-origin', cache: 'no-store' });
        const csrf = await csrfResponse.json().catch(() => ({}));
        if (!csrfResponse.ok || !csrf.token) throw new Error(csrf.message || 'Your form session could not be started. Please try again.');
        const raw = Object.fromEntries(new FormData(form));
        const payload = {
          studentName: raw.studentName, parentName: raw.parentName, email: raw.email, mobile: raw.mobile,
          whatsapp: raw.whatsapp, className: raw.className, exam: raw.course, targetYear: raw.targetYear,
          currentCoaching: raw.currentCoaching, preferredSubject: raw.subject, city: raw.city,
          language: raw.language, message: raw.message, website: raw.website, turnstileToken: raw.turnstileToken || ''
        };
        const response = await fetch('/api/leads', {
          method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-csrf-token': csrf.token },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'Your enquiry could not be sent. Please try again.');
        if (form.id === 'booking-lead-form') {
          formView.hidden = true;
          successView.hidden = false;
          closeButton.focus({ preventScroll: true });
          closeTimer = window.setTimeout(close, 3000);
        } else {
          form.reset();
          resetCaptcha(form);
          showStatus(form, 'Thank you! Hum jaldi contact karenge');
        }
      } catch (error) {
        showStatus(form, error.message || 'Your enquiry could not be sent. Please try again.', true);
        resetCaptcha(form);
      } finally {
        delete form.dataset.submitting;
        submit.disabled = false;
        submit.textContent = originalText;
      }
    });
  });

  fetch('/api/config', { credentials: 'same-origin', cache: 'no-store' })
    .then(response => response.ok ? response.json() : {})
    .then(config => {
      siteKey = typeof config.turnstileSiteKey === 'string' ? config.turnstileSiteKey : '';
      if (siteKey) document.querySelectorAll('[data-lead-form]').forEach(mountCaptcha);
    }).catch(() => {});

  window.openBookingModal = open;
}
