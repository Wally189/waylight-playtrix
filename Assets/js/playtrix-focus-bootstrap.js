(function () {
  const Storage = window.PlaytrixStorage || null;
  const Common = window.PlaytrixCommon || null;
  const focusRoot = document.getElementById('focusRoot');
  const titleNode = document.getElementById('focusPageTitle');
  const subtitleNode = document.getElementById('focusPageSub');
  const topic = new URLSearchParams(window.location.search).get('topic') || 'workboard';
  const stateKey = 'playtrixFolifaxChecks';
  const linkKey = 'playtrixFolifaxLinks';

  const salesItems = [
    'Review all warm and qualified leads.',
    'Send at least three outbound messages with a practical angle.',
    'Follow up every live enquiry with a named next action.',
    'Prepare one example or case-study worth sending.',
    'Draft or refine one proposal or offer summary.'
  ];

  const sustainabilityItems = [
    'Review workload and recovery before adding more commitments.',
    'Check backups, domains, and hosting for avoidable waste or risk.',
    'Prefer reusable templates and simpler processes over duplicated work.',
    'Note one community, charitable, or mission-aligned contribution.',
    'Track one change that makes the business more sustainable to run.'
  ];

  const learningPlan = [
    { id: 'q1', title: 'Quarter 1', subtitle: 'Foundation and commercial readiness', output: '4 to 6 portfolio sites, repeatable build process, and clear packages.', checklist: ['Semantic HTML', 'Accessibility basics and QA routine', 'Performance basics', 'SEO fundamentals', 'Website policy and compliance basics', 'Domains, DNS, hosting, and Git deployment'] },
    { id: 'q2', title: 'Quarter 2', subtitle: 'Digital stewardship skills', output: 'Offer website build, maintenance, and digital cleanup.', checklist: ['Backups, uptime, and monitoring', 'Maintenance checklist design', 'Microsoft 365 folder governance', 'Process mapping and documentation', 'Basic business analysis', 'Write the maintenance and cleanup offer'] },
    { id: 'q3', title: 'Quarter 3', subtitle: 'Consulting discipline', output: '5 to 10 projects, repeatable maintenance offers, clearer pricing.', checklist: ['Structured problem solving', 'Lean and systems thinking', 'Discovery meetings and recommendations', 'Proposal writing', 'Pricing logic', 'Recommendation notes after client conversations'] },
    { id: 'q4', title: 'Quarter 4', subtitle: 'Operational maturity', output: 'Internal system supports tracking, onboarding, reminders, and visibility.', checklist: ['Extend Playtrix for project tracking', 'Add reminder logic', 'Learn contracts, data protection, and record keeping basics', 'Use ICO guidance', 'Build trust assets through portfolio and articles', 'Make the site itself proof of competence'] }
  ];

  function readJson(key, fallback) {
    if (Storage && typeof Storage.readJson === 'function') return Storage.readJson(key, fallback);
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (Storage && typeof Storage.writeJson === 'function') {
      Storage.writeJson(key, value);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normaliseLink(value) {
    if (Common && typeof Common.normaliseActionLink === 'function') return Common.normaliseActionLink(value);
    return String(value || '').trim();
  }

  function buildActions(extraLinks) {
    const links = [
      { href: 'playtrix-console.html#overview', label: 'Front Desk', primary: true },
      { href: 'sitemap.html', label: 'Sitemap', primary: false }
    ].concat(extraLinks || []);
    return `<div class="focus-actions">${links.map((link) => `<a class="planner-btn${link.primary ? ' primary' : ''}" href="${link.href}">${escapeHtml(link.label)}</a>`).join('')}</div>`;
  }

  function introCard(options) {
    return [
      '<article class="card focus-page-intro">',
      `<p class="eyebrow">${escapeHtml(options.eyebrow || 'Waylight-Playtrix')}</p>`,
      `<h2 class="section">${escapeHtml(options.title)}</h2>`,
      `<p class="muted">${escapeHtml(options.description)}</p>`,
      options.help ? `<details class="help-card"><summary><span class="help-icon">i</span><span>View guidance</span></summary><div class="help-card-content"><p>${escapeHtml(options.help)}</p></div></details>` : '',
      buildActions(options.actions),
      '</article>'
    ].join('');
  }

  function noteCard(eyebrow, title, lines, kind) {
    return `<article class="${kind || 'card'} focus-note-card"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h3>${escapeHtml(title)}</h3>${(lines || []).map((line) => `<div class="line"><span class="bullet"></span><div>${line}</div></div>`).join('')}</article>`;
  }

  function updateChecklistProgress(containerId, fillId, textId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const checks = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const done = checks.filter((item) => item.checked).length;
    const total = checks.length || 1;
    const percent = Math.round((done / total) * 100);
    const fill = document.getElementById(fillId);
    const text = document.getElementById(textId);
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;
  }

  function renderChecklist(containerId, prefix, items, fillId, textId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const state = readJson(stateKey, {});
    container.innerHTML = '';
    items.forEach((item, index) => {
      const key = `${prefix}-${index}`;
      const row = document.createElement('div');
      row.className = 'task';
      row.innerHTML = `<label class="task-main"><input type="checkbox" ${state[key] ? 'checked' : ''} /><span>${escapeHtml(item)}</span></label>`;
      const checkbox = row.querySelector('input');
      checkbox.addEventListener('change', () => {
        const next = readJson(stateKey, {});
        next[key] = checkbox.checked;
        writeJson(stateKey, next);
        updateChecklistProgress(containerId, fillId, textId);
      });
      container.appendChild(row);
    });
    updateChecklistProgress(containerId, fillId, textId);
  }

  function renderResourceBank(bankKey, title) {
    const box = document.querySelector(`[data-resource-bank="${bankKey}"]`);
    if (!box) return;
    const links = readJson(linkKey, {});
    box.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
    if (bankKey === 'sales') {
      const key = 'sales-folder';
      const field = document.createElement('label');
      field.innerHTML = `OneDrive sales folder link<input type="text" value="${escapeHtml(links[key] || '')}" placeholder="Paste the OneDrive sales folder URL" />`;
      const input = field.querySelector('input');
      const actions = document.createElement('div');
      actions.className = 'focus-actions';
      function redraw(value) {
        const href = normaliseLink(value);
        actions.innerHTML = href ? `<a class="planner-btn" href="${escapeHtml(href)}" target="_blank" rel="noopener">Open sales folder</a>` : '<span class="muted">Add the main sales folder link when ready.</span>';
      }
      input.addEventListener('input', () => {
        const next = readJson(linkKey, {});
        next[key] = input.value;
        writeJson(linkKey, next);
        redraw(input.value);
      });
      box.appendChild(field);
      box.appendChild(actions);
      redraw(links[key] || '');
      return;
    }
    ['Reference link or file path', 'Supporting document', 'Working note or action link'].forEach((label, index) => {
      const key = `${bankKey}-${index}`;
      const field = document.createElement('label');
      field.innerHTML = `${label}<input type="text" value="${escapeHtml(links[key] || '')}" placeholder="Paste a URL, local path, or note reference" />`;
      field.querySelector('input').addEventListener('input', (event) => {
        const next = readJson(linkKey, {});
        next[key] = event.target.value;
        writeJson(linkKey, next);
      });
      box.appendChild(field);
    });
  }

  function renderLearningPlan() {
    const grid = document.getElementById('learningGrid');
    if (!grid) return;
    grid.innerHTML = '';
    learningPlan.forEach((quarter) => {
      const fillId = `${quarter.id}-fill`;
      const textId = `${quarter.id}-text`;
      const listId = `${quarter.id}-list`;
      const bankKey = `${quarter.id}-bank`;
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `<p class="eyebrow">${escapeHtml(quarter.title)}</p><h2 class="section">${escapeHtml(quarter.subtitle)}</h2><p class="muted">${escapeHtml(quarter.output)}</p><div class="progress"><div class="progress-row"><span>Quarter completion</span><span id="${textId}">0%</span></div><div class="bar"><div class="fill" id="${fillId}"></div></div></div><div id="${listId}" class="focus-stack" style="margin-top:1rem;"></div><div class="resource-bank" data-resource-bank="${bankKey}" style="margin-top:1rem;"></div>`;
      grid.appendChild(card);
      renderChecklist(listId, quarter.id, quarter.checklist, fillId, textId);
      renderResourceBank(bankKey, `${quarter.title} links and documents`);
    });
  }

  function container(id) {
    return `<div id="${id}"></div>`;
  }

  function makePage(currentFor, eyebrow, title, description, content, help, actions, init, wrapperClass) {
    return {
      title: title,
      subtitle: description,
      currentFor: currentFor,
      html: introCard({ eyebrow: eyebrow, title: title, description: description, help: help, actions: actions }) + `<div class="${wrapperClass || 'focus-stack'}">${(content || []).join('')}</div>`,
      init: init || null
    };
  }

  const pages = {};

  [
    ['current-pressure', 'Front Desk', 'Current Pressure', 'Keep the live pressure view separate so the Front Desk stays calm and readable.', [container('deskPressure')], 'Use this view when something needs active handling, escalation, or explicit review. Do not let it dominate the default working desk.'],
    ['projects', 'Workbench', 'Projects', 'Keep approved work, delivery stages, responsibilities, and next actions in one dedicated project register.', [container('projectRegister')]],
    ['governance-calendar', 'Governance', 'Governance Calendar', 'Keep the timing spine visible without burying it inside a much longer governance page.', [container('governanceCalendar')]],
    ['review-dashboard', 'Governance', 'Review Dashboard', 'Use one dashboard for overdue and upcoming governance work rather than mixing it with every register.', [container('governanceReviewDashboard')]],
    ['policy-register', 'Governance', 'Policy Register', 'Keep policy control separate so changes and review timing are easier to scan.', [container('governancePolicyRegister')]],
    ['sop-register', 'Governance', 'SOP Register', 'Use this page for formal procedures that need owners, review dates, and active control.', [container('governanceSopRegister')]],
    ['process-notes', 'Governance', 'Process Notes', 'Keep practical notes and exceptions close without elevating everything into a formal SOP.', [container('governanceProcessNotes')]],
    ['compliance', 'Governance', 'Compliance', 'Bring the practical compliance checklist into its own page so it can be reviewed deliberately.', [container('governanceCompliance')]],
    ['governance-people', 'Governance', 'People', 'Keep the people register distinct from the wider policy and process material around it.', [container('governancePeople')]],
    ['income-expense', 'Finance & Treasury', 'Income & Expense Register', 'Keep the core transaction register separate so updates stay routine rather than getting buried under summary cards.', [container('financeIncomeExpense')]],
    ['invoice-tracker', 'Finance & Treasury', 'Invoice Tracker', 'Track invoice flow and overdue items in a single focused place.', [container('financeInvoiceTracker')]],
    ['recurring-costs', 'Finance & Treasury', 'Recurring Costs', 'Separate recurring commitments from the wider finance view so renewal risk is easier to spot.', [container('financeRecurringCosts')]],
    ['client-revenue', 'Finance & Treasury', 'Client Revenue', 'Keep earned client money distinct from owner-funded support or planning assumptions.', [container('financeClientRevenue')]],
    ['pricing', 'Finance & Treasury', 'Pricing', 'Review packages, rates, and offer logic without cluttering the ledger.', [container('financePricing')]],
    ['forecasts', 'Finance & Treasury', 'Forecasts', 'Use forecasts as planning controls to see where the business is heading rather than as formal accounting.', [container('financeForecasts')]],
    ['cash-position', 'Finance & Treasury', 'Cash Position', 'Keep the near-term cash view easy to read so survival and timing stay explicit.', [container('financeCashPosition')]],
    ['reserves', 'Finance & Treasury', 'Reserves', 'Keep reserve planning explicit so tax, equipment, and operating protection do not become vague.', [container('financeReserves')]],
    ['reference-notes', 'Library & Resources', 'Reference Notes', 'Use this page for support links and reference material that back up decisions elsewhere in the system.', [container('documentSupport')]]
  ].forEach((definition) => {
    pages[definition[0]] = makePage(definition[0], definition[1], definition[2], definition[3], definition[4], definition[5] || '');
  });

  pages.workboard = {
    title: 'Workboard',
    subtitle: 'Controlled execution for the active working flow.',
    currentFor: 'workboard',
    html: [
      introCard({
        eyebrow: 'Workbench',
        title: 'Workboard',
        description: 'Capture into Inbox, move only what truly matters into the active columns, and keep the board small enough to think with.',
        help: 'Use Inbox for capture, Today for real commitments, and the later columns only for work that still deserves attention.',
        actions: [{ href: 'playtrix-focus.html?topic=projects', label: 'Projects' }]
      }),
      '<div class="focus-stack">',
      '  <div class="focus-two">',
      '    <article class="card"><p class="eyebrow">Workbench</p><h2 class="section">Daily flow and controlled execution</h2><div id="kanbanSummary" class="kanban-summary"></div></article>',
      '    <article class="card"><p class="eyebrow">Card Editor</p><h2 class="section">Add or refine a work item</h2><div class="register-toolbar workboard-editor-toolbar"><div class="register-toolbar-copy workboard-editor-copy"><strong id="kanbanEditorStateTitle">Add a work item when you are ready</strong><span id="kanbanEditorStateText">Keep the board readable. Open the work card only when you want to add or edit something.</span></div><div class="register-toolbar-actions"><button type="button" class="kanban-btn kanban-btn-primary" id="kanbanEditorToggle">Open work card</button></div></div><div class="register-editor-card workboard-editor-card" id="kanbanEditorCard" hidden><form id="kanbanForm" class="kanban-form"><input type="hidden" id="kanbanCardId" /><div class="kanban-field"><label for="kanbanTitle">Title</label><input id="kanbanTitle" name="title" type="text" maxlength="120" placeholder="Example: Finish parish homepage revision" required /></div><div class="kanban-field"><label for="kanbanNote">Note</label><textarea id="kanbanNote" name="note" rows="4" placeholder="What matters, what is pending, or what must not be forgotten."></textarea></div><div class="kanban-form-grid"><div class="kanban-field"><label for="kanbanCategory">Category</label><input id="kanbanCategory" name="category" type="text" maxlength="50" placeholder="Client, sales, admin, maintenance" /></div><div class="kanban-field"><label for="kanbanDueDate">Due date</label><input id="kanbanDueDate" name="dueDate" type="date" /></div><div class="kanban-field"><label for="kanbanPriority">Priority</label><select id="kanbanPriority" name="priority"><option value="steady">Steady</option><option value="important">Important</option><option value="urgent">Urgent</option></select></div><div class="kanban-field"><label for="kanbanColumn">Column</label><select id="kanbanColumn" name="column"><option value="inbox">Inbox</option><option value="today">Do Today</option><option value="this-week">Do This Week</option><option value="this-month">Do This Month</option><option value="pending">Pending</option><option value="done">Done</option></select></div></div><div class="kanban-actions"><button type="submit" class="kanban-btn kanban-btn-primary">Save card</button><button type="button" class="kanban-btn" id="kanbanFormReset">Clear form</button></div></form></div></article>',
      '  </div>',
      '  <article class="card workboard-board-card"><div class="kanban-board-header"><div><p class="eyebrow">Drag and Drop</p><h2 class="section">Current workboard</h2></div><p class="muted">Move work cleanly, not all at once.</p></div><div id="kanbanBoard" class="wl-kanban-board" aria-label="Waylight workboard"></div></article>',
      '</div>'
    ].join('')
  };

  pages.sales = makePage(
    'sales',
    'Workbench',
    'Clients & Sales',
    'Use one sales surface for lead movement, client relationships, and the weekly commercial rhythm.',
    [
      `<div class="focus-two">${noteCard('Weekly Cadence', 'Sales checklist', ['Keep a steady weekly sales rhythm instead of reacting only when work dries up.', 'Make proof pieces easy to send, and make every follow-up end with a named next action.'], 'planner-sheet')}${noteCard('Offer Ladder', 'What you are actually selling', ['<strong>Entry</strong><br />Tailored basic websites for straightforward service organisations.', '<strong>Core</strong><br />Standard website builds with stronger structure and governance pages.', '<strong>Recurring</strong><br />Monthly maintenance, monitoring, backups, and advice.', '<strong>Advisory</strong><br />Digital cleanup, process documentation, and systems clarity.'])}</div>`,
      '<article class="planner-sheet"><p class="eyebrow">Weekly Cadence</p><h3>Sales checklist</h3><div class="progress"><div class="progress-row"><span>Cadence complete</span><span id="salesProgressText">0%</span></div><div class="bar"><div class="fill" id="salesProgressFill"></div></div></div><div id="salesChecklist" class="focus-stack" style="margin-top:1rem;"></div><div class="resource-bank" data-resource-bank="sales" style="margin-top:1rem;"></div></article>',
      container('salesPipelineBoard'),
      container('clientRegister'),
      container('leadRegister')
    ],
    'Every live lead needs a stage and a named next action. If it is approved, move it into Projects. If it is cold, close it plainly.',
    null,
    function () {
      renderChecklist('salesChecklist', 'sales', salesItems, 'salesProgressFill', 'salesProgressText');
      renderResourceBank('sales', 'Sales folder');
    }
  );

  pages.marketing = makePage(
    'marketing',
    'Workbench',
    'Marketing',
    'Separate marketing from sales so proof, visibility, and campaign work can be reviewed without cluttering the commercial register.',
    [
      noteCard('Working Rules', 'What marketing should actually do', [
        '<strong>Visibility</strong><br />Make it easier for the right people to find Waylight.',
        '<strong>Proof</strong><br />Show real work, clear thinking, and practical results.',
        '<strong>Trust</strong><br />Use articles, examples, testimonials, and clarity to reduce doubt.',
        '<strong>Follow-up</strong><br />Turn attention into a next step rather than leaving it vague.'
      ], 'planner-sheet'),
      container('marketingCalendar'),
      container('marketingCampaigns'),
      container('marketingAssets'),
      container('marketingChannels'),
      container('marketingSupport')
    ]
  );

  pages['finance-overview'] = makePage(
    'finance-overview',
    'Finance & Treasury',
    'Finance Overview',
    'Use this page for the live financial picture and keep the working registers in their own focused views.',
    [
      '<article class="card"><p class="eyebrow">Finance & Treasury</p><h3>Practical money control for a sole-trader business</h3><div class="focus-chip-row"><span class="focus-chip">Revenue is earned client work</span><span class="focus-chip">Owner contribution stays separate</span><span class="focus-chip">Forecasts are planning controls, not accounts</span></div><div class="resource-bank" data-resource-bank="finance" style="margin-top:1rem;"></div></article>',
      container('financeOverview')
    ],
    'Keep summary reading and register upkeep separate so the finance area stays legible.',
    null,
    function () {
      renderResourceBank('finance', 'Finance sheets and registers');
    }
  );

  pages['asset-register'] = makePage(
    'asset-register',
    'Finance & Treasury',
    'Asset Register',
    'This is now the single asset page inside Finance & Treasury, merging the old split between finance assets and the standalone assets area.',
    [
      container('financeAssetRegister'),
      `<div class="focus-two">${container('assetWebsites')}${container('assetFolders')}</div>`,
      `<div class="focus-two">${container('assetInventory')}<article class="card"><p class="eyebrow">External Links</p><h3>Public-facing links</h3><table class="site-table focus-links-table"><thead><tr><th>Site</th><th>Purpose</th><th>Open</th></tr></thead><tbody><tr><td>Waylight Atlantic</td><td>Main public business site.</td><td><a href="https://www.waylight-atlantic.co.uk" target="_blank" rel="noopener">Open</a></td></tr><tr><td>AlanWP Gallagher</td><td>Personal public profile and writing.</td><td><a href="https://www.alanwpgallagher.info" target="_blank" rel="noopener">Open</a></td></tr></tbody></table></article></div>`
    ]
  );

  pages['tax-reporting'] = makePage(
    'tax-reporting',
    'Finance & Treasury',
    'Tax & Reporting',
    'Use a dedicated page for tax, reporting, and official support links so this work stays structured rather than scattered.',
    [container('financeTaxReporting'), container('financeReportingRegister'), container('financeSupportLinks')]
  );

  pages['learning-plan'] = makePage(
    'learning-plan',
    'Library & Resources',
    'Learning Plan',
    'Keep the formation plan as a dedicated capability page rather than burying it inside the broader library.',
    ['<div id="learningGrid" class="focus-two"></div>'],
    '',
    null,
    function () {
      renderLearningPlan();
    }
  );

  pages.documents = makePage(
    'documents',
    'Library & Resources',
    'Documents',
    'Use this page for the main document register and the client-facing document packs that need to stay current.',
    ['<article class="card"><p class="eyebrow">Client Documents</p><h3>Questionnaires, checklists, and agreements</h3><div class="resource-bank" data-resource-bank="client-docs" style="margin-top:1rem;"></div></article>', container('documentRegister')],
    '',
    null,
    function () {
      renderResourceBank('client-docs', 'Client questionnaires, checklists, contracts');
    }
  );

  pages['sop-library'] = makePage(
    'sop-library',
    'Library & Resources',
    'SOP Library',
    'Keep the SOP library distinct from the wider document view so formal procedures stay easy to find and maintain.',
    ['<article class="card"><p class="eyebrow">SOP Library</p><h3>Reusable operating packs</h3><div class="resource-bank" data-resource-bank="sop-library" style="margin-top:1rem;"></div></article>', container('documentRegister')],
    '',
    null,
    function () {
      renderResourceBank('sop-library', 'SOP links and template packs');
    }
  );

  pages.templates = makePage(
    'templates',
    'Library & Resources',
    'Templates',
    'Keep reusable packs and the main document register on their own page so template material is easier to maintain.',
    [
      noteCard('Template Pack', 'What belongs here', ['Proposal, agreement, and questionnaire packs.', 'Reusable SOP structures and handover sheets.', 'Standard note formats for reviews, recommendations, and client updates.']),
      '<article class="card"><div class="resource-bank" data-resource-bank="sop-library"></div></article>',
      container('documentRegister')
    ],
    '',
    null,
    function () {
      renderResourceBank('sop-library', 'Template pack links');
    }
  );

  pages.archive = makePage(
    'archive',
    'Library & Resources',
    'Archive',
    'Keep superseded packs and older material separate so active documents stay easier to scan.',
    [
      noteCard('Archive Discipline', 'What should move here', ['Superseded questionnaires, SOP drafts, and document packs.', 'Historical versions kept for reference but no longer in active use.', 'Older support notes that should not clutter the live library.']),
      container('documentRegister'),
      container('documentSupport')
    ]
  );

  pages.sustainability = makePage(
    'sustainability',
    'Library & Resources',
    'Sustainability',
    'Use a dedicated sustainability page so resilience work stays visible instead of being treated as spare-time admin.',
    [
      `<div class="focus-two"><article class="card"><p class="eyebrow">Sustainability Dashboard</p><h3>Keep the business sustainable to run</h3><div class="progress"><div class="progress-row"><span>Weekly sustainability actions</span><span id="sustainabilityProgressText">0%</span></div><div class="bar"><div class="fill" id="sustainabilityProgressFill"></div></div></div><div id="sustainabilityChecklist" class="focus-stack" style="margin-top:1rem;"></div><div class="resource-bank" data-resource-bank="sustainability" style="margin-top:1rem;"></div></article>${noteCard('Sustainability Lenses', 'Four kinds of sustainability', ['<strong>Operational</strong><br />Can the business keep running without panic, overload, or hidden work?', '<strong>Digital</strong><br />Are hosting, backups, domains, and document systems manageable?', '<strong>Financial</strong><br />Are you building steadiness rather than only chasing sporadic project wins?', '<strong>Personal</strong><br />Is the workload compatible with Mass, rest, family life, and long-term service?'])}</div>`
    ],
    '',
    null,
    function () {
      renderChecklist('sustainabilityChecklist', 'sustainability', sustainabilityItems, 'sustainabilityProgressFill', 'sustainabilityProgressText');
      renderResourceBank('sustainability', 'Sustainability references and plans');
    }
  );

  const page = pages[topic] || makePage(
    topic,
    'Waylight-Playtrix',
    'Focus View',
    'This focused view does not exist yet. Return to the Front Desk or use the sitemap to open an available section.',
    []
  );

  window.PlaytrixCurrentPage = page.currentFor || topic;
  document.title = `Waylight-Playtrix | ${page.title}`;
  if (titleNode) titleNode.textContent = page.title;
  if (subtitleNode) subtitleNode.textContent = page.subtitle;
  if (focusRoot) focusRoot.innerHTML = page.html;

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof page.init === 'function') {
      page.init();
    }
  });
})();
