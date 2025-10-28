// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('#nav-menu');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// Simple client-side form validation enhancement
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    const name = contactForm.querySelector('#name');
    const email = contactForm.querySelector('#email');
    const message = contactForm.querySelector('#message');
    if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
      e.preventDefault();
      alert('Please fill in all fields.');
    }
  });
}

// Theme toggle (light/dark)
const THEME_KEY = 'theme-preference';
const themeToggle = document.createElement('button');
themeToggle.className = 'btn';
themeToggle.style.marginLeft = '0.5rem';
themeToggle.textContent = 'Toggle Theme';
const nav = document.querySelector('.nav');
if (nav) {
  nav.appendChild(themeToggle);
}

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
}
const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
applyTheme(savedTheme);
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

// Animate skill bars based on data-level attributes
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.bar .bar-fill[data-level]')
    .forEach(el => {
      const level = Math.max(0, Math.min(100, Number(el.getAttribute('data-level')) || 0));
      requestAnimationFrame(() => {
        el.style.width = level + '%';
      });
    });
});

// Prevent double form submissions by disabling submit buttons on submit
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  const buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
  buttons.forEach(btn => { btn.disabled = true; });
});
