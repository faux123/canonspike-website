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

  function initContactForm() {
    var toggle = document.getElementById('show-contact-form');
    var form = document.getElementById('contact-form');
    if (!toggle || !form) return;

    toggle.addEventListener('click', function () {
      var open = form.hidden;
      form.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) form.querySelector('input[name="name"]').focus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('.btn-submit');
      var status = form.querySelector('.form-status');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.textContent = '';
      status.className = 'form-status';

      var data = {
        name: form.querySelector('[name="name"]').value,
        email: form.querySelector('[name="email"]').value,
        message: form.querySelector('[name="message"]').value,
        _hp: form.querySelector('[name="_hp"]').value,
      };

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (res.ok) {
            status.textContent = 'Message sent. I’ll be in touch.';
            form.reset();
          } else {
            status.textContent = res.body.error || 'Something went wrong.';
            status.className = 'form-status error';
          }
          btn.disabled = false;
          btn.textContent = 'Send';
        })
        .catch(function () {
          status.textContent = 'Network error. Try again.';
          status.className = 'form-status error';
          btn.disabled = false;
          btn.textContent = 'Send';
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initScrollAnimations();
      initPhotoParallax();
      initContactForm();
    });
  } else {
    initScrollAnimations();
    initPhotoParallax();
    initContactForm();
  }
})();
