(function () {
  const Storage = window.PlaytrixStorage;
  const routeUsageKey = 'playtrix.routeUsage';
  const pendingTargetKey = 'playtrix.pendingTarget';
  const sectionByPage = {
    overview: 'front-desk',
    diary: 'front-desk',
    'current-pressure': 'front-desk',
    analytics: 'front-desk',
    sitemap: 'front-desk',
    tools: 'workbench',
    contacts: 'workbench',
    workboard: 'workbench',
    projects: 'workbench',
    sales: 'workbench',
    marketing: 'workbench',
    operating: 'workbench',
    governance: 'governance',
    'governance-calendar': 'governance',
    'review-dashboard': 'governance',
    'policy-register': 'governance',
    'sop-register': 'governance',
    'process-notes': 'governance',
    compliance: 'governance',
    'governance-people': 'governance',
    finance: 'finance-treasury',
    'finance-overview': 'finance-treasury',
    'income-expense': 'finance-treasury',
    'invoice-tracker': 'finance-treasury',
    'recurring-costs': 'finance-treasury',
    'asset-register': 'finance-treasury',
    'client-revenue': 'finance-treasury',
    pricing: 'finance-treasury',
    forecasts: 'finance-treasury',
    'cash-position': 'finance-treasury',
    reserves: 'finance-treasury',
    'tax-reporting': 'finance-treasury',
    assets: 'finance-treasury',
    learning: 'library-resources',
    'learning-plan': 'library-resources',
    'sop-library': 'library-resources',
    documents: 'library-resources',
    templates: 'library-resources',
    'reference-notes': 'library-resources',
    sustainability: 'library-resources',
    archive: 'library-resources',
    docs: 'library-resources'
  };

  const groups = [
    {
      key: 'front-desk',
      title: 'Front Desk',
      items: [
        { title: 'Front Desk', href: 'playtrix-console.html#overview', routeKey: 'overview', currentFor: 'overview', pageTarget: 'overview', targetId: 'front-desk-workflow' },
        { title: 'Business Diary', href: 'playtrix-console.html#diary', routeKey: 'diary', currentFor: 'diary', pageTarget: 'overview', targetId: 'diary' },
        { title: 'Current Pressure', href: 'playtrix-focus.html?topic=current-pressure', routeKey: 'current-pressure', currentFor: 'current-pressure' },
        { title: 'Analytics', href: 'analytics.html', routeKey: 'analytics', currentFor: 'analytics' }
      ]
    },
    {
      key: 'workbench',
      title: 'Workbench',
      items: [
        { title: 'Tools Deck', href: 'tools.html', routeKey: 'tools', currentFor: 'tools' },
        { title: 'Workboard', href: 'playtrix-focus.html?topic=workboard', routeKey: 'workboard', currentFor: 'workboard' },
        { title: 'Projects', href: 'playtrix-focus.html?topic=projects', routeKey: 'projects', currentFor: 'projects' },
        { title: 'Clients & Sales', href: 'playtrix-focus.html?topic=sales', routeKey: 'sales', currentFor: 'sales' },
        { title: 'Marketing', href: 'playtrix-focus.html?topic=marketing', routeKey: 'marketing', currentFor: 'marketing' },
        { title: 'Contacts', href: 'contacts.html', routeKey: 'contacts', currentFor: 'contacts' }
      ]
    },
    {
      key: 'governance',
      title: 'Governance',
      items: [
        { title: 'Governance Calendar', href: 'playtrix-focus.html?topic=governance-calendar', routeKey: 'governance-calendar', currentFor: 'governance-calendar' },
        { title: 'Review Dashboard', href: 'playtrix-focus.html?topic=review-dashboard', routeKey: 'review-dashboard', currentFor: 'review-dashboard' },
        { title: 'Policy Register', href: 'playtrix-focus.html?topic=policy-register', routeKey: 'policy-register', currentFor: 'policy-register' },
        { title: 'SOP Register', href: 'playtrix-focus.html?topic=sop-register', routeKey: 'sop-register', currentFor: 'sop-register' },
        { title: 'Process Notes', href: 'playtrix-focus.html?topic=process-notes', routeKey: 'process-notes', currentFor: 'process-notes' },
        { title: 'Compliance', href: 'playtrix-focus.html?topic=compliance', routeKey: 'compliance', currentFor: 'compliance' },
        { title: 'People', href: 'playtrix-focus.html?topic=governance-people', routeKey: 'governance-people', currentFor: 'governance-people' }
      ]
    },
    {
      key: 'finance-treasury',
      title: 'Finance & Treasury',
      items: [
        { title: 'Finance Overview', href: 'playtrix-focus.html?topic=finance-overview', routeKey: 'finance-overview', currentFor: 'finance-overview' },
        { title: 'Income & Expense Register', href: 'playtrix-focus.html?topic=income-expense', routeKey: 'income-expense', currentFor: 'income-expense' },
        { title: 'Invoice Tracker', href: 'playtrix-focus.html?topic=invoice-tracker', routeKey: 'invoice-tracker', currentFor: 'invoice-tracker' },
        { title: 'Recurring Costs', href: 'playtrix-focus.html?topic=recurring-costs', routeKey: 'recurring-costs', currentFor: 'recurring-costs' },
        { title: 'Asset Register', href: 'playtrix-focus.html?topic=asset-register', routeKey: 'asset-register', currentFor: 'asset-register' },
        { title: 'Client Revenue', href: 'playtrix-focus.html?topic=client-revenue', routeKey: 'client-revenue', currentFor: 'client-revenue' },
        { title: 'Pricing', href: 'playtrix-focus.html?topic=pricing', routeKey: 'pricing', currentFor: 'pricing' },
        { title: 'Forecasts', href: 'playtrix-focus.html?topic=forecasts', routeKey: 'forecasts', currentFor: 'forecasts' },
        { title: 'Cash Position', href: 'playtrix-focus.html?topic=cash-position', routeKey: 'cash-position', currentFor: 'cash-position' },
        { title: 'Reserves', href: 'playtrix-focus.html?topic=reserves', routeKey: 'reserves', currentFor: 'reserves' },
        { title: 'Tax & Reporting', href: 'playtrix-focus.html?topic=tax-reporting', routeKey: 'tax-reporting', currentFor: 'tax-reporting' }
      ]
    },
    {
      key: 'library-resources',
      title: 'Library & Resources',
      items: [
        { title: 'Learning Plan', href: 'playtrix-focus.html?topic=learning-plan', routeKey: 'learning-plan', currentFor: 'learning-plan' },
        { title: 'SOP Library', href: 'playtrix-focus.html?topic=sop-library', routeKey: 'sop-library', currentFor: 'sop-library' },
        { title: 'Documents', href: 'playtrix-focus.html?topic=documents', routeKey: 'documents', currentFor: 'documents' },
        { title: 'Templates', href: 'playtrix-focus.html?topic=templates', routeKey: 'templates', currentFor: 'templates' },
        { title: 'Reference Notes', href: 'playtrix-focus.html?topic=reference-notes', routeKey: 'reference-notes', currentFor: 'reference-notes' },
        { title: 'Sustainability', href: 'playtrix-focus.html?topic=sustainability', routeKey: 'sustainability', currentFor: 'sustainability' },
        { title: 'Archive', href: 'playtrix-focus.html?topic=archive', routeKey: 'archive', currentFor: 'archive' }
      ]
    }
  ];

  function readUsage() {
    return Storage ? Storage.readJson(routeUsageKey, {}) : {};
  }

  function getPendingTarget() {
    try {
      return JSON.parse(sessionStorage.getItem(pendingTargetKey)) || null;
    } catch {
      return null;
    }
  }

  function setPendingTarget(page, targetId) {
    if (!page || !targetId) return;
    sessionStorage.setItem(pendingTargetKey, JSON.stringify({ page: page, targetId: targetId }));
  }

  function clearPendingTarget() {
    sessionStorage.removeItem(pendingTargetKey);
  }

  function bumpRoute(routeKey) {
    if (!routeKey) return;
    if (Storage) {
      Storage.bumpCounterMap(routeUsageKey, routeKey);
      return;
    }
    const usage = readUsage();
    usage[routeKey] = (usage[routeKey] || 0) + 1;
    localStorage.setItem(routeUsageKey, JSON.stringify(usage));
  }

  function isConsoleRoute() {
    return window.location.pathname.toLowerCase().endsWith('playtrix-console.html');
  }

  function resolveConsolePage(target) {
    const cleanTarget = String(target || '').replace('#', '');
    if (!cleanTarget) return '';
    if (sectionByPage[cleanTarget]) return cleanTarget;
    const sectionTarget = document.getElementById(cleanTarget);
    const page = sectionTarget ? sectionTarget.closest('.page') : null;
    return page && page.id.indexOf('page-') === 0 ? page.id.replace('page-', '') : '';
  }

  function resolvePage(host) {
    if (sectionByPage[window.PlaytrixCurrentPage || '']) {
      return window.PlaytrixCurrentPage;
    }
    if (isConsoleRoute()) {
      const hash = (window.location.hash || '#overview').replace('#', '');
      const hashPage = resolveConsolePage(hash);
      if (hashPage) return hashPage;
      if (sectionByPage[window.PlaytrixCurrentPage || '']) return window.PlaytrixCurrentPage;
      return host.dataset.shellPage || 'overview';
    }
    return host.dataset.shellPage || '';
  }

  function buildGroupHtml(hostId, group, currentPage, currentSection) {
    const isActiveSection = group.key === currentSection;
    const menuId = hostId + '-' + group.key;
    const links = group.items.map((item) => {
      const isCurrent = item.currentFor === currentPage;
      return [
        '<a class="shell-menu-link' + (isCurrent ? ' is-current' : '') + '"',
        ' href="' + item.href + '"',
        item.routeKey ? ' data-route-key="' + item.routeKey + '"' : '',
        item.pageTarget ? ' data-shell-page-target="' + item.pageTarget + '"' : '',
        item.targetId ? ' data-shell-target-id="' + item.targetId + '"' : '',
        '>',
        item.title,
        '</a>'
      ].join('');
    }).join('');

    return [
      '<div class="shell-nav-group' + (isActiveSection ? ' is-active' : '') + '" data-shell-group="' + group.key + '">',
      '  <button class="shell-nav-trigger" type="button" aria-expanded="false" aria-controls="' + menuId + '">',
      '    <span>' + group.title + '</span>',
      '  </button>',
      '  <div class="shell-nav-menu" id="' + menuId + '" role="group" aria-label="' + group.title + '">',
      links,
      '  </div>',
      '</div>'
    ].join('');
  }

  function closeMenus(host, exceptGroup) {
    host.querySelectorAll('.shell-nav-group').forEach((group) => {
      const shouldStayOpen = exceptGroup && group === exceptGroup;
      group.classList.toggle('is-open', Boolean(shouldStayOpen));
      const trigger = group.querySelector('.shell-nav-trigger');
      if (trigger) {
        trigger.setAttribute('aria-expanded', shouldStayOpen ? 'true' : 'false');
      }
    });
  }

  function bindHost(host) {
    if (host.dataset.shellBound === 'true') return;

    host.addEventListener('click', (event) => {
      const trigger = event.target.closest('.shell-nav-trigger');
      if (trigger && host.contains(trigger)) {
        const group = trigger.closest('.shell-nav-group');
        const shouldOpen = !group.classList.contains('is-open');
        closeMenus(host, shouldOpen ? group : null);
        return;
      }

      const link = event.target.closest('.shell-menu-link');
      if (link && host.contains(link)) {
        const pageTarget = link.dataset.shellPageTarget || '';
        const targetId = link.dataset.shellTargetId || '';
        let countedRoute = false;
        if (pageTarget && targetId) {
          bumpRoute(link.dataset.routeKey || '');
          countedRoute = true;
          setPendingTarget(pageTarget, targetId);
          if (isConsoleRoute() && link.getAttribute('href').toLowerCase().indexOf('playtrix-console.html') === 0) {
            event.preventDefault();
            closeMenus(host, null);
            if ((window.location.hash || '#overview').replace('#', '') !== pageTarget) {
              window.location.hash = pageTarget;
            } else {
              window.dispatchEvent(new CustomEvent('playtrix:page-change', { detail: { page: pageTarget } }));
            }
            window.setTimeout(tryScrollPendingTarget, 80);
            return;
          }
        }
        if (!countedRoute) {
          bumpRoute(link.dataset.routeKey || '');
        }
        closeMenus(host, null);
      }
    });

    host.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenus(host, null);
      }
    });

    document.addEventListener('click', (event) => {
      if (!host.contains(event.target)) {
        closeMenus(host, null);
      }
    });

    host.dataset.shellBound = 'true';
  }

  function renderHost(host) {
    const currentPage = resolvePage(host);
    const currentSection = sectionByPage[currentPage] || host.dataset.shellSection || '';
    const hostId = host.dataset.shellId || ('shell-' + Math.random().toString(36).slice(2, 10));
    host.dataset.shellId = hostId;
    host.classList.add('shell-master-nav');
    host.innerHTML = groups.map((group) => buildGroupHtml(hostId, group, currentPage, currentSection)).join('');
    bindHost(host);
  }

  function tryScrollPendingTarget() {
    const pending = getPendingTarget();
    if (!pending) return;
    const currentHash = (window.location.hash || '#overview').replace('#', '');
    const currentPage = sectionByPage[currentHash] ? currentHash : (window.PlaytrixCurrentPage || '');
    if (pending.page && currentPage && pending.page !== currentPage) return;
    const target = document.getElementById(pending.targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    clearPendingTarget();
  }

  function syncAll() {
    document.querySelectorAll('[data-shell-nav]').forEach(renderHost);
  }

  document.addEventListener('DOMContentLoaded', syncAll);
  window.addEventListener('hashchange', syncAll);
  document.addEventListener('DOMContentLoaded', tryScrollPendingTarget);
  window.addEventListener('hashchange', function () {
    window.setTimeout(tryScrollPendingTarget, 80);
  });
  window.addEventListener('playtrix:page-change', function () {
    syncAll();
    window.setTimeout(tryScrollPendingTarget, 80);
  });
  window.PlaytrixShell = { sync: syncAll };
})();
