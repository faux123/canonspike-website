(function () {
  'use strict';

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasScrollTimeline = CSS.supports('animation-timeline: view()');

  function initScrollAnimations() {
    const fadeEls = document.querySelectorAll('.fade-in');

    if (motionQuery.matches) {
      fadeEls.forEach(el => el.classList.add('visible'));
      return;
    }

    fadeEls.forEach(el => {
      const delay = el.dataset.delay;
      if (delay !== undefined) {
        el.style.setProperty('--delay', delay);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    fadeEls.forEach(el => {
      if (hasScrollTimeline && !el.dataset.delay) return;
      observer.observe(el);
    });
  }

  function initPhotoParallax() {
    if (motionQuery.matches) return;

    const photo = document.querySelector('.hero-photo-wrap');
    const hero = document.querySelector('.section-hero');
    if (!photo || !hero) return;

    let heroH = hero.offsetHeight;
    let active = window.innerWidth >= 768;
    let ticking = false;

    window.addEventListener('resize', () => {
      heroH = hero.offsetHeight;
      active = window.innerWidth >= 768;
      if (!active) photo.style.transform = '';
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (!active || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (scrollY <= heroH) {
          photo.style.transform = 'translateY(' + (-scrollY * 0.08) + 'px)';
        }
        ticking = false;
      });
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initScrollAnimations();
      initPhotoParallax();
    });
  } else {
    initScrollAnimations();
    initPhotoParallax();
  }
})();
