/* ABHS STEM · Staff SEL Apps splash */
(function () {
  "use strict";

  const APPS = [
    {
      id: "emotional-regulation",
      title: "Emotional Regulation",
      subtitle: "DBT skills finder",
      description:
        "Skill finder, quick reference cheat sheet, and 3-step guides aligned with our DBT curriculum.",
      href: "/emotional-regulation",
      status: "live",
      statusLabel: "Live now",
      pills: [
        "Mindfulness",
        "Distress Tolerance",
        "Emotion Regulation",
        "Interpersonal Effectiveness",
      ],
    },
    {
      id: "mindfulness",
      title: "Mindfulness Activities",
      subtitle: "K-8 activities",
      description:
        "Activity finder, cheat sheet, and step-by-step guides for behavioral health educators.",
      href: "/mindfulness",
      status: "preview",
      statusLabel: "Preview",
      pills: ["K-2", "3-5", "6-8", "Trauma-sensitive"],
    },
  ];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }

  /* ---------- theme toggle (mirrors emotional-regulation) ---------- */
  (function () {
    const t = document.querySelector("[data-theme-toggle]");
    const r = document.documentElement;
    let d = matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
    r.setAttribute("data-theme", d);

    function paint() {
      t.setAttribute(
        "aria-label",
        "Switch to " + (d === "dark" ? "light" : "dark") + " mode"
      );
      t.innerHTML =
        d === "dark"
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }

    paint();
    t.addEventListener("click", () => {
      d = d === "dark" ? "light" : "dark";
      r.setAttribute("data-theme", d);
      paint();
    });
  })();

  /* ---------- render app cards ---------- */
  const grid = document.getElementById("apps-grid");
  if (!grid) return;

  grid.innerHTML = APPS.map((app) => {
    const pills = app.pills
      .map((p) => `<span class="app-pill">${esc(p)}</span>`)
      .join("");

    return `
      <a class="app-card app-card--${esc(app.id)}" href="${esc(app.href)}" role="listitem">
        <div class="app-card-top">
          <span class="app-status app-status--${esc(app.status)}">${esc(app.statusLabel)}</span>
          <span class="app-arrow" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </span>
        </div>
        <h3 class="app-title">${esc(app.title)}</h3>
        <p class="app-subtitle">${esc(app.subtitle)}</p>
        <p class="app-desc">${esc(app.description)}</p>
        <div class="app-pills">${pills}</div>
      </a>
    `;
  }).join(`
    <div class="app-card app-card--soon" role="listitem" aria-hidden="true">
      <div class="app-card-top">
        <span class="app-status app-status--soon">Coming soon</span>
      </div>
      <h3 class="app-title">More staff tools</h3>
      <p class="app-desc">Additional SEL dashboards will appear here as they launch.</p>
    </div>
  `);
})();
