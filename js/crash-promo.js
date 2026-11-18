/**
 * My JEE Mentor - JEE Crash Course 5-Second Promotional Popup
 */

export function renderCrashPromoModal() {
  return `
    <div class="crash-promo-overlay" id="crash-promo-modal" hidden>
      <div class="crash-promo-dialog" role="dialog" aria-modal="true" aria-label="JEE Crash Course 2027 Special Announcement">
        <button type="button" class="crash-promo-close" id="crash-promo-close" aria-label="Close promotional popup">&times;</button>
        <div class="crash-promo-content" id="crash-promo-action" role="button" tabindex="0" aria-label="Book Free Demo for JEE Crash Course">
          <img src="/assets/crashcourse.jpeg" onerror="this.onerror=null;this.src='/crashcourse.jpeg';" alt="Online JEE Mains + Advance Crash Course for JEE 2027 - Max 10 Students per batch - Click to Book Free Demo" class="crash-promo-img" width="1024" height="1024" loading="eager">
          <div class="crash-promo-cta-bar">
            <span class="crash-promo-cta-text">🔥 <strong>Admissions Open</strong> • Max 10 Students/Batch</span>
            <span class="crash-promo-btn">Book Free Demo →</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initCrashPromo() {
  // Check sessionStorage so it appears only once per session
  try {
    if (sessionStorage.getItem('mjm_crashcourse_dismissed') === 'true') {
      return;
    }
  } catch (_) {}

  const modal = document.getElementById('crash-promo-modal');
  if (!modal) return;
  const dialog = modal.querySelector('.crash-promo-dialog');
  const closeBtn = document.getElementById('crash-promo-close');
  const bannerAction = document.getElementById('crash-promo-action');

  let timer = null;

  const closePromo = () => {
    if (timer) clearTimeout(timer);
    modal.hidden = true;
    modal.classList.remove('is-open');
    document.body.classList.remove('crash-promo-open');
    try {
      sessionStorage.setItem('mjm_crashcourse_dismissed', 'true');
    } catch (_) {}
  };

  const openPromo = () => {
    try {
      if (sessionStorage.getItem('mjm_crashcourse_dismissed') === 'true') return;
    } catch (_) {}

    // Avoid popping up over an already open booking modal
    const bookingOverlay = document.querySelector('[data-booking-overlay]');
    if (bookingOverlay && !bookingOverlay.hidden) return;

    modal.hidden = false;
    modal.classList.add('is-open');
    document.body.classList.add('crash-promo-open');
  };

  // Automatically trigger 5 seconds after landing
  timer = setTimeout(openPromo, 5000);

  // Close on button click
  closeBtn?.addEventListener('click', e => {
    e.stopPropagation();
    closePromo();
  });

  // Close on backdrop click (outside dialog)
  modal.addEventListener('click', e => {
    if (e.target === modal || !dialog.contains(e.target)) {
      closePromo();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) {
      closePromo();
    }
  });

  // Click on banner triggers counselling modal with JEE Crash Course pre-selected
  const triggerBooking = () => {
    closePromo();
    if (typeof window.openBookingModal === 'function') {
      window.openBookingModal('JEE Crash Course');
    }
  };

  bannerAction?.addEventListener('click', triggerBooking);
  bannerAction?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerBooking();
    }
  });
}
