/**
 * nu-mee clinic — main.js
 */
(function () {
  'use strict';

  /* ── Sticky header ──────────────────────────────────────── */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile nav ─────────────────────────────────────────── */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.classList.toggle('open');
      mobileNav.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target) && !mobileNav.contains(e.target)) {
        navToggle.classList.remove('open');
        mobileNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
    // Close mobile nav when a link inside it is clicked
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navToggle.classList.remove('open');
        mobileNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Explainer tabs ─────────────────────────────────────── */
  const tabs = document.querySelectorAll('.explainer-tab');
  const panels = document.querySelectorAll('.explainer-panel');
  if (tabs.length && panels.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('aria-controls');
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const panel = document.getElementById(target);
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ── Booking form ───────────────────────────────────────── */
  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name    = (data.get('name') || '').trim();
      const email   = (data.get('email') || '').trim();
      const phone   = (data.get('phone') || '').trim();
      const service = (data.get('service') || '').trim();
      const message = (data.get('message') || '').trim();

      if (!name || !email || !phone) { alert('Please fill in all required fields.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email address.'); return; }

      const subject = encodeURIComponent(`booking enquiry – ${service || 'general'}`);
      const body    = encodeURIComponent(`name: ${name}\nemail: ${email}\nphone: ${phone}\nservice: ${service || 'n/a'}\n\nmessage:\n${message || 'n/a'}`);
      window.location.href = `mailto:numeeclinic@gmail.com?subject=${subject}&body=${body}`;
    });
  }

  /* ── Current page nav highlight ─────────────────────────── */
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((a) => {
    const href = (a.getAttribute('href') || '').split('#')[0].split('?')[0].split('/').pop() || 'index.html';
    if (href === path) a.setAttribute('aria-current', 'page');
  });

})();
