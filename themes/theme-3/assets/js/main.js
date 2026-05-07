document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const htmlElement = document.documentElement;

  /**
   * High-End Theme Engine
   */
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
      if (sunIcon) sunIcon.classList.remove('hidden');
      if (moonIcon) moonIcon.classList.add('hidden');
    } else {
      htmlElement.classList.remove('dark');
      if (sunIcon) sunIcon.classList.add('hidden');
      if (moonIcon) moonIcon.classList.remove('hidden');
    }
  };

  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  
  applyTheme(initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = htmlElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
    });
  }

  /**
   * Mobile Menu Toggle
   */
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    // Close menu when clicking a link
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  /**
   * Intersection Observer for Premium Reveal Animations
   */
  const observerOptions = {
    threshold: 0.05,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Unobserve to prevent repeat animations during scroll
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const revealElements = document.querySelectorAll('.reveal');
  revealElements.forEach(el => observer.observe(el));

  /**
   * Navbar Transparency Logic
   */
  const navbar = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar?.classList.add('shadow-xl', 'bg-white/95', 'dark:bg-[#0a0a0a]/95');
      navbar?.classList.remove('bg-white/80', 'dark:bg-[#0a0a0a]/80');
    } else {
      navbar?.classList.remove('shadow-xl', 'bg-white/95', 'dark:bg-[#0a0a0a]/95');
      navbar?.classList.add('bg-white/80', 'dark:bg-[#0a0a0a]/80');
    }
  });

  /**
   * Infinite Marquee Clone for smoothness
   */
  const marqueeInner = document.querySelector('.animate-marquee');
  if (marqueeInner) {
    const clone = marqueeInner.innerHTML;
    marqueeInner.innerHTML += clone;
  }

  console.log('RonTea Portfolio: Refined Core Loaded');
});