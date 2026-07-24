/**
 * STEAMSPACE @ Ft Apache — site interactions
 */

function openLightbox(img) {
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  if (!lb || !lbImg) return;
  lbImg.src = img.src;
  lbImg.alt = img.alt || "";
  lb.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.classList.remove("active");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeLightbox();
    document.querySelectorAll(".has-submenu.open").forEach((el) => el.classList.remove("open"));
    document.querySelector(".site-nav")?.classList.remove("open");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const isMobileNav = () => window.matchMedia("(max-width: 840px)").matches;
  const closeSubmenus = () => {
    document.querySelectorAll(".has-submenu.open").forEach((el) => el.classList.remove("open"));
  };

  // Always start closed (guards against sticky hover / bfcache restore).
  closeSubmenus();
  document.querySelector(".site-nav")?.classList.remove("open");

  // Mobile nav
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  toggle?.addEventListener("click", () => {
    nav?.classList.toggle("open");
    const open = nav?.classList.contains("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) closeSubmenus();
  });

  // Submenus: CSS handles desktop hover; JS handles mobile tap + close-on-outside.
  document.querySelectorAll(".has-submenu").forEach((item) => {
    const trigger = item.querySelector(":scope > a");
    trigger?.addEventListener("click", (e) => {
      if (isMobileNav()) {
        e.preventDefault();
        const willOpen = !item.classList.contains("open");
        closeSubmenus();
        if (willOpen) item.classList.add("open");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".has-submenu")) closeSubmenus();
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) closeSubmenus();
  });

  // FAQ accordion
  document.querySelectorAll(".faq-question").forEach((btn) => {
    const item = btn.parentElement;
    const answer = item.querySelector(".faq-answer");
    // Initialize closed state
    btn.setAttribute("aria-expanded", "false");
    answer.style.maxHeight = null;

    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((openItem) => {
        openItem.classList.remove("open");
        const q = openItem.querySelector(".faq-question");
        if (q) q.setAttribute("aria-expanded", "false");
        openItem.querySelector(".faq-answer").style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  // Scroll reveal
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
});
