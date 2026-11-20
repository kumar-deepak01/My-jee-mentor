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
      <div class="crash-promo-dialog" role="dialog" aria-modal="true" aria-label="JEE Mains and Advance Crash Course 2027">
        <!-- Close button -->
        <button type="button" class="crash-promo-close" id="crash-promo-close" aria-label="Close promotional popup">&times;</button>

        <!-- Decorative background shapes matching SaaS card style -->
        <div class="crash-promo-decorations" aria-hidden="true">
          <span class="crash-promo-shape shape-tl-ring"></span>
          <span class="crash-promo-shape shape-tl-dot"></span>
          <span class="crash-promo-shape shape-tr-blob"></span>
          <span class="crash-promo-shape shape-tr-box"></span>
          <span class="crash-promo-shape shape-bl-stripes"></span>
          <span class="crash-promo-shape shape-bl-dot"></span>
          <span class="crash-promo-shape shape-br-wedge"></span>
        </div>

        <!-- Main Card Content -->
        <div class="crash-promo-card">
          <!-- Top Pill Badge -->
          <div class="crash-promo-pill">
            ONLINE BATCH • JEE 2027
          </div>

          <!-- Main Heading -->
          <h3 class="crash-promo-title">
            JEE Mains + Advance<br>
            <span>Crash Course</span>
          </h3>

          <!-- Subtext -->
          <p class="crash-promo-subtext">
            Concept First. Rank Next. Focused live preparation till April.
          </p>

          <!-- Highlight Strip / Stat Box -->
          <div class="crash-promo-stat-box">
            <span class="crash-promo-stat-item">
              <span class="crash-promo-stat-icon">🔥</span>
              <span><strong>Max 10 Students</strong> Per Batch</span>
            </span>
            <span class="crash-promo-stat-sep" aria-hidden="true">•</span>
            <span class="crash-promo-stat-item">
              <span class="crash-promo-stat-icon">⚡</span>
              <span><strong>100% Live</strong> Interactive Classes</span>
            </span>
          </div>

          <!-- Compact 2x2 Feature Grid -->
          <div class="crash-promo-grid">
            <div class="crash-promo-feature">
              <div class="crash-promo-icon-wrap" aria-hidden="true">
                <svg class="crash-promo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div class="crash-promo-feature-name">Experienced Faculty</div>
            </div>

            <div class="crash-promo-feature">
              <div class="crash-promo-icon-wrap" aria-hidden="true">
                <svg class="crash-promo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  <path d="m9 14 2 2 4-4"/>
                </svg>
              </div>
              <div class="crash-promo-feature-name">Daily DPPs &amp; Practice</div>
            </div>

            <div class="crash-promo-feature">
              <div class="crash-promo-icon-wrap" aria-hidden="true">
                <svg class="crash-promo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                  <path d="m9 10 2 2 4-4"/>
                </svg>
              </div>
              <div class="crash-promo-feature-name">Regular Mock Tests</div>
            </div>

            <div class="crash-promo-feature">
              <div class="crash-promo-icon-wrap" aria-hidden="true">
                <svg class="crash-promo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div class="crash-promo-feature-name">1-on-1 Personal Guidance</div>
            </div>
          </div>

          <!-- Bottom CTA Section -->
          <div class="crash-promo-footer">
            <button type="button" class="crash-promo-cta-btn" id="crash-promo-action">
              Book Free Demo &rarr;
            </button>
            <a href="tel:+917304256203" class="crash-promo-secondary-link" id="crash-promo-counselor">
              Talk to Counselor
            </a>
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

  const counselorLink = document.getElementById('crash-promo-counselor');

  bannerAction?.addEventListener('click', triggerBooking);
  bannerAction?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerBooking();
    }
  });

  counselorLink?.addEventListener('click', () => {
    closePromo();
  });
}
