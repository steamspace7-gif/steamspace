(function () {
  const data = window.ACTIVITIES_DATA || [];
  const activities = data.activities || [];
  let sortKey = 'name';
  let sortDir = 1;
  const filters = { age: 'all', type: 'all', use: 'all', energy: 'all', mind: 'all', trauma: false, search: '' };
  const SOM_ORDER = ['Emotion Mind', 'Robot Mind', 'Wise Mind'];
  function mindClass(s) { return 'pill-mind-' + s.replace(/ /g, '-'); }
  const recFilters = { age: 'all', use: 'all', time: 'all', setting: 'all', group: 'all', type: 'all' };

  // ---- Helpers ----
  const el = (id) => document.getElementById(id);
  const pad = (n) => n < 10 ? '0' + n : '' + n;
  const pillType = (t) => t.replace(/[ /]/g, '-');
  function ageShort(bands) {
    const map = { 'K-2': 'K2', '3-5': '35', '6-8': '68' };
    return bands.map(b => map[b] || b).join('/');
  }
  function fmtTime(m) {
    if (m <= 1) return '<1m';
    if (m >= 30) return '20m+';
    return m + 'm';
  }
  function useLabel(u) { return u.replace(/_/g, ' '); }
  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ---- Init ----
  function init() {
    el('activity-count').textContent = activities.length;
    el('table-count').textContent = activities.length;
    populateSelectors();
    renderFramework();
    renderTable();
    renderCheatSheet();
    attachEvents();
  }

  // ---- States of Mind Framework ----
  function renderFramework() {
    const fw = (data.meta && data.meta.states_of_mind_framework) || {};
    const grid = el('som-grid');
    if (!grid) return;
    grid.innerHTML = SOM_ORDER.map(s => {
      const info = fw[s] || {};
      const cls = 'som-card-' + s.replace(/ /g, '-');
      const dbtTerm = info.dbt_term && info.dbt_term !== s ? `<p class="som-dbt-term">DBT term: ${escapeHtml(info.dbt_term)}</p>` : '';
      return `<div class="som-framework-card ${cls}">
        <h4>${escapeHtml(s)}</h4>
        ${dbtTerm}
        <p>${escapeHtml(info.description || '')}</p>
        <p class="som-feel">${escapeHtml(info.what_it_feels_like || '')}</p>
      </div>`;
    }).join('');
  }

  function populateSelectors() {
    const types = [...new Set(activities.map(a => a.activity_type))].sort();
    const uses = [...new Set(activities.map(a => a.primary_use_case))].sort();
    const selType = el('rec-type'), selUse = el('rec-use'), fType = el('f-type'), fUse = el('f-use');
    types.forEach(t => {
      selType.add(new Option(t, t));
      fType.add(new Option(t, t));
    });
    uses.forEach(u => {
      const lbl = useLabel(u);
      selUse.add(new Option(lbl, u));
      fUse.add(new Option(lbl, u));
    });
  }

  // ---- Table ----
  function getFiltered() {
    return activities.filter(a => {
      if (filters.age !== 'all' && !a.age_bands.includes(filters.age)) return false;
      if (filters.type !== 'all' && a.activity_type !== filters.type) return false;
      if (filters.use !== 'all' && a.primary_use_case !== filters.use) return false;
      if (filters.energy !== 'all' && a.energy_level !== filters.energy) return false;
      if (filters.mind !== 'all' && !(a.states_of_mind || []).includes(filters.mind)) return false;
      if (filters.trauma && !a.trauma_notes) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [a.name, a.activity_type, a.primary_use_case, a.mechanism, a.materials, a.id].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    let list = getFiltered();
    list.sort((a, b) => {
      let va, vb;
      if (sortKey === 'age_bands') { va = a.age_bands.join(','); vb = b.age_bands.join(','); }
      else if (sortKey === 'duration_minutes') { va = a.duration_minutes; vb = b.duration_minutes; }
      else if (sortKey === 'difficulty') { va = a.difficulty; vb = b.difficulty; }
      else { va = (a[sortKey] || '').toString().toLowerCase(); vb = (b[sortKey] || '').toString().toLowerCase(); }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    const tb = el('table-body');
    tb.innerHTML = list.map(a => {
      const tp = pillType(a.activity_type);
      const energyClass = a.energy_level.replace(/[ /]/g, '-');
      const mindHtml = (a.states_of_mind || []).map(s => `<span class="mind-chip ${mindClass(s)}">${escapeHtml(s)}</span>`).join(' ');
      return `<tr data-id="${a.id}">
        <td class="cell-name">${escapeHtml(a.name)}</td>
        <td>${ageShort(a.age_bands)}</td>
        <td><span class="pill pill-${tp}">${escapeHtml(a.activity_type)}</span></td>
        <td>${escapeHtml(useLabel(a.primary_use_case))}</td>
        <td>${fmtTime(a.duration_minutes)}</td>
        <td>${escapeHtml(a.setting)}</td>
        <td><span class="energy-dot energy-${energyClass}"></span>${escapeHtml(a.energy_level)}</td>
        <td><div class="mind-chip-row" style="margin:0">${mindHtml}</div></td>
        <td>${a.difficulty === 1 ? 'Easy' : a.difficulty === 2 ? 'Mod' : 'High'}</td>
      </tr>`;
    }).join('');
    el('result-count').textContent = `${list.length} of ${activities.length} activities shown`;
  }

  // ---- Drawer ----
  function openActivity(id) {
    const a = activities.find(x => x.id === id);
    if (!a) return;
    const tp = pillType(a.activity_type);
    const energyClass = a.energy_level.replace(/[ /]/g, '-');
    const traumaHtml = a.trauma_notes
      ? `<div class="drawer-section"><h4>Trauma-Sensitive Notes</h4><div class="trauma-box">${escapeHtml(a.trauma_notes)}</div></div>` : '';
    const mindChipsHtml = (a.states_of_mind || []).map(s => `<span class="mind-chip ${mindClass(s)}">${escapeHtml(s)}</span>`).join(' ');
    const wiseMindHtml = a.wise_mind_note
      ? `<div class="drawer-section"><h4>Wise Mind Connection</h4><div class="wise-mind-box">${escapeHtml(a.wise_mind_note)}</div></div>` : '';
    const cautionHtml = a.contraindications
      ? `<div class="caution-box"><strong>Cautions:</strong> ${escapeHtml(a.contraindications)}</div>` : '';
    const adaptHtml = a.adaptations ? `<p>${escapeHtml(a.adaptations)}</p>` : '';
    const srcHtml = a.source_url
      ? `<a href="${a.source_url}" target="_blank" rel="noopener">${escapeHtml(a.source)}</a>`
      : escapeHtml(a.source || '');

    el('drawer-content').innerHTML = `
      <h2>${escapeHtml(a.name)}</h2>
      <div class="drawer-tags">
        <span class="pill pill-${tp}">${escapeHtml(a.activity_type)}</span>
        <span class="pill pill-Transition">${ageShort(a.age_bands)}</span>
        <span class="pill" style="background:#F0EADC;color:#6B5A2E">${fmtTime(a.duration_minutes)}</span>
        <span class="pill" style="background:var(--surface-alt);color:var(--text-muted)">${escapeHtml(a.group_size)}</span>
        <span class="pill" style="background:var(--surface-alt);color:var(--text-muted)"><span class="energy-dot energy-${energyClass}"></span>${escapeHtml(a.energy_level)}</span>
        ${a.trauma_notes ? '<span class="trauma-badge">Trauma-sensitive</span>' : ''}
      </div>
      <div class="mind-chip-row">${mindChipsHtml}</div>
      <div class="drawer-section">
        <h4>Quick Facts</h4>
        <div class="meta-grid">
          <div><span>Grades</span>${a.age_bands.join(', ')}</div>
          <div><span>Duration</span>${a.duration}</div>
          <div><span>Setting</span>${escapeHtml(a.setting)}</div>
          <div><span>Group size</span>${escapeHtml(a.group_size)}</div>
          <div><span>Materials</span>${escapeHtml(a.materials)}</div>
          <div><span>Difficulty</span>${a.difficulty === 1 ? 'Easy' : a.difficulty === 2 ? 'Moderate' : 'High'}</div>
        </div>
      </div>
      <div class="drawer-section">
        <h4>How to do it</h4>
        <ol class="drawer-steps">${a.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      </div>
      <div class="drawer-section">
        <h4>Adaptations</h4>
        ${adaptHtml || '<p style="color:var(--text-faint)">No adaptations needed.</p>'}
        ${cautionHtml}
      </div>
      ${wiseMindHtml}
      ${traumaHtml}
      <div class="drawer-section">
        <h4>Why it works</h4>
        <p>${escapeHtml(a.mechanism)}</p>
      </div>
      <div class="drawer-section">
        <h4>Evidence basis</h4>
        <p>${escapeHtml(a.evidence_basis)}</p>
      </div>
      <div class="drawer-section">
        <h4>When to use</h4>
        <p>${escapeHtml(a.when_to_use)}</p>
      </div>
      <div class="drawer-section source-link">
        <h4>Source</h4>
        <p>${srcHtml}</p>
      </div>
    `;
    el('drawer').classList.add('open');
    el('drawer').setAttribute('aria-hidden', 'false');
    el('drawer-overlay').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    el('drawer').classList.remove('open');
    el('drawer').setAttribute('aria-hidden', 'true');
    el('drawer-overlay').hidden = true;
    document.body.style.overflow = '';
  }

  // ---- Cheat Sheet ----
  function renderCheatSheet() {
    const useCases = [
      { key: 'Anxiety/worry', label: 'Anxiety & Worry' },
      { key: 'Attention/focus', label: 'Attention & Focus' },
      { key: 'Sadness/shutdown', label: 'Sadness & Shutdown' },
      { key: 'Hyperactivity/restlessness', label: 'Hyperactivity' },
      { key: 'Transition difficulty', label: 'Transitions' },
      { key: 'Anger/frustration', label: 'Anger & Frustration' },
    ];
    const html = useCases.map(uc => {
      const items = activities
        .filter(a => a.primary_use_case === uc.key)
        .sort((x, y) => x.duration_minutes - y.duration_minutes)
        .slice(0, 6);
      return `<div class="cheat-col">
        <h3>${uc.label}</h3>
        ${items.map(a => `<div class="cheat-item" data-id="${a.id}">
          <span class="ci-name">${escapeHtml(a.name)}</span>
          <span class="ci-meta">${fmtTime(a.duration_minutes)} · ${ageShort(a.age_bands)} · ${escapeHtml(a.energy_level)}</span>
        </div>`).join('')}
      </div>`;
    }).join('');
    el('cheat-grid').innerHTML = html;
  }

  // ---- Recommender ----
  function runRecommender() {
    let list = activities.filter(a => {
      if (recFilters.age !== 'all' && !a.age_bands.includes(recFilters.age)) return false;
      if (recFilters.use !== 'all' && a.primary_use_case !== recFilters.use) return false;
      if (recFilters.time !== 'all') {
        const max = parseInt(recFilters.time, 10);
        if (a.duration_minutes > max) return false;
      }
      if (recFilters.setting !== 'all' && a.setting !== recFilters.setting && a.setting !== 'Any') return false;
      if (recFilters.group !== 'all') {
        if (recFilters.group === 'Individual' && !a.group_size.includes('Individual')) return false;
        if (recFilters.group === 'Small' && !a.group_size.includes('Small')) return false;
        if (recFilters.group === 'Whole' && !a.group_size.includes('Whole')) return false;
      }
      if (recFilters.type !== 'all' && a.activity_type !== recFilters.type) return false;
      return true;
    });

    const res = el('rec-results');
    if (list.length === 0) {
      res.innerHTML = '<div class="rec-placeholder">No activities match those exact criteria. Try loosening a filter.</div>';
      return;
    }
    list.sort((a, b) => a.difficulty - b.difficulty || a.duration_minutes - b.duration_minutes);
    list = list.slice(0, 6);
    res.innerHTML = `<div class="rec-list">${list.map((a, i) => {
      const tp = pillType(a.activity_type);
      return `<div class="rec-item" data-id="${a.id}">
        <div class="rec-rank">${i + 1}</div>
        <div class="rec-body">
          <div class="rec-name">${escapeHtml(a.name)}</div>
          <div class="rec-meta"><span class="pill pill-${tp}">${escapeHtml(a.activity_type)}</span>${ageShort(a.age_bands)} · ${fmtTime(a.duration_minutes)} · ${escapeHtml(a.energy_level)}</div>
        </div>
        <div class="rec-arrow">View →</div>
      </div>`;
    }).join('')}</div>`;
  }

  // ---- Events ----
  function attachEvents() {
    // Table sorting
    document.querySelectorAll('#activity-table th').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.key;
        if (sortKey === k) sortDir *= -1;
        else { sortKey = k; sortDir = 1; }
        renderTable();
      });
    });
    // Row click
    el('table-body').addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (row) openActivity(row.dataset.id);
    });
    // Filters
    el('search').addEventListener('input', (e) => { filters.search = e.target.value; renderTable(); });
    el('f-age').addEventListener('change', (e) => { filters.age = e.target.value; renderTable(); });
    el('f-type').addEventListener('change', (e) => { filters.type = e.target.value; renderTable(); });
    el('f-use').addEventListener('change', (e) => { filters.use = e.target.value; renderTable(); });
    el('f-energy').addEventListener('change', (e) => { filters.energy = e.target.value; renderTable(); });
    el('f-mind').addEventListener('change', (e) => { filters.mind = e.target.value; renderTable(); });
    el('f-trauma').addEventListener('change', (e) => { filters.trauma = e.target.checked; renderTable(); });

    // Drawer
    el('drawer-close').addEventListener('click', closeDrawer);
    el('drawer-overlay').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

    // Recommender
    document.querySelectorAll('#rec-age .chip').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('#rec-age .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        recFilters.age = c.dataset.val;
        runRecommender();
      });
    });
    ['rec-use', 'rec-time', 'rec-setting', 'rec-group', 'rec-type'].forEach(id => {
      el(id).addEventListener('change', (e) => {
        recFilters[id.replace('rec-', '')] = e.target.value;
        runRecommender();
      });
    });

    // Cheat sheet click + rec item click (delegated)
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.cheat-item, .rec-item');
      if (item) openActivity(item.dataset.id);
    });

    // Header buttons
    el('btn-cheat').addEventListener('click', () => {
      el('cheat-section').scrollIntoView({ behavior: 'smooth' });
    });
    el('btn-trauma').addEventListener('click', () => {
      filters.trauma = !filters.trauma;
      el('f-trauma').checked = filters.trauma;
      el('btn-trauma').classList.toggle('active', filters.trauma);
      renderTable();
      el('table').scrollIntoView({ behavior: 'smooth' });
    });
  }

  init();
})();
