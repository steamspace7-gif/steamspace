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


/* Dropdown menu click/tap support */
function openSubmenu(item) {
  document.querySelectorAll('.has-submenu').forEach(sib => {
    if (sib !== item) sib.classList.remove('open');
  });
  item.classList.add('open');
}

function closeSubmenu(item) {
  if (item) {
    item.classList.remove('open');
  } else {
    document.querySelectorAll('.has-submenu').forEach(s => s.classList.remove('open'));
  }
}

let hoverCloseTimer = null;

document.querySelectorAll('.has-submenu').forEach(item => {
  // Hover: open immediately, close with small delay so cursor can reach submenu
  item.addEventListener('mouseenter', () => {
    clearTimeout(hoverCloseTimer);
    openSubmenu(item);
  });
  item.addEventListener('mouseleave', () => {
    hoverCloseTimer = setTimeout(() => closeSubmenu(item), 200);
  });

  // Click the top link toggles open/closed on touch or when hover isn't available
  const trigger = item.querySelector('a');
  if (trigger) {
    trigger.addEventListener('click', function(e) {
      const menu = item.querySelector('ul');
      if (!menu) return;
      // If submenu is already open and this is a real link click, allow navigation
      if (item.classList.contains('open') && !e.target.closest('ul')) {
        // Let it navigate unless it's the first open action
        return;
      }
      e.preventDefault();
      openSubmenu(item);
    });
  }

  // Clicking inside the submenu follows links normally; parent stays open
  const menu = item.querySelector('ul');
  if (menu) {
    menu.addEventListener('click', function(e) {
      // Allow normal link navigation; don't close here so click completes
      e.stopPropagation();
    });
  }
});

// Close when clicking anywhere outside the nav
document.addEventListener('click', function(e) {
  if (!e.target.closest('.has-submenu')) {
    closeSubmenu();
  }
});

// Close submenus on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSubmenu();
});
