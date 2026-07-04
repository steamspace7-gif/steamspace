/**
 * Steamspace site interactions
 * - Lightbox gallery
 * - Scroll animations (IntersectionObserver)
 * - FAQ accordion
 */

function openLightbox(img) {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  if (!lb || !lbImg) return;
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeLightbox();
});

document.addEventListener('DOMContentLoaded', function () {
  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(function (q) {
    q.addEventListener('click', function () {
      const item = this.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // Scroll animations
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
    observer.observe(el);
  });
});
