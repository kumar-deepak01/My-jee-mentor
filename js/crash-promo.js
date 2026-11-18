/**
 * My JEE Mentor - JEE Crash Course 5-Second Promotional Popup
 */

let promoAudioCtx = null;
let promoChimePlayed = false;

function getOrCreateAudioContext() {
  if (!promoAudioCtx) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        promoAudioCtx = new AudioContextClass();
      }
    } catch (_) {}
  }
  return promoAudioCtx;
}

function playSynthesizedChime(ctx) {
  try {
    if (promoChimePlayed) return;
    try {
      if (sessionStorage.getItem('mjm_promo_chime_played') === 'true') {
        promoChimePlayed = true;
        return;
      }
    } catch (_) {}

    // Verify modal is visible
    const modal = document.getElementById('crash-promo-modal');
    if (!modal || modal.hidden) return;

    // Verify AudioContext is running before playing
    if (ctx.state !== 'running') return;

    // Mark as played and persist to sessionStorage ONLY when audio actually plays
    promoChimePlayed = true;
    try {
      sessionStorage.setItem('mjm_promo_chime_played', 'true');
    } catch (_) {}

    const now = ctx.currentTime;

    // Subtle, low-volume master envelope (~0.22 gain with 0.45s smooth fade)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    masterGain.connect(ctx.destination);

    // Tone 1: Warm D5 note (~587Hz) gliding softly into A5 (~880Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    osc1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: Harmonious resonance bell chime overtone (~880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.14, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (_) {}
}

function triggerChimeSound() {
  try {
    if (promoChimePlayed) return;
    try {
      if (sessionStorage.getItem('mjm_promo_chime_played') === 'true') {
        promoChimePlayed = true;
        return;
      }
    } catch (_) {}

    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    if (ctx.state === 'running') {
      playSynthesizedChime(ctx);
    } else {
      ctx.resume().then(() => {
        if (ctx.state === 'running') {
          playSynthesizedChime(ctx);
        }
      }).catch(() => {});
    }
  } catch (_) {}
}

function setupAudioUnlockListeners() {
  const handleUserGesture = () => {
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          const modal = document.getElementById('crash-promo-modal');
          if (modal && !modal.hidden && !promoChimePlayed) {
            playSynthesizedChime(ctx);
          }
        }).catch(() => {});
      } else if (ctx.state === 'running') {
        const modal = document.getElementById('crash-promo-modal');
        if (modal && !modal.hidden && !promoChimePlayed) {
          playSynthesizedChime(ctx);
        }
      }
    } catch (_) {}
  };

  // Only valid user gestures: pointerdown, touchstart, keydown, click (browsers ignore scroll)
  const gestureEvents = ['pointerdown', 'touchstart', 'keydown', 'click'];
  gestureEvents.forEach(evt => {
    document.addEventListener(evt, handleUserGesture, { once: true, passive: true });
  });
}

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

  setupAudioUnlockListeners();

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
      sessionStorage.setItem('mjm_promo_chime_played', 'true');
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

    // Play subtle soft chime notification
    triggerChimeSound();
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
