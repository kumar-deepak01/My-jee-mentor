/**
 * My JEE Mentor - Homepage Top Advertisement Banner Slider
 * 
 * Simple Banner Configuration:
 * Drop your banner image files into the /banners/ directory and list their paths below.
 * Recommended Banner Dimensions: 1920 × 150 px (or ~13:1 ultra-wide panoramic proportion).
 * 
 * When an image path is not yet present on disk or fails to load,
 * the container automatically renders a clean, subtle warm peach/orange-tinted placeholder slot
 * with the exact recommended dimensions so you can verify the layout immediately.
 */

export const BANNERS = [
  '/banners/banner-1.png',
  '/banners/banner-2.png',
  '/banners/banner-3.png'
];

export const HOME_BANNERS = BANNERS;

export function renderBannerSlider() {
  const bannerList = Array.isArray(BANNERS) && BANNERS.length > 0 ? BANNERS : [''];

  const slidesHtml = bannerList.map((banner, index) => {
    const src = typeof banner === 'string' ? banner : (banner?.imageUrl || banner?.src || '');
    const linkUrl = (typeof banner === 'object' && (banner?.linkUrl || banner?.link)) || '#book-demo';
    const course = (typeof banner === 'object' && banner?.course) || 'JEE Crash Course';
    const slotNum = index + 1;

    return `
      <div class="mjm-banner-slide" data-slide-index="${index}" role="group" aria-roledescription="slide" aria-label="Ad Slot ${slotNum} of ${bannerList.length}">
        <a href="${linkUrl}" class="mjm-banner-link" data-course="${course}" aria-label="Ad Banner Slot ${slotNum}">
          <!-- Subtle warm peach/orange-tinted placeholder box (bg-[#FFF7ED] border-y border-orange-200/70) -->
          <div class="mjm-banner-placeholder">
            <span class="mjm-placeholder-badge">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="14" height="12" rx="2"></rect>
                <circle cx="8" cy="8" r="1.5"></circle>
                <path d="M17 13l-4-4-5 5"></path>
              </svg>
              Ad Banner Slot ${slotNum}
            </span>
            <span class="mjm-placeholder-hint">(Recommended: 1920 × 150 px)</span>
          </div>

          ${src ? `
            <img 
              src="${src}" 
              alt="Ad Banner Slot ${slotNum}" 
              class="mjm-banner-img w-full h-full object-fill md:object-cover object-center" 
              onload="this.classList.add('is-loaded')"
              onerror="this.style.display='none'"
              ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
            />
          ` : ''}
        </a>
      </div>
    `;
  }).join('');

  const dotsHtml = bannerList.map((_, index) => {
    return `
      <button 
        type="button" 
        class="mjm-banner-dot ${index === 0 ? 'is-active' : ''}" 
        data-dot-index="${index}" 
        role="tab" 
        aria-selected="${index === 0 ? 'true' : 'false'}" 
        aria-label="Go to banner slot ${index + 1}"
      ></button>
    `;
  }).join('');

  return `
    <section class="mjm-banner-slider-section mt-0 w-full relative overflow-hidden" aria-label="Featured Advertisement Banners">
      <div class="mjm-banner-slider-container w-full relative overflow-hidden" id="mjm-banner-slider">
        <!-- Banner Slides Track Window: h-[60px] sm:h-[80px] md:h-[95px] lg:h-[110px] -->
        <div class="mjm-banner-track-wrap w-full relative overflow-hidden" id="mjm-banner-track-wrap">
          <div class="mjm-banner-track" id="mjm-banner-track">
            ${slidesHtml}
          </div>
        </div>

        ${bannerList.length > 1 ? `
          <!-- Left & Right Navigation Arrows -->
          <button type="button" class="mjm-banner-arrow mjm-banner-prev left-3" id="mjm-banner-prev" aria-label="Previous banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button type="button" class="mjm-banner-arrow mjm-banner-next right-3" id="mjm-banner-next" aria-label="Next banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          <!-- Centered Pagination Dots (overlaid cleanly at bottom edge) -->
          <div class="mjm-banner-dots" id="mjm-banner-dots" role="tablist" aria-label="Banner slots pagination">
            ${dotsHtml}
          </div>
        ` : ''}
      </div>
    </section>
  `;
}

export function initBannerSlider() {
  const container = document.getElementById('mjm-banner-slider');
  if (!container) return;

  const track = document.getElementById('mjm-banner-track');
  const trackWrap = document.getElementById('mjm-banner-track-wrap');
  const prevBtn = document.getElementById('mjm-banner-prev');
  const nextBtn = document.getElementById('mjm-banner-next');
  const dotsContainer = document.getElementById('mjm-banner-dots');
  const dots = dotsContainer ? Array.from(dotsContainer.querySelectorAll('.mjm-banner-dot')) : [];
  const slideCount = BANNERS.length;

  if (slideCount <= 1 || !track) {
    return;
  }

  let currentIndex = 0;
  let autoSlideTimer = null;
  const slideIntervalMs = 4500; // Auto-slide every 4.5 seconds

  function updateSlider(index) {
    currentIndex = (index + slideCount) % slideCount;
    track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;

    // Update pagination dots
    dots.forEach((dot, i) => {
      const isActive = i === currentIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-selected', String(isActive));
    });
  }

  function nextSlide() {
    updateSlider(currentIndex + 1);
  }

  function prevSlide() {
    updateSlider(currentIndex - 1);
  }

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideTimer = setInterval(nextSlide, slideIntervalMs);
  }

  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  }

  function resetTimer() {
    startAutoSlide();
  }

  // Arrow navigation buttons
  prevBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    prevSlide();
    resetTimer();
  });

  nextBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    nextSlide();
    resetTimer();
  });

  // Dots navigation
  dots.forEach((dot, index) => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      updateSlider(index);
      resetTimer();
    });
  });

  // Pause on hover
  container.addEventListener('mouseenter', stopAutoSlide);
  container.addEventListener('mouseleave', startAutoSlide);

  // Pause on focus
  container.addEventListener('focusin', stopAutoSlide);
  container.addEventListener('focusout', startAutoSlide);

  // Touch and Swipe Support on Mobile
  let touchStartX = 0;
  let touchEndX = 0;
  let isSwiping = false;
  let hasMoved = false;

  trackWrap?.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchEndX = touchStartX;
    isSwiping = true;
    hasMoved = false;
    stopAutoSlide();
  }, { passive: true });

  trackWrap?.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    touchEndX = e.touches[0].clientX;
    if (Math.abs(touchStartX - touchEndX) > 10) {
      hasMoved = true;
    }
  }, { passive: true });

  trackWrap?.addEventListener('touchend', () => {
    if (!isSwiping) return;
    isSwiping = false;
    const diff = touchStartX - touchEndX;
    if (diff > 40) {
      nextSlide();
    } else if (diff < -40) {
      prevSlide();
    }
    startAutoSlide();
  });

  // Click Handler: Open booking modal when linkUrl is '#book-demo'
  const links = container.querySelectorAll('.mjm-banner-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        return;
      }
      const href = link.getAttribute('href');
      if (href === '#book-demo' || href.startsWith('#book-demo')) {
        e.preventDefault();
        const course = link.getAttribute('data-course') || 'JEE Crash Course';
        if (typeof window.openBookingModal === 'function') {
          window.openBookingModal(course);
        }
      }
    });
  });

  // Start auto-slide on initialization
  startAutoSlide();
}
