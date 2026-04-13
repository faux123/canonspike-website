/**
 * canonspike.com — main.js
 * Scroll animations + hero entrance + footer year
 */

(function () {
  'use strict';

  // ── Footer year ──────────────────────────────────────────────────
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Scroll-triggered fade-in via IntersectionObserver ────────────
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initScrollAnimations() {
    const fadeEls = document.querySelectorAll('.fade-in');

    if (motionQuery.matches) {
      // Skip animations — make everything visible immediately
      fadeEls.forEach(el => el.classList.add('visible'));
      return;
    }

    // Apply staggered delays from data-delay attribute (hero section)
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

    fadeEls.forEach(el => observer.observe(el));
  }

  // ── Hero entrance: trigger immediately on load ────────────────────
  // Hero fade-in elements have data-delay set (0–4),
  // so the IntersectionObserver fires them in staggered sequence
  // as they're already in the viewport on page load.

  // ── Smooth scroll for any internal anchors ───────────────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const id = this.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ── Subtle parallax on profile photo (desktop only) ──────────────
  function initPhotoParallax() {
    if (motionQuery.matches) return;
    if (window.innerWidth < 768) return;

    const photo = document.querySelector('.hero-photo-wrap');
    if (!photo) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          // Subtle: move photo up at half the scroll rate (only within hero)
          const heroH = document.querySelector('.section-hero')?.offsetHeight ?? 0;
          if (scrollY <= heroH) {
            const offset = scrollY * 0.08;
            photo.style.transform = `translateY(${-offset}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ── Init ──────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initScrollAnimations();
      initSmoothScroll();
      initPhotoParallax();
    });
  } else {
    initScrollAnimations();
    initSmoothScroll();
    initPhotoParallax();
  }
})();
