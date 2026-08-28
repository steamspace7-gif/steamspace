/* ===== ABHS STEM Emotional Regulation Skills Dashboard — app.js ===== */
(function () {
  "use strict";

  (function detectEmbed() {
    const params = new URLSearchParams(location.search);
    let inFrame = false;
    try { inFrame = window.self !== window.top; } catch (_e) { inFrame = true; }
    if (params.get("embed") === "1" || inFrame) {
      document.documentElement.classList.add("is-embed");
    }
  })();

  const DATA = window.SKILLS_DATA;
  const skills = DATA.skills;
  const labels = DATA.meta.stressor_labels;
  const MODULE_ORDER = DATA.meta.modules;
  const STRESSOR_ORDER = DATA.meta.stressors;

  const MODULE_SHORT = {
    "Mindfulness": "Mindfulness",
    "Distress Tolerance": "Distress-Tolerance",
    "Emotion Regulation": "Emotion-Regulation",
    "Interpersonal Effectiveness": "Interpersonal-Effectiveness",
  };
  const MODULE_LETTER = { "Mindfulness":"M", "Distress Tolerance":"D", "Emotion Regulation":"E", "Interpersonal Effectiveness":"I" };

  const ENV_LABEL = { any: "Anywhere", private: "Private", public: "Public" };
  const DIFF_LABEL = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };

  /* ---------- helpers ---------- */
  function modClass(mod){ return "mod-tag " + MODULE_SHORT[mod]; }
  function modTag(mod){ return `<span class="${modClass(mod)}">${mod}</span>`; }
  function stressorChip(key){ return `<span class="chip">${esc(labels[key]||key)}</span>`; }
  function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c])); }
  function timeLabel(min){
    if (min <= 0.75) return "<1 min";
    if (min <= 2) return "1–2 min";
    if (min <= 5) return "2–5 min";
    if (min <= 10) return "5–10 min";
    if (min <= 15) return "10–15 min";
    return "15+ min";
  }
  function levelDots(d){ return `<span class="level-dots" title="${DIFF_LABEL[d]}">${[1,2,3].map(i=>`<i class="${i<=d?"on":""}"></i>`).join("")}</span>`; }

  /* ---------- theme toggle ---------- */
  (function () {
    const t = document.querySelector("[data-theme-toggle]");
    const r = document.documentElement;
    let d = matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
    r.setAttribute("data-theme", d);
    function paint(){
      t.setAttribute("aria-label", "Switch to " + (d === "dark" ? "light" : "dark") + " mode");
      t.innerHTML = d === "dark"
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
    paint();
    t.addEventListener("click", () => { d = d === "dark" ? "light" : "dark"; r.setAttribute("data-theme", d); paint(); });
  })();

  /* ---------- populate dropdowns ---------- */
  const selStressor = document.getElementById("f-stressor");
  STRESSOR_ORDER.forEach(k => { const o = document.createElement("option"); o.value = k; o.textContent = labels[k]; selStressor.appendChild(o); });

  const fModule = document.getElementById("filter-module");
  MODULE_ORDER.forEach(m => { const o = document.createElement("option"); o.value = m; o.textContent = m; fModule.appendChild(o); });

  const fStressor = document.getElementById("filter-stressor");
  STRESSOR_ORDER.forEach(k => { const o = document.createElement("option"); o.value = k; o.textContent = labels[k]; fStressor.appendChild(o); });

  const fEnv = document.getElementById("filter-env");

  /* ============================================================
     RECOMMENDATION ENGINE
     ============================================================ */
  function recommend() {
    const stressor = selStressor.value;
    const intensity = +document.getElementById("f-intensity").value;
    const env = document.querySelector('input[name="env"]:checked').value;
    const timeBudget = +document.getElementById("f-time").value;
    const capacity = document.getElementById("f-capacity").value;
    const conv = document.getElementById("f-conv").value;

    document.getElementById("intensity-val").textContent = intensity;

    const reasons = [];
    let pool = skills.slice();

    // Hard filter: environment
    if (env === "public") {
      pool = pool.filter(s => s.environment !== "private");
      reasons.push("private-only skills hidden", "you're in public");
    }
    // Hard filter: time budget
    pool = pool.filter(s => s.time_minutes <= timeBudget + 0.01);

    const scored = pool.map(s => {
      let score = 0;
      const r = [];

      if (s.stressors.includes(stressor)) { score += 4; r.push("matches your main stressor"); }
      else if (s.stressors.some(k => related(stressor, k, s))) { score += 1.5; r.push("tangentially related"); }

      // intensity logic
      if (intensity >= 8) {
        if (s.module === "Distress Tolerance") { score += 3; r.push("crisis-survival module for high intensity"); }
        if (s.modes.includes("body")) { score += 2.5; r.push("body-based, works when thinking can't"); }
        if (s.time_minutes <= 2) { score += 1.5; r.push("fast enough for a spike"); }
        if (s.modes.includes("cognitive") && capacity === "overwhelmed") { score -= 3; r.push("needs clear thinking you may not have"); }
      } else if (intensity <= 3) {
        if (s.module === "Emotion Regulation") { score += 2; r.push("emotion-regulation module for lower intensity"); }
        if (s.modes.includes("cognitive")) { score += 1.5; r.push("cognitive, good when you can reflect"); }
      } else {
        if (s.modes.includes("cognitive") && capacity !== "overwhelmed") { score += 1.5; }
        if (s.modes.includes("body")) { score += 1; }
      }

      // cognitive capacity
      if (capacity === "overwhelmed") {
        if (s.modes.includes("body")) { score += 2; r.push("sensory/body skill — no heavy thinking required"); }
        if (s.modes.includes("cognitive") && intensity < 8) { score -= 1.5; }
      } else if (capacity === "high") {
        if (s.modes.includes("cognitive")) { score += 1.5; r.push("cognitive skill, and your head is clear"); }
      }

      // conversation
      if (conv === "yes" && s.module === "Interpersonal Effectiveness") { score += 3; r.push("directly addresses interpersonal conflict"); }
      if (conv === "yes" && s.stressors.includes("conflict")) { score += 1; }
      if (conv === "no" && s.module === "Interpersonal Effectiveness" && !s.stressors.includes("overwhelm")) { score -= 1.5; }

      // private need
      if (env === "private" && s.environment === "any") { score += 0.5; }

      // mild preference for the module that classically leads the stressor
      const lead = leadModule(stressor);
      if (lead && s.module === lead) { score += 0.8; if (!r.length) r.push("classic fit for this stressor"); }

      return { s, score, reasons: r };
    });

    scored.sort((a, b) => b.score - a.score || a.s.time_minutes - b.s.time_minutes || a.s.difficulty - b.s.difficulty);
    renderRecResults(scored.slice(0, 5), intensity);
  }

  function related(stressor, k, s){ return false; } // placeholder hook

  function leadModule(stressor){
    const map = {
      panic: "Distress Tolerance", intense_anger: "Distress Tolerance", urge_craving: "Distress Tolerance",
      overwhelm: "Mindfulness", rumination: "Mindfulness", dissociation: "Mindfulness", self_criticism: "Mindfulness",
      sadness: "Emotion Regulation", shame: "Emotion Regulation", grief: "Distress Tolerance", loneliness: "Interpersonal Effectiveness",
      conflict: "Interpersonal Effectiveness", social_anxiety: "Emotion Regulation", work_pressure: "Emotion Regulation",
    };
    return map[stressor] || null;
  }

  function renderRecResults(list, intensity) {
    const box = document.getElementById("rec-results");
    if (!list.length) {
      box.innerHTML = `<p class="rec-reason">No skill fits every constraint — try loosening your time budget or setting to "Anywhere".</p>`;
      return;
    }
    box.innerHTML = list.map((it, i) => {
      const r = it.s;
      const rank = i === 0 ? "top r1" : i === 1 ? "r2" : i === 2 ? "r3" : "rx";
      const label = i === 0 ? "Best" : "#" + (i + 1);
      const reason = it.reasons.length ? it.reasons.join(" · ") : "general fit";
      return `
        <div class="rec-result ${i===0?'top':''}">
          <div class="rec-rank ${rank}">${esc(label)}</div>
          <div>
            <div class="rec-name">${esc(r.name)} ${modTag(r.module)} ${levelDots(r.difficulty)}</div>
            <div class="rec-reason">${esc(reason)} · ~${timeLabel(r.time_minutes)} · ${ENV_LABEL[r.environment]}</div>
          </div>
          <button class="rec-cta" data-id="${r.id}">Show steps →</button>
        </div>`;
    }).join("");
    box.querySelectorAll(".rec-cta").forEach(b => b.addEventListener("click", () => openDrawer(b.dataset.id)));
  }

  /* ============================================================
     CHEAT SHEET — top skills per stressor
     ============================================================ */
  function renderCheat() {
    const grid = document.getElementById("cheat-grid");
    grid.innerHTML = STRESSOR_ORDER.map(k => {
      const matches = skills.filter(s => s.stressors.includes(k));
      // rank by: stressor match + speed + low difficulty + crisis-relevance
      const ranked = matches.map(s => {
        let sc = 0;
        if (s.time_minutes <= 2) sc += 3;
        else if (s.time_minutes <= 5) sc += 1.5;
        if (s.difficulty === 1) sc += 1.5;
        if (s.environment === "any") sc += 1;
        if (s.modes.includes("body")) sc += 1;
        return { s, sc };
      }).sort((a,b)=> b.sc-a.sc || a.s.time_minutes-b.s.time_minutes).slice(0,3);
      const lead = leadModule(k);
      const top = ranked.map((it, i) => {
        const r = it.s;
        return `<div class="cheat-skill"><b>${i===0?'1st':'·'}</b> ${esc(r.name)} <span class="t">· ${timeLabel(r.time_minutes)}</span></div>`;
      }).join("");
      return `
        <div class="cheat-card">
          <div class="cheat-head">
            <span class="cheat-title">${esc(labels[k])}</span>
            <span class="cheat-count">${matches.length} skills</span>
          </div>
          <div class="cheat-skills">${top || '<span class="t">see full table</span>'}</div>
        </div>`;
    }).join("");
  }

  /* ============================================================
     MASTER TABLE — sortable + filterable
     ============================================================ */
  let sortKey = "module";
  let sortDir = 1;
  let activeStressorChip = null;

  function getFiltered() {
    const q = document.getElementById("search").value.trim().toLowerCase();
    const mod = fModule.value;
    const env = fEnv.value;
    const str = fStressor.value;
    return skills.filter(s => {
      if (mod && s.module !== mod) return false;
      if (env === "any" && s.environment !== "any") return false;
      if (env === "private" && s.environment !== "private") return false;
      if (str && !s.stressors.includes(str)) return false;
      if (q) {
        const hay = (s.name + " " + s.module + " " + s.mechanism + " " + s.description + " " + s.stressors.join(" ") + " " + s.emotions.join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sortList(list) {
    return list.sort((a, b) => {
      let x, y;
      if (sortKey === "name") { x = a.name; y = b.name; }
      else if (sortKey === "module") { x = MODULE_ORDER.indexOf(a.module) + a.name; y = MODULE_ORDER.indexOf(b.module) + b.name; }
      else if (sortKey === "difficulty") { x = a.difficulty; y = b.difficulty; }
      else if (sortKey === "time_minutes") { x = a.time_minutes; y = b.time_minutes; }
      else if (sortKey === "environment") { x = a.environment; y = b.environment; }
      else { x = a.name; y = b.name; }
      if (typeof x === "string") { x = x.toLowerCase(); y = y.toLowerCase(); }
      return (x < y ? -1 : x > y ? 1 : 0) * sortDir;
    });
  }

  function renderTable() {
    const body = document.getElementById("table-body");
    const list = sortList(getFiltered());
    document.getElementById("result-count").textContent = `${list.length} of ${skills.length} skills`;
    body.innerHTML = list.map(s => `
      <tr data-id="${s.id}">
        <td class="skill-name"><span class="id">${s.id}</span>${esc(s.name)}</td>
        <td>${modTag(s.module)}</td>
        <td class="num" style="text-align:right">${levelDots(s.difficulty)}<div style="font-size:.7rem;color:var(--text-faint)">${DIFF_LABEL[s.difficulty]}</div></td>
        <td class="num" style="text-align:right;white-space:nowrap">${timeLabel(s.time_minutes)}<div style="font-size:.7rem;color:var(--text-faint)">${esc(s.time_to_impact)}</div></td>
        <td>${ENV_LABEL[s.environment]}</td>
        <td class="mech">${esc(s.mechanism)}</td>
        <td class="stressors-cell">${s.stressors.slice(0,4).map(stressorChip).join("")}${s.stressors.length>4?`<span class="chip">+${s.stressors.length-4}</span>`:""}</td>
      </tr>`).join("");
    body.querySelectorAll("tr").forEach(tr => tr.addEventListener("click", () => openDrawer(tr.dataset.id)));

    document.querySelectorAll("thead th.sortable").forEach(th => {
      const sorted = th.dataset.sort === sortKey;
      th.classList.toggle("sorted", sorted);
      const ind = th.querySelector(".sort-ind");
      if (ind) ind.textContent = sorted ? (sortDir > 0 ? "▲" : "▼") : "↕";
    });
  }

  // add sort indicators
  document.querySelectorAll("thead th.sortable").forEach(th => {
    const span = document.createElement("span"); span.className = "sort-ind"; span.textContent = "↕";
    th.appendChild(span);
    th.addEventListener("click", () => {
      const k = th.dataset.sort;
      if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = (k === "time_minutes" || k === "difficulty") ? 1 : 1; }
      renderTable();
    });
  });

  /* ============================================================
     DRAWER — full skill detail
     ============================================================ */
  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  function openDrawer(id) {
    const s = skills.find(x => x.id === id);
    if (!s) return;
    const c = document.getElementById("drawer-content");
    c.innerHTML = `
      <div class="d-id">${s.id} · ${s.orientation === "acceptance" ? "Acceptance" : "Change"} skill</div>
      <h3>${esc(s.name)}</h3>
      <div class="d-tags">${modTag(s.module)} ${levelDots(s.difficulty)} <span class="chip">${DIFF_LABEL[s.difficulty]}</span> <span class="chip">~${timeLabel(s.time_minutes)}</span> <span class="chip">${ENV_LABEL[s.environment]}</span></div>
      <div class="d-row"><span class="k">Targets</span><span>${s.stressors.map(k=>`<span class="chip" style="margin-right:.25rem">${esc(labels[k])}</span>`).join("")}</span></div>
      <p class="d-desc">${esc(s.description)}</p>
      <h4>How to apply it</h4>
      <ol>${s.steps.map(st => `<li>${esc(st)}</li>`).join("")}</ol>
      <div class="d-mech"><strong>Why it works:</strong> ${esc(s.mechanism)}</div>
      ${s.notes ? `<div class="d-note">${esc(s.notes)}</div>` : ""}
    `;
    drawer.classList.add("open"); backdrop.classList.add("open");
    drawer.setAttribute("aria-hidden","false"); backdrop.setAttribute("aria-hidden","false");
  }
  function closeDrawer(){ drawer.classList.remove("open"); backdrop.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); backdrop.setAttribute("aria-hidden","true"); }
  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

  /* ---------- wire up ---------- */
  ["f-stressor","f-intensity","f-time","f-capacity","f-conv"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(el.type === "range" ? "input" : "change", recommend);
  });
  document.querySelectorAll('input[name="env"]').forEach(r => r.addEventListener("change", recommend));
  document.getElementById("search").addEventListener("input", renderTable);
  fModule.addEventListener("change", renderTable);
  fEnv.addEventListener("change", renderTable);
  fStressor.addEventListener("change", renderTable);

  // initial
  document.getElementById("table-count").textContent = skills.length;
  renderCheat();
  renderTable();
  recommend();
})();
