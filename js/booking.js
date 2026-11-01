const bookingCourses = new Set(['JEE', 'NEET', 'Foundation']);

export const AVAILABLE_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'English',
  'Science',
  'Spoken English',
  'Social Science'
];

export const AVAILABLE_CLASSES = [
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'Dropper'
];

export const AVAILABLE_COURSES = ['JEE', 'NEET', 'Foundation'];
export const AVAILABLE_LANGUAGES = ['English', 'Hindi'];

export function renderLeadForm(id = 'lead-form') {
  return `<form id="${id}" class="card form-grid mj-counselling-form" data-lead-form novalidate>
    <div class="field">
      <label for="${id}-studentName">Student Name *</label>
      <input id="${id}-studentName" name="studentName" type="text" required minlength="2" maxlength="80" autocomplete="name" placeholder="Student's full name">
    </div>

    <div class="field">
      <label for="${id}-mobile">Mobile Number *</label>
      <input id="${id}-mobile" name="mobile" type="tel" required inputmode="numeric" autocomplete="tel" maxlength="15" placeholder="10-digit mobile number">
    </div>

    <div class="field">
      <label for="${id}-className">Class *</label>
      <select id="${id}-className" name="className" required>
        <option value="">Select class</option>
        ${AVAILABLE_CLASSES.map(cls => `<option value="${cls}">${cls}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <label for="${id}-course">Course *</label>
      <select id="${id}-course" name="course" required data-course-field>
        <option value="">Select course</option>
        ${AVAILABLE_COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <label for="${id}-currentCoaching">Current Coaching <span class="mj-optional">(Optional)</span></label>
      <input id="${id}-currentCoaching" name="currentCoaching" type="text" maxlength="100" placeholder="e.g. Allen, Aakash, Self-study">
    </div>

    <div class="field">
      <label for="${id}-language">Preferred Language *</label>
      <select id="${id}-language" name="language" required>
        <option value="English" selected>English</option>
        <option value="Hindi">Hindi</option>
      </select>
    </div>

    <div class="field full mj-multiselect-field">
      <label id="${id}-subjects-label" class="mj-field-label">Preferred Subjects <span class="mj-optional">(Optional)</span></label>
      <div class="mj-multiselect" data-multiselect id="${id}-subjects-container">
        <div role="combobox" tabindex="0" class="mj-multiselect-trigger" id="${id}-subjects-trigger" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${id}-subjects-label">
          <span class="mj-multiselect-placeholder">Select subjects (optional)...</span>
          <div class="mj-selected-chips" aria-live="polite"></div>
          <span class="mj-multiselect-arrow" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 7.5 5 5 5-5"/></svg>
          </span>
        </div>
        <div class="mj-multiselect-dropdown" role="listbox" aria-multiselectable="true" hidden>
          <div class="mj-multiselect-search-wrap">
            <svg class="mj-search-icon" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>
            <input type="text" class="mj-multiselect-search" placeholder="Search subjects..." aria-label="Search subjects" autocomplete="off">
            <button type="button" class="mj-search-clear" aria-label="Clear search" hidden>&times;</button>
          </div>
          <div class="mj-multiselect-options">
            ${AVAILABLE_SUBJECTS.map(subj => `
              <label class="mj-multiselect-option" data-value="${subj}">
                <input type="checkbox" value="${subj}" class="mj-multiselect-check">
                <span class="mj-checkbox-custom" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>
                </span>
                <span class="mj-option-text">${subj}</span>
              </label>
            `).join('')}
            <div class="mj-multiselect-empty" hidden>No matching subjects found</div>
          </div>
          <div class="mj-multiselect-footer">
            <span class="mj-multiselect-count">0 selected</span>
            <div class="mj-multiselect-actions">
              <button type="button" class="mj-btn-clear">Clear</button>
              <button type="button" class="mj-btn-done">Done</button>
            </div>
          </div>
        </div>
        <input type="hidden" name="preferredSubjects" value="">
      </div>
    </div>

    <div class="hidden-field" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="field full form-footer">
      <div class="booking-turnstile" data-turnstile hidden></div>
      <div class="form-status" role="status" aria-live="polite"></div>
      <button class="btn btn-primary mj-booking-submit" type="submit">
        <span class="mj-submit-icon" aria-hidden="true">\uD83D\uDE80</span> Submit &amp; Connect on WhatsApp
      </button>
      <p class="notice">⚡ Direct WhatsApp connect with mentor • Small batches • Personal guidance</p>
    </div>
  </form>`;
}

export function renderBookingModal() {
  return `<div class="booking-overlay" data-booking-overlay hidden>
    <section class="booking-dialog" data-booking-dialog role="dialog" aria-modal="true" aria-labelledby="booking-title" tabindex="-1">
      <button class="booking-close" type="button" data-booking-close aria-label="Close booking form">&times;</button>
      <div class="booking-modal-head">
        <h2 id="booking-title">\uD83C\uDF93 Book Your Free Counselling Session</h2>
        <p class="booking-intro">Tell us a little about yourself. Our academic team will connect with you shortly!</p>
      </div>
      <div data-booking-form-view>${renderLeadForm('booking-lead-form')}</div>
      <div class="booking-success" data-booking-success tabindex="-1" hidden>
        <div class="booking-success-icon" aria-hidden="true">\uD83C\uDF89</div>
        <h3>Enquiry Submitted Successfully!</h3>
        <p>Connecting you to our academic mentor on WhatsApp...</p>
        <div class="booking-success-actions">
          <a class="btn btn-primary mj-wa-direct-btn" data-wa-link href="#" target="_blank" rel="noopener">Open WhatsApp Now \uD83D\uDE80</a>
        </div>
      </div>
    </section>
  </div>`;
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
  if (overlay.dataset.bookingInitialized === 'true') return;
  overlay.dataset.bookingInitialized = 'true';

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
    if (!status) return;
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

  /* Multi-select setup */
  const initMultiSelects = () => {
    document.querySelectorAll('[data-multiselect]').forEach(container => {
      if (container.dataset.initialized === 'true') return;
      container.dataset.initialized = 'true';

      const trigger = container.querySelector('.mj-multiselect-trigger');
      const placeholder = container.querySelector('.mj-multiselect-placeholder');
      const chipsWrap = container.querySelector('.mj-selected-chips');
      const dropdown = container.querySelector('.mj-multiselect-dropdown');
      const searchInput = container.querySelector('.mj-multiselect-search');
      const searchClear = container.querySelector('.mj-search-clear');
      const options = [...container.querySelectorAll('.mj-multiselect-option')];
      const optionsContainer = container.querySelector('.mj-multiselect-options');
      const emptyMsg = container.querySelector('.mj-multiselect-empty');
      const countEl = container.querySelector('.mj-multiselect-count');
      const clearBtn = container.querySelector('.mj-btn-clear');
      const doneBtn = container.querySelector('.mj-btn-done');
      const hiddenInput = container.querySelector('input[type="hidden"]');
      const parentForm = container.closest('form');

      let selected = [];

      // Pre-cache values for zero-latency searching
      options.forEach(opt => {
        opt._val = opt.dataset.value;
        opt._search = (opt.dataset.value || '').toLowerCase();
      });

      const updateUI = () => {
        options.forEach(opt => {
          const isChecked = selected.includes(opt._val);
          const chk = opt.querySelector('input[type="checkbox"]');
          if (chk) chk.checked = isChecked;
          opt.classList.toggle('is-selected', isChecked);
        });

        if (hiddenInput) {
          hiddenInput.value = selected.join(', ');
        }

        chipsWrap.innerHTML = '';
        if (selected.length === 0) {
          placeholder.style.display = 'inline';
          if (countEl) countEl.textContent = '0 selected';
        } else {
          placeholder.style.display = 'none';
          selected.forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'mj-chip';
            chip.innerHTML = `${item}<button type="button" class="mj-chip-remove" data-remove="${item}" aria-label="Remove ${item}">&times;</button>`;
            chipsWrap.appendChild(chip);
          });
          if (countEl) countEl.textContent = `${selected.length} selected`;
        }
      };

      const openDropdown = () => {
        dropdown.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        container.classList.add('is-open');

        const dlg = container.closest('.booking-dialog');
        if (dlg) {
          requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect();
            const dialogRect = dlg.getBoundingClientRect();
            const dropdownHeight = dropdown.offsetHeight || 260;
            const topClearance = containerRect.top - dropdownHeight;
            if (topClearance < dialogRect.top + 12) {
              const neededScroll = (dialogRect.top + 12) - topClearance;
              dlg.scrollBy({ top: -neededScroll, behavior: 'smooth' });
            }
          });
        }

        if (searchInput) {
          searchInput.value = '';
          filterOptions('');
          searchInput.focus();
        }
      };

      const closeDropdown = () => {
        if (dropdown.hidden) return;
        dropdown.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        container.classList.remove('is-open');
      };

      const toggleDropdown = () => {
        if (dropdown.hidden) openDropdown();
        else closeDropdown();
      };

      let searchRaf = 0;
      const filterOptions = query => {
        cancelAnimationFrame(searchRaf);
        searchRaf = requestAnimationFrame(() => {
          const q = query.trim().toLowerCase();
          let visibleCount = 0;
          options.forEach(opt => {
            const match = !q || opt._search.includes(q);
            opt.style.display = match ? 'flex' : 'none';
            if (match) visibleCount++;
          });
          if (emptyMsg) emptyMsg.hidden = visibleCount > 0;
          if (searchClear) searchClear.hidden = !q;
        });
      };

      // Trigger click
      trigger.addEventListener('click', event => {
        const removeBtn = event.target.closest('.mj-chip-remove');
        if (removeBtn) {
          event.stopPropagation();
          const itemToRemove = removeBtn.dataset.remove;
          selected = selected.filter(s => s !== itemToRemove);
          updateUI();
          return;
        }
        toggleDropdown();
      });

      // Keyboard support on trigger
      trigger.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleDropdown();
        }
      });

      // Search input
      if (searchInput) {
        searchInput.addEventListener('input', e => filterOptions(e.target.value));
        searchInput.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            closeDropdown();
            trigger.focus();
          }
        });
      }

      // Search clear button
      if (searchClear) {
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          filterOptions('');
          searchInput.focus();
        });
      }

      // Fast delegated option clicks
      if (optionsContainer) {
        optionsContainer.addEventListener('click', e => {
          const opt = e.target.closest('.mj-multiselect-option');
          if (!opt) return;
          e.preventDefault();
          const val = opt._val;
          const index = selected.indexOf(val);
          if (index > -1) {
            selected.splice(index, 1);
          } else {
            const temp = [...selected, val];
            selected = AVAILABLE_SUBJECTS.filter(s => temp.includes(s));
          }
          updateUI();
        });
      }

      // Clear button
      if (clearBtn) {
        clearBtn.addEventListener('click', e => {
          e.preventDefault();
          selected = [];
          updateUI();
        });
      }

      // Done button
      if (doneBtn) {
        doneBtn.addEventListener('click', e => {
          e.preventDefault();
          closeDropdown();
          trigger.focus();
        });
      }

      // Close on outside click
      document.addEventListener('click', event => {
        if (!dropdown.hidden && !container.contains(event.target)) {
          closeDropdown();
        }
      }, { passive: true });

      // Close on Escape
      container.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !dropdown.hidden) {
          closeDropdown();
          trigger.focus();
        }
      });

      // Handle form reset
      if (parentForm) {
        parentForm.addEventListener('reset', () => {
          selected = [];
          setTimeout(updateUI, 0);
          closeDropdown();
        });
      }

      updateUI();
    });
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

    // Compensate scrollbar width on desktop to prevent layout shifting
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    overlay.hidden = false;
    document.body.classList.add('booking-open');
    mountCaptcha(form);

    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isTouch) {
      requestAnimationFrame(() => form.querySelector('input:not([type="hidden"])')?.focus({ preventScroll: true }));
    }
  };

  const close = () => {
    clearTimeout(closeTimer);
    overlay.hidden = true;
    document.body.classList.remove('booking-open');
    document.body.style.paddingRight = '';
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
    const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(element => !element.hidden && element.offsetParent !== null);
    if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });

  initMultiSelects();

  document.querySelectorAll('[data-lead-form]').forEach(form => {
    mountCaptcha(form);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.dataset.submitting === 'true') return;
      if (form.elements.website?.value.trim()) return;

      const studentName = (form.elements.studentName?.value || '').trim();
      if (studentName.length < 2) {
        showStatus(form, 'Please enter the student\'s full name (at least 2 letters).', true);
        form.elements.studentName?.focus();
        return;
      }

      const mobileRaw = (form.elements.mobile?.value || '').trim();
      const cleanMobile = mobileRaw.replace(/\D/g, '');
      const isValidMobile = (cleanMobile.length === 10 && /^[6-9]\d{9}$/.test(cleanMobile)) ||
                            (cleanMobile.length === 12 && cleanMobile.startsWith('91') && /^[6-9]\d{9}$/.test(cleanMobile.slice(2))) ||
                            (cleanMobile.length === 11 && cleanMobile.startsWith('0') && /^[6-9]\d{9}$/.test(cleanMobile.slice(1)));

      if (!isValidMobile) {
        showStatus(form, 'Please enter a valid 10-digit Indian mobile number.', true);
        form.elements.mobile?.focus();
        return;
      }

      const mobile10 = cleanMobile.length === 12 && cleanMobile.startsWith('91')
        ? cleanMobile.slice(2)
        : cleanMobile.length === 11 && cleanMobile.startsWith('0')
        ? cleanMobile.slice(1)
        : cleanMobile;

      const className = (form.elements.className?.value || '').trim();
      if (!className) {
        showStatus(form, 'Please select the student\'s class.', true);
        form.elements.className?.focus();
        return;
      }

      const course = (form.elements.course?.value || '').trim();
      if (!course) {
        showStatus(form, 'Please select a course (JEE, NEET, or Foundation).', true);
        form.elements.course?.focus();
        return;
      }

      const language = (form.elements.language?.value || '').trim() || 'English';
      const currentCoaching = (form.elements.currentCoaching?.value || '').trim() || 'Not Provided';
      const preferredSubjects = (form.elements.preferredSubjects?.value || '').trim() || 'Not Provided';

      if (siteKey && !form.elements.turnstileToken?.value) {
        showStatus(form, 'Please complete the security check and try again.', true);
        return;
      }

      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      const originalText = submit.innerHTML;
      submit.innerHTML = '<span class="mj-submit-icon" aria-hidden="true">\u23F3</span> Connecting to WhatsApp...';
      form.dataset.submitting = 'true';
      showStatus(form, '');

      // Build WhatsApp message with safe Unicode escapes and exact requested emojis
      const sep = '\u2501'.repeat(18);
      const waMessage = [
        '\uD83C\uDF93 *NEW STUDENT ENQUIRY \u2013 MY JEE MENTOR*',
        '',
        sep,
        '',
        '\uD83D\uDC68\u200D\uD83C\uDF93 *STUDENT DETAILS*',
        '',
        `\uD83D\uDC64 Student Name: ${studentName}`,
        `\uD83D\uDCF1 Mobile Number: ${mobile10}`,
        `\uD83C\uDFEB Class: ${className}`,
        `\uD83D\uDCDA Course: ${course}`,
        '',
        sep,
        '',
        '\uD83D\uDCD6 *ACADEMIC PREFERENCES*',
        '',
        `\uD83C\uDFEB Current Coaching: ${currentCoaching}`,
        `\uD83C\uDFAF Preferred Subjects: ${preferredSubjects}`,
        `\uD83C\uDF10 Preferred Language: ${language}`,
        '',
        sep,
        '',
        '\u2705 Enquiry submitted through the My JEE Mentor Website.',
        '',
        'We would like to know more about the available courses and counselling sessions.',
        '',
        'Thank you!',
        '',
        sep
      ].join('\n');

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const waUrl = isMobile
        ? `https://wa.me/917304256203?text=${encodeURIComponent(waMessage)}`
        : `https://api.whatsapp.com/send/?phone=917304256203&text=${encodeURIComponent(waMessage)}`;

      // Immediate redirect / popup for WhatsApp
      let popupOpened = false;
      if (!isMobile) {
        try {
          const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
          if (win && !win.closed) popupOpened = true;
        } catch (_) {}
      }
      if (isMobile || !popupOpened) {
        if (isMobile) {
          window.location.href = waUrl;
        }
      }

      // Update UI state
      if (form.id === 'booking-lead-form') {
        const waLink = successView?.querySelector('[data-wa-link]');
        if (waLink) waLink.href = waUrl;
        formView.hidden = true;
        successView.hidden = false;
        closeButton?.focus({ preventScroll: true });
        closeTimer = window.setTimeout(close, 7000);
      } else {
        const status = form.querySelector('.form-status');
        if (status) {
          status.className = 'form-status success';
          status.style.display = 'block';
          status.innerHTML = `<strong>Enquiry Submitted! \uD83C\uDF89</strong> Connecting you to WhatsApp... <a class="btn btn-sm btn-primary mj-status-wa-btn" href="${waUrl}" target="_blank" rel="noopener">Open WhatsApp Now \uD83D\uDE80</a>`;
        }
      }

      // Background submission to API (never blocks student)
      (async () => {
        try {
          const csrfResponse = await fetch('/api/csrf', { credentials: 'same-origin', cache: 'no-store' });
          const csrf = await csrfResponse.json().catch(() => ({}));
          const payload = {
            studentName,
            parentName: '',
            email: '',
            mobile: mobile10,
            whatsapp: mobile10,
            className,
            exam: course,
            targetYear: '',
            currentCoaching: currentCoaching === 'Not Provided' ? '' : currentCoaching,
            preferredSubject: preferredSubjects === 'Not Provided' ? '' : preferredSubjects,
            city: '',
            language,
            message: `WhatsApp Enquiry. Coaching: ${currentCoaching} | Subjects: ${preferredSubjects}`,
            website: '',
            turnstileToken: form.elements.turnstileToken?.value || ''
          };
          await fetch('/api/leads', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json', 'x-csrf-token': csrf.token || '' },
            body: JSON.stringify(payload)
          });
        } catch (_) {}
      })();

      delete form.dataset.submitting;
      submit.disabled = false;
      submit.innerHTML = originalText;
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
