/**
 * Nu-Mee Clinic — Main JavaScript
 * Minimal vanilla JS for: sticky nav, mobile menu, testimonials carousel
 */

(function () {
  'use strict';

  /* ── Sticky header ──────────────────────────────────────── */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile navigation ──────────────────────────────────── */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target) && !mobileNav.contains(e.target)) {
        navToggle.classList.remove('open');
        mobileNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ── Testimonials carousel ──────────────────────────────── */
  const track = document.querySelector('.testimonials-track');
  const dots  = document.querySelectorAll('.carousel-dot');
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');

  if (track && dots.length) {
    let current = 0;
    const cards = track.querySelectorAll('.testimonial-card');
    let visibleCount = getVisibleCount();
    const total = Math.ceil(cards.length / visibleCount);

    function getVisibleCount() {
      return window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
    }

    function goTo(idx) {
      current = Math.max(0, Math.min(idx, Math.ceil(cards.length / visibleCount) - 1));
      const card = cards[0];
      if (!card) return;
      const cardWidth = card.offsetWidth + 24; // gap
      track.style.transform = `translateX(-${current * cardWidth * visibleCount}px)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

    // Auto-advance
    let autoplay = setInterval(() => goTo(current + 1 >= total ? 0 : current + 1), 5000);
    track.addEventListener('mouseenter', () => clearInterval(autoplay));
    track.addEventListener('mouseleave', () => {
      autoplay = setInterval(() => goTo(current + 1 >= total ? 0 : current + 1), 5000);
    });

    // Touch swipe
    let startX = 0;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) goTo(dx < 0 ? current + 1 : current - 1);
    });

    window.addEventListener('resize', () => {
      visibleCount = getVisibleCount();
      goTo(0);
    });

    goTo(0);
  }

  /* ── Animate on scroll (Intersection Observer) ──────────── */
  const animItems = document.querySelectorAll('[data-anim]');
  if (animItems.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    animItems.forEach((el) => observer.observe(el));
  }

  /* ── Mark current page in nav ───────────────────────────── */
  const path = window.location.pathname.replace(/\/$/, '') || '/index';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((a) => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/index';
    if (href === path || (path === '' && href === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ── Booking form (no-server validation + mailto fallback) ── */
  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name    = data.get('name')?.trim();
      const email   = data.get('email')?.trim();
      const phone   = data.get('phone')?.trim();
      const service = data.get('service')?.trim();
      const message = data.get('message')?.trim();

      if (!name || !email || !phone) {
        alert('Please fill in all required fields.');
        return;
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        alert('Please enter a valid email address.');
        return;
      }

      // Compose mailto link as fallback
      const subject = encodeURIComponent(`Booking Enquiry – ${service || 'General'}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${service || 'N/A'}\n\nMessage:\n${message || 'N/A'}`
      );
      window.location.href = `mailto:info@numeeclinic.com.au?subject=${subject}&body=${body}`;
    });
  }

})();
