/**
 * My JEE Mentor - Homepage Top Banner Carousel Strip
 * 
 * Easy Banner Management:
 * Add, remove, or modify banners directly in the HOME_BANNERS array below.
 * Uses high-resolution raw banner artwork with clean edge-to-edge responsive fit.
 */

export const HOME_BANNERS = [
  {
    id: 'jee-mains-advance-crash-course',
    imageUrl: '/assets/banners/Gemini_Generated_Image_7f3rhw7f3rhw7f3r (2).png',
    altText: 'Online JEE Mains + Advance Crash Course for JEE 2027 - Max 10 Students per batch - Click to Book Free Demo',
    linkUrl: '#book-demo',
    course: 'JEE Crash Course',
    position: 'top center'
  },
  {
    id: 'engineering-entrance-crash-course',
    imageUrl: '/assets/banners/Gemini_Generated_Image_7f3rhw7f3rhw7f3r (1).png',
    altText: 'MHTCET KCET WBJEE BITSAT Crash Course - Target Top Engineering Colleges - Classes for 12th & Dropper',
    linkUrl: '#book-demo',
    course: 'JEE Crash Course',
    position: 'center center'
  },
  {
    id: 'iit-jee-crash-course-faculty',
    imageUrl: '/assets/banners/Gemini_Generated_Image_7f3rhw7f3rhw7f3r.png',
    altText: 'IIT-JEE Crash Course - Faculty from IIT and NIT - Only 10 Students Per Batch - Limited Seats Enroll Now',
    linkUrl: '#book-demo',
    course: 'JEE Crash Course',
    position: 'center center'
  }
];

export function renderBannerSlider() {
  if (!Array.isArray(HOME_BANNERS) || HOME_BANNERS.length === 0) {
    return '';
  }

  const slidesHtml = HOME_BANNERS.map((banner, index) => {
    return `
      <div class="mjm-banner-slide" data-slide-index="${index}" role="group" aria-roledescription="slide" aria-label="Slide ${index + 1} of ${HOME_BANNERS.length}">
        <a href="${banner.linkUrl || '#book-demo'}" class="mjm-banner-link" ${banner.course ? `data-course="${banner.course}"` : ''} aria-label="${banner.altText}">
          <img 
            src="${banner.imageUrl}" 
            alt="${banner.altText}" 
            class="mjm-banner-img" 
            style="object-position: ${banner.position || 'center'};"
            width="3168" 
            height="1344" 
            ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
          >
        </a>
      </div>
    `;
  }).join('');

  const dotsHtml = HOME_BANNERS.map((_, index) => {
    return `
      <button 
        type="button" 
        class="mjm-banner-dot ${index === 0 ? 'is-active' : ''}" 
        data-dot-index="${index}" 
        role="tab" 
        aria-selected="${index === 0 ? 'true' : 'false'}" 
        aria-label="Go to banner slide ${index + 1}"
      ></button>
    `;
  }).join('');

  return `
    <section class="mjm-banner-slider-section" aria-label="Featured Promotional Announcements">
      <div class="mjm-banner-slider-container" id="mjm-banner-slider">
        <!-- Banner Slides Track Window -->
        <div class="mjm-banner-track-wrap" id="mjm-banner-track-wrap">
          <div class="mjm-banner-track" id="mjm-banner-track">
            ${slidesHtml}
          </div>
        </div>

        ${HOME_BANNERS.length > 1 ? `
          <!-- Navigation Arrows -->
          <button type="button" class="mjm-banner-arrow mjm-banner-prev" id="mjm-banner-prev" aria-label="Previous slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button type="button" class="mjm-banner-arrow mjm-banner-next" id="mjm-banner-next" aria-label="Next slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        ` : ''}
      </div>

      ${HOME_BANNERS.length > 1 ? `
        <!-- Pagination Dots Strip -->
        <div class="mjm-banner-dots" id="mjm-banner-dots" role="tablist" aria-label="Banner slides pagination">
          ${dotsHtml}
        </div>
      ` : ''}
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
  const slideCount = HOME_BANNERS.length;

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

  // Arrow button listeners
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

  // Dots click listeners
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

  // Banner Click Handler: Open booking modal when linkUrl is '#book-demo'
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
