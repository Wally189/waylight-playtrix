(function () {
  const ns = 'playtrix.organiser.';
  const Storage = window.PlaytrixStorage;
  const Common = window.PlaytrixCommon || null;

  function read(key, fallback) {
    if (Storage) return Storage.readJson(ns + key, fallback);
    try {
      const raw = localStorage.getItem(ns + key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    if (Storage) {
      Storage.writeJson(ns + key, value);
      return;
    }
    localStorage.setItem(ns + key, JSON.stringify(value));
  }

  function seed(key, value) {
    if (Storage) {
      Storage.seedJson(ns + key, value);
      return;
    }
    if (localStorage.getItem(ns + key) === null) {
      write(key, value);
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'org-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatMinutes(totalMinutes) {
    const rounded = Math.max(0, Math.round(Number(totalMinutes) || 0));
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;
    if (!hours) return minutes + 'm';
    if (!minutes) return hours + 'h';
    return hours + 'h ' + minutes + 'm';
  }

  const currencyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function parseMoney(value) {
    if (value === null || value === undefined || value === '') return 0;
    const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function formatCurrency(value) {
    return currencyFormatter.format(parseMoney(value));
  }

  function parseDateValue(value) {
    if (!value) return null;
    const text = String(value).trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(text + 'T00:00:00') : new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isSameMonth(date, referenceDate) {
    if (!date || !referenceDate) return false;
    return date.getFullYear() === referenceDate.getFullYear() && date.getMonth() === referenceDate.getMonth();
  }

  function isWithinDays(date, referenceDate, days) {
    if (!date || !referenceDate) return false;
    const start = startOfDay(referenceDate).getTime();
    const target = startOfDay(date).getTime();
    const diffDays = Math.round((target - start) / 86400000);
    return diffDays >= 0 && diffDays <= days;
  }

  function normaliseValue(value) {
    return String(value || '').trim().toLowerCase();
  }

  function slugify(value) {
    return String(value || 'export')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'export';
  }

  function normaliseLinkHref(value) {
    if (Common && typeof Common.normaliseActionLink === 'function') {
      return Common.normaliseActionLink(value);
    }
    return String(value || '').trim();
  }

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 0);
  }

  function exportCellValue(row, column) {
    if (!row || !column) return '';
    if (column.name === 'links') {
      return [row.demoUrl || '', row.currentUrl || ''].filter(Boolean).join(' | ');
    }
    if (typeof column.compute === 'function') {
      return column.compute(row) || '';
    }
    return row[column.name] || '';
  }

  function csvValue(value) {
    const text = String(value || '');
    if (/["\r\n,]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function rowsToCsv(columns, rows) {
    const lines = [];
    lines.push(columns.map(function (column) { return csvValue(column.label); }).join(','));
    rows.forEach(function (row) {
      lines.push(columns.map(function (column) {
        return csvValue(exportCellValue(row, column));
      }).join(','));
    });
    return lines.join('\r\n');
  }

  function registerScrollCap(container, itemSelector, options) {
    if (!container || !itemSelector) return;
    const settings = options || {};
    container.dataset.scrollCap = String(settings.maxItems || 4);
    container.dataset.scrollCapItems = itemSelector;
    if (settings.headerSelector) {
      container.dataset.scrollCapHeader = settings.headerSelector;
    } else {
      delete container.dataset.scrollCapHeader;
    }
    if (settings.extraOffset) {
      container.dataset.scrollCapOffset = String(settings.extraOffset);
    } else {
      delete container.dataset.scrollCapOffset;
    }
    applyScrollCap(container);
  }

  function applyScrollCap(container) {
    if (!container || !container.dataset.scrollCapItems) return;
    if (!container.getClientRects().length) return;

    const maxItems = Math.max(1, Number(container.dataset.scrollCap || 4));
    const itemSelector = container.dataset.scrollCapItems;
    const headerSelector = container.dataset.scrollCapHeader || '';
    const extraOffset = Number(container.dataset.scrollCapOffset || 0);
    const items = Array.from(container.querySelectorAll(itemSelector));

    container.style.overflowX = 'auto';
    container.style.overflowY = items.length > maxItems ? 'auto' : 'visible';
    container.style.paddingRight = items.length > maxItems ? '0.25rem' : '';

    if (items.length <= maxItems) {
      container.style.removeProperty('max-height');
      return;
    }

    const header = headerSelector ? container.querySelector(headerSelector) : null;
    const computed = window.getComputedStyle(container);
    const gap = Number.parseFloat(computed.rowGap || computed.gap || '0') || 0;
    let maxHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;

    items.slice(0, maxItems).forEach(function (item, index) {
      maxHeight += Math.ceil(item.getBoundingClientRect().height);
      if (index < maxItems - 1) {
        maxHeight += gap;
      }
    });

    container.style.maxHeight = Math.ceil(maxHeight + extraOffset) + 'px';
  }

  function applyRegisteredScrollCaps(root) {
    (root || document).querySelectorAll('[data-scroll-cap]').forEach(applyScrollCap);
  }

  function startOfDay(date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  function startOfWeek(date) {
    const next = startOfDay(date);
    const offset = (next.getDay() + 6) % 7;
    next.setDate(next.getDate() - offset);
    return next;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function overlapMinutes(sessionStartMs, sessionEndMs, rangeStartMs, rangeEndMs) {
    const start = Math.max(sessionStartMs, rangeStartMs);
    const end = Math.min(sessionEndMs, rangeEndMs);
    if (end <= start) return 0;
    return Math.round((end - start) / 60000);
  }

  function getWorkClockState() {
    const state = read('time-clock', { active: null, sessions: [] }) || { active: null, sessions: [] };
    return {
      active: state.active && state.active.startedAt ? state.active : null,
      sessions: Array.isArray(state.sessions) ? state.sessions : []
    };
  }

  function setWorkClockState(state) {
    write('time-clock', state);
  }

  function startWorkSession(referenceDate) {
    const state = getWorkClockState();
    if (state.active) return state;
    state.active = {
      id: makeId(),
      startedAt: (referenceDate || new Date()).toISOString()
    };
    setWorkClockState(state);
    return state;
  }

  function stopWorkSession(referenceDate) {
    const state = getWorkClockState();
    if (!state.active || !state.active.startedAt) return state;
    const endedAt = (referenceDate || new Date()).toISOString();
    const startDate = new Date(state.active.startedAt);
    const endDate = new Date(endedAt);
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate > startDate) {
      state.sessions.unshift({
        id: state.active.id || makeId(),
        startedAt: state.active.startedAt,
        endedAt: endedAt
      });
    }
    state.active = null;
    setWorkClockState(state);
    return state;
  }

  function addManualWorkSession(dateValue, durationHours, noteValue) {
    const sessionDate = String(dateValue || '').trim();
    const hours = Number(durationHours);
    const minutes = Math.round(hours * 60);
    if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || !Number.isFinite(hours) || minutes <= 0) return false;

    const state = getWorkClockState();
    state.sessions.unshift({
      id: makeId(),
      manualDate: sessionDate,
      manualMinutes: minutes,
      note: String(noteValue || '').trim()
    });
    setWorkClockState(state);
    return true;
  }

  function getWorkClockModel(referenceDate) {
    const now = referenceDate || new Date();
    const state = getWorkClockState();
    const allSessions = [];

    state.sessions.forEach(function (session) {
      if (session.manualDate && session.manualMinutes) {
        const start = parseDateValue(session.manualDate);
        if (!start) return;
        const end = new Date(start.getTime() + Math.max(0, Number(session.manualMinutes) || 0) * 60000);
        allSessions.push({
          id: session.id || makeId(),
          startedAt: start.toISOString(),
          endedAt: end.toISOString(),
          startMs: start.getTime(),
          endMs: end.getTime(),
          active: false,
          minutes: Math.max(0, Number(session.manualMinutes) || 0),
          manual: true,
          manualDate: session.manualDate,
          note: session.note || ''
        });
        return;
      }
      const start = new Date(session.startedAt);
      const end = new Date(session.endedAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return;
      allSessions.push({
        id: session.id || makeId(),
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        startMs: start.getTime(),
        endMs: end.getTime(),
        active: false,
        minutes: Math.round((end.getTime() - start.getTime()) / 60000),
        manual: false,
        note: session.note || ''
      });
    });

    let activeSession = null;
    if (state.active && state.active.startedAt) {
      const start = new Date(state.active.startedAt);
      if (!Number.isNaN(start.getTime()) && now > start) {
        activeSession = {
          id: state.active.id || makeId(),
          startedAt: state.active.startedAt,
          endedAt: now.toISOString(),
          startMs: start.getTime(),
          endMs: now.getTime(),
          active: true,
          minutes: Math.round((now.getTime() - start.getTime()) / 60000)
        };
        allSessions.push(activeSession);
      }
    }

    const dayStart = startOfDay(now);
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    const weekStart = startOfWeek(now);
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const monthStart = startOfMonth(now);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let totalMinutes = 0;

    allSessions.forEach(function (session) {
      totalMinutes += session.minutes;
      todayMinutes += overlapMinutes(session.startMs, session.endMs, dayStart.getTime(), nextDay.getTime());
      weekMinutes += overlapMinutes(session.startMs, session.endMs, weekStart.getTime(), nextWeek.getTime());
      monthMinutes += overlapMinutes(session.startMs, session.endMs, monthStart.getTime(), nextMonth.getTime());
    });

    const recentSessions = state.sessions
      .map(function (session) {
        if (session.manualDate && session.manualMinutes) {
          const start = parseDateValue(session.manualDate);
          if (!start) return null;
          const end = new Date(start.getTime() + Math.max(0, Number(session.manualMinutes) || 0) * 60000);
          return {
            id: session.id || makeId(),
            startedAt: start.toISOString(),
            endedAt: end.toISOString(),
            minutes: Math.max(0, Number(session.manualMinutes) || 0),
            manual: true,
            manualDate: session.manualDate,
            note: session.note || ''
          };
        }
        const start = new Date(session.startedAt);
        const end = new Date(session.endedAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
        return {
          id: session.id || makeId(),
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          minutes: Math.round((end.getTime() - start.getTime()) / 60000),
          manual: false,
          note: session.note || ''
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return String(b.endedAt).localeCompare(String(a.endedAt));
      })
      .slice(0, 8);

    return {
      active: activeSession,
      activeMinutes: activeSession ? activeSession.minutes : 0,
      todayMinutes: todayMinutes,
      weekMinutes: weekMinutes,
      monthMinutes: monthMinutes,
      totalMinutes: totalMinutes,
      sessionCount: state.sessions.length,
      recentSessions: recentSessions
    };
  }

  function readRawKanban() {
    if (Storage) return Storage.readJson('playtrix.kanban.board', { cards: [] });
    try {
      return JSON.parse(localStorage.getItem('playtrix.kanban.board')) || { cards: [] };
    } catch {
      return { cards: [] };
    }
  }

  function getKanbanCards() {
    const board = readRawKanban();
    return Array.isArray(board.cards) ? board.cards : [];
  }

  function getKanbanCounts() {
    const cards = getKanbanCards();
    const counts = { inbox: 0, today: 0, 'this-week': 0, 'this-month': 0, pending: 0, done: 0 };
    cards.forEach(function (card) {
      if (card.column === 'waiting') card.column = 'pending';
      if (counts[card.column] !== undefined) counts[card.column] += 1;
    });
    return counts;
  }

  function readContacts() {
    if (Storage) return Storage.readJson('playtrix.contacts.records', []);
    try {
      return JSON.parse(localStorage.getItem('playtrix.contacts.records')) || [];
    } catch {
      return [];
    }
  }

  function trackRoute(link, routeKey) {
    if (!link || !routeKey) return;
    link.addEventListener('click', function () {
      if (Storage) {
        Storage.bumpCounterMap('playtrix.routeUsage', routeKey);
      }
    });
  }

  function buildFinanceConsoleModel(referenceDate) {
    const now = referenceDate || new Date();
    const ledger = read('finance-ledger', []).map(function (row) {
      return Object.assign({}, row, {
        incomeValue: parseMoney(row.income),
        expenseValue: parseMoney(row.expense),
        dateObj: parseDateValue(row.date),
        sourceTypeKey: normaliseValue(row.sourceType),
        categoryKey: normaliseValue(row.category)
      });
    });
    const invoices = read('finance-invoices', []).map(function (row) {
      return Object.assign({}, row, {
        amountValue: parseMoney(row.amount),
        issuedDateObj: parseDateValue(row.issuedDate),
        dueDateObj: parseDateValue(row.dueDate),
        paidDateObj: parseDateValue(row.paidDate),
        statusKey: normaliseValue(row.status)
      });
    });
    const recurring = read('finance-recurring', []).map(function (row) {
      return Object.assign({}, row, {
        costValue: parseMoney(row.cost),
        renewalDateObj: parseDateValue(row.renewalDate)
      });
    });
    const reserves = read('finance-reserves', []).map(function (row) {
      const targetValue = parseMoney(row.target);
      const currentValue = parseMoney(row.currentAmount);
      return Object.assign({}, row, {
        targetValue: targetValue,
        currentValue: currentValue,
        gapValue: Math.max(0, targetValue - currentValue),
        categoryKey: normaliseValue(row.category)
      });
    });
    const forecasts = read('finance-forecasts', []).map(function (row) {
      return Object.assign({}, row, {
        valueAmount: parseMoney(row.value),
        monthObj: parseDateValue(row.month),
        itemKey: normaliseValue(row.forecastItem)
      });
    });
    const reporting = read('finance-reporting', []).map(function (row) {
      return Object.assign({}, row, {
        nextDateObj: parseDateValue(row.nextDate),
        statusKey: normaliseValue(row.status)
      });
    });

    const currentMonthLedger = ledger.filter(function (row) {
      return row.dateObj && isSameMonth(row.dateObj, now);
    });

    function sumField(rows, field) {
      return rows.reduce(function (total, row) {
        return total + (Number(row[field]) || 0);
      }, 0);
    }

    const clientRevenueThisMonth = sumField(currentMonthLedger.filter(function (row) {
      return row.incomeValue > 0 && row.sourceTypeKey === 'client';
    }), 'incomeValue');
    const ownerContributionThisMonth = sumField(currentMonthLedger.filter(function (row) {
      return row.incomeValue > 0 && row.sourceTypeKey === 'owner contribution';
    }), 'incomeValue');
    const monthlyIncome = sumField(currentMonthLedger, 'incomeValue');
    const monthlyCosts = sumField(currentMonthLedger, 'expenseValue');
    const cashBalance = sumField(ledger, 'incomeValue') - sumField(ledger, 'expenseValue');

    const outstandingInvoices = invoices.filter(function (row) {
      return ['sent', 'due', 'overdue'].indexOf(row.statusKey) >= 0;
    });
    const overdueInvoices = invoices.filter(function (row) {
      return row.statusKey === 'overdue';
    });
    const paidThisMonth = invoices.filter(function (row) {
      return row.statusKey === 'paid' && row.paidDateObj && isSameMonth(row.paidDateObj, now);
    });
    const billsDueSoon = recurring.filter(function (row) {
      return row.renewalDateObj && isWithinDays(row.renewalDateObj, now, 30);
    });

    function reserveByName(label) {
      return reserves.find(function (row) {
        return row.categoryKey === normaliseValue(label);
      }) || { category: label, targetValue: 0, currentValue: 0, gapValue: 0, notes: '' };
    }

    const taxReserve = reserveByName('Tax reserve');
    const emergencyReserve = reserveByName('Emergency reserve');
    const operatingReserve = reserveByName('Operating reserve');
    const equipmentReserve = reserveByName('Equipment replacement reserve');

    const expectedOwnerContribution = forecasts.filter(function (row) {
      return row.monthObj && isSameMonth(row.monthObj, now) && row.itemKey === 'owner contribution expected this month';
    }).reduce(function (total, row) {
      return total + row.valueAmount;
    }, 0);

    const financeOpenItems = [];

    outstandingInvoices.forEach(function (row) {
      financeOpenItems.push({
        source: 'Invoice',
        title: (row.invoiceNumber || 'Invoice') + ' - ' + (row.client || 'Client'),
        dueDate: row.dueDate || '',
        status: row.status || 'Open',
        href: 'playtrix-focus.html?topic=invoice-tracker',
        routeKey: 'invoice-tracker'
      });
    });

    billsDueSoon.forEach(function (row) {
      financeOpenItems.push({
        source: 'Recurring cost',
        title: row.service || 'Recurring cost',
        dueDate: row.renewalDate || '',
        status: 'Due soon',
        href: 'playtrix-focus.html?topic=recurring-costs',
        routeKey: 'recurring-costs'
      });
    });

    reporting.filter(function (row) {
      return row.statusKey !== 'done';
    }).forEach(function (row) {
      financeOpenItems.push({
        source: 'Tax & reporting',
        title: row.area || 'Reporting item',
        dueDate: row.nextDate || '',
        status: row.status || 'Open',
        href: 'playtrix-focus.html?topic=tax-reporting',
        routeKey: 'tax-reporting'
      });
    });

    return {
      ledger: ledger,
      invoices: invoices,
      recurring: recurring,
      reserves: reserves,
      forecasts: forecasts,
      reporting: reporting,
      monthlyIncome: monthlyIncome,
      monthlyCosts: monthlyCosts,
      clientRevenueThisMonth: clientRevenueThisMonth,
      ownerContributionThisMonth: ownerContributionThisMonth,
      netOperatingPosition: clientRevenueThisMonth - monthlyCosts,
      cashBalance: cashBalance,
      outstandingInvoicesTotal: sumField(outstandingInvoices, 'amountValue'),
      overdueInvoicesTotal: sumField(overdueInvoices, 'amountValue'),
      paidThisMonthTotal: sumField(paidThisMonth, 'amountValue'),
      billsDueSoonTotal: sumField(billsDueSoon, 'costValue'),
      billsDueSoonCount: billsDueSoon.length,
      expectedReceipts: sumField(outstandingInvoices, 'amountValue'),
      expectedOwnerContribution: expectedOwnerContribution,
      availableOperatingCash: cashBalance - taxReserve.gapValue,
      taxReserve: taxReserve,
      emergencyReserve: emergencyReserve,
      operatingReserve: operatingReserve,
      equipmentReserve: equipmentReserve,
      financeOpenItems: financeOpenItems,
      financeWaitingItems: financeOpenItems.filter(function (item) {
        return normaliseValue(item.status) === 'waiting';
      })
    };
  }

  function getAnalyticsModel() {
    const counts = getKanbanCounts();
    const cards = getKanbanCards();
    const projects = read('projects', []);
    const leads = read('leads', []);
    const financeConsole = buildFinanceConsoleModel(new Date());
    const diary = read('diary', []);
    const clients = read('clients', []);
    const properties = read('asset-websites', []);
    const documents = read('documents', []);
    const contacts = readContacts();
    const clock = getWorkClockModel(new Date());

    return {
      counts: counts,
      cards: cards,
      projects: projects,
      leads: leads,
      finance: financeConsole.ledger,
      financeConsole: financeConsole,
      diary: diary,
      clients: clients,
      properties: properties,
      documents: documents,
      contacts: contacts,
      clock: clock,
      activeProjects: projects.filter(function (item) { return item.status === 'Active'; }),
      waitingProjects: projects.filter(function (item) { return item.status === 'Waiting' || item.status === 'On hold'; }),
      maintenanceProjects: projects.filter(function (item) { return item.maintenanceStatus === 'Active'; }),
      liveLeads: leads.filter(function (item) { return ['Warm', 'Qualified', 'Proposal'].includes(item.stage); }),
      wonLeads: leads.filter(function (item) { return item.stage === 'Won'; }),
      financeOpen: financeConsole.financeOpenItems,
      financeWaiting: financeConsole.financeWaitingItems,
      diaryDue: diary.filter(function (item) { return !!item.date; }).slice().sort(function (a, b) {
        return String(a.date || '').localeCompare(String(b.date || ''));
      }),
      activeClients: clients.filter(function (item) { return ['Active', 'Maintenance', 'Waiting'].includes(item.status); }),
      contactClients: contacts.filter(function (item) { return (item.type || '').toLowerCase() === 'client'; })
    };
  }

  function renderSalesPipelineBoard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const leads = read('leads', []).filter(function (row) {
      return String(row.stage || '') !== 'Lost';
    });
    const columns = [
      { key: 'Prospecting', title: 'Prospecting', empty: 'No prospecting leads recorded.' },
      { key: 'Warm', title: 'Warm', empty: 'No warm leads recorded.' },
      { key: 'Qualified', title: 'Qualified', empty: 'No qualified leads recorded.' },
      { key: 'Proposal', title: 'Proposal', empty: 'No proposal-stage leads recorded.' },
      { key: 'Won', title: 'Won', empty: 'No approved leads waiting to move into projects.' }
    ];

    container.innerHTML = [
      '<article class="planner-sheet">',
      '  <p class="eyebrow">Pipeline</p>',
      '  <h3>Live pipeline board</h3>',
      '  <p>This board reads the live lead pipeline register below. If the register changes, the board changes with it. Approved work should then move into Projects and Client relationships.</p>',
      '  <div class="funnel pipeline-board">',
           columns.map(function (column) {
             const rows = leads.filter(function (row) {
               return String(row.stage || '') === column.key;
             });
             return [
               '<div class="col">',
               '  <h4>' + escapeHtml(column.title) + '</h4>',
                    rows.length ? rows.map(function (row) {
                      const detail = row.nextAction || row.source || 'No next action recorded.';
                      return [
                        '<div class="deal">',
                        '  <strong>' + escapeHtml(row.lead || 'Unnamed lead') + '</strong>',
                        '  <span>' + escapeHtml(detail) + '</span>',
                        '</div>'
                      ].join('');
                    }).join('') : '<div class="deal pipeline-empty"><span>' + escapeHtml(column.empty) + '</span></div>',
               '</div>'
             ].join('');
           }).join(''),
      '  </div>',
      '</article>'
    ].join('');
  }

  function renderMarketingCalendar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const quarters = [
      {
        quarter: 'Q1',
        theme: 'Foundation and clarity',
        note: 'Start the year by tightening services, pricing clarity, and the proof gaps on the public site.',
        months: [
          'January: refresh pricing, services, and contact routes.',
          'February: capture case-study material and article ideas.',
          'March: prepare spring outreach and parish-facing examples.'
        ]
      },
      {
        quarter: 'Q2',
        theme: 'Proof and outreach',
        note: 'Turn working knowledge into visible proof and give campaigns a practical reason to exist.',
        months: [
          'April: publish one article or proof-led explanation.',
          'May: run a small referral or local outreach push.',
          'June: review which messages produced replies or useful conversations.'
        ]
      },
      {
        quarter: 'Q3',
        theme: 'Visibility and maintenance',
        note: 'Use the quieter periods to keep proof current, improve findability, and prepare autumn work.',
        months: [
          'July: tidy older articles, links, and portfolio pages.',
          'August: recertify proof assets and refresh evergreen articles.',
          'September: prepare autumn campaigns and maintenance offers.'
        ]
      },
      {
        quarter: 'Q4',
        theme: 'Renewal and planning',
        note: 'Use year-end activity for maintenance renewals, reviews, and next-year campaign planning.',
        months: [
          'October: push maintenance, governance, and steady-service offers.',
          'November: gather testimonials, outcomes, and article updates.',
          'December: review the year and set next quarter themes.'
        ]
      }
    ];

    container.innerHTML = [
      '<article class="planner-sheet">',
      '  <p class="eyebrow">Campaign Governance</p>',
      '  <h3>Campaign governance calendar</h3>',
      '  <p>Use the quarter and month themes to stay ahead of busy and quiet periods. Put date-specific actions in the <a href="governance-calendar.html">governance calendar</a> once they become real commitments.</p>',
      '  <div class="marketing-calendar-grid">',
           quarters.map(function (quarter) {
             return [
               '<div class="marketing-calendar-card">',
               '  <h4>' + escapeHtml(quarter.quarter + ' - ' + quarter.theme) + '</h4>',
               '  <p>' + escapeHtml(quarter.note) + '</p>',
               '  <div class="marketing-theme-list">',
                    quarter.months.map(function (item) {
                      return '<span>' + escapeHtml(item) + '</span>';
                    }).join(''),
               '  </div>',
               '</div>'
             ].join('');
           }).join(''),
      '  </div>',
      '</article>'
    ].join('');
  }

  function renderTableSheet(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) return;

    seed(config.key, config.seed || []);
    const collapsible = config.collapsibleForm !== false;
    let editorOpen = collapsible ? !!config.startEditorOpen : true;

    function getRows() {
      return read(config.key, config.seed || []);
    }

    function setRows(rows) {
      write(config.key, rows);
    }

    function formFields() {
      return config.fields.map(function (field) {
        if (field.type === 'select') {
          return [
            '<div>',
            '  <label>' + escapeHtml(field.label) + '</label>',
            '  <select name="' + escapeHtml(field.name) + '">',
                 field.options.map(function (option) {
                   return '<option value="' + escapeHtml(option) + '">' + escapeHtml(option) + '</option>';
                 }).join(''),
            '  </select>',
            '</div>'
          ].join('');
        }
        if (field.type === 'textarea') {
          return [
            '<div class="' + escapeHtml(field.className || '') + '">',
            '  <label>' + escapeHtml(field.label) + '</label>',
            '  <textarea name="' + escapeHtml(field.name) + '" rows="' + escapeHtml(field.rows || 4) + '" placeholder="' + escapeHtml(field.placeholder || '') + '"></textarea>',
            '</div>'
          ].join('');
        }
        return [
          '<div class="' + escapeHtml(field.className || '') + '">',
          '  <label>' + escapeHtml(field.label) + '</label>',
          '  <input name="' + escapeHtml(field.name) + '" type="' + escapeHtml(resolveInputType(field)) + '" placeholder="' + escapeHtml(field.placeholder || '') + '"' + resolveInputAttributes(field) + ' />',
          '</div>'
        ].join('');
      }).join('');
    }

    function resolveInputType(field) {
      if (field.type === 'currency') return 'number';
      const hint = ((field.label || '') + ' ' + (field.placeholder || '')).toLowerCase();
      if (field.type === 'url' && /path|folder|link/.test(hint)) {
        return 'text';
      }
      return field.type || 'text';
    }

    function resolveInputAttributes(field) {
      if (field.type === 'currency') {
        return ' step="0.01" min="0" inputmode="decimal"';
      }
      return '';
    }

    function draw() {
      const rows = getRows();
      const rowActions = config.rowActions || [];
      const exportName = slugify(config.exportName || config.title || config.key);
      container.innerHTML = [
        '<article class="planner-sheet">',
        '  <p class="eyebrow">' + escapeHtml(config.eyebrow || 'Register') + '</p>',
        '  <h3>' + escapeHtml(config.title) + '</h3>',
        '  <p>' + escapeHtml(config.description || '') + '</p>',
        '  <div class="register-toolbar">',
        '    <div class="register-toolbar-copy">' + escapeHtml(config.toolbarText || 'Keep the working record readable and export it when needed.') + '</div>',
        '    <div class="register-toolbar-actions">',
        collapsible ? '      <button type="button" class="planner-btn primary" data-toggle-form>' + (editorOpen ? 'Hide entry card' : 'Open entry card') + '</button>' : '',
        '      <button type="button" class="planner-btn" data-export-csv>Export CSV</button>',
        '    </div>',
        '  </div>',
        editorOpen ? [
          '  <div class="register-editor-card">',
          '    <form class="planner-form" data-form="' + escapeHtml(config.key) + '">',
          '      <input type="hidden" name="rowId" />',
          '      <div class="planner-row-grid">',
                 formFields(),
          '      </div>',
          '      <div class="planner-actions">',
          '        <button type="submit" class="planner-btn primary">Save</button>',
          '        <button type="button" class="planner-btn" data-reset-form>Clear</button>',
          '      </div>',
          '    </form>',
          '  </div>'
        ].join('') : '',
        '  <div class="planner-table-wrap register-table-wrap" data-scroll-cap="4">',
        '    <table class="planner-table">',
        '      <thead><tr>' + config.columns.map(function (column) { return '<th>' + escapeHtml(column.label) + '</th>'; }).join('') + '<th>Actions</th></tr></thead>',
        '      <tbody>',
               rows.length ? rows.map(function (row, index) {
                 const extraActions = rowActions.filter(function (action) {
                   return !action.when || action.when(row, index, rows);
                 }).map(function (action) {
                   const label = typeof action.label === 'function' ? action.label(row, index, rows) : action.label;
                   return '<button type="button" class="planner-edit" data-row-action="' + escapeHtml(action.key) + '" data-row-index="' + index + '">' + escapeHtml(label) + '</button>';
                 }).join(' ');
                 return '<tr>' + config.columns.map(function (column) {
                   let value = typeof column.compute === 'function' ? column.compute(row, index, rows) : (row[column.name] || '');
                   if (column.type === 'date') {
                     value = formatDate(value);
                   } else if (column.type === 'currency') {
                     value = value ? formatCurrency(value) : '';
                   }
                   if (column.type === 'link' && row[column.name]) {
                     value = '<a class="planner-open" href="' + escapeHtml(row[column.name]) + '" target="_blank" rel="noopener">Open</a>';
                   } else {
                     value = escapeHtml(value);
                   }
                   return '<td>' + value + '</td>';
                 }).join('') + '<td>' + (extraActions ? extraActions + ' ' : '') + '<button type="button" class="planner-edit" data-edit="' + index + '">Edit</button> <button type="button" class="planner-delete" data-delete="' + index + '">Delete</button></td></tr>';
               }).join('') : '<tr><td colspan="' + (config.columns.length + 1) + '">No entries yet.</td></tr>',
        '      </tbody>',
        '    </table>',
        '  </div>',
        '</article>'
      ].join('');

      registerScrollCap(container.querySelector('.register-table-wrap'), 'tbody tr', {
        maxItems: 4,
        headerSelector: 'thead',
        extraOffset: 4
      });

      const toggleButton = container.querySelector('[data-toggle-form]');
      if (toggleButton) {
        toggleButton.addEventListener('click', function () {
          editorOpen = !editorOpen;
          draw();
        });
      }

      const exportCsv = container.querySelector('[data-export-csv]');
      if (exportCsv) {
        exportCsv.addEventListener('click', function () {
          downloadText(exportName + '.csv', rowsToCsv(config.columns, rows), 'text/csv;charset=utf-8');
        });
      }

      const form = container.querySelector('form');
      if (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          const rows = getRows();
          const rowId = form.elements.rowId.value;
          const payload = { id: rowId || makeId() };
          config.fields.forEach(function (field) {
            payload[field.name] = form.elements[field.name].value.trim();
          });
          if (config.validate && !config.validate(payload)) return;
          const existingIndex = rows.findIndex(function (row) { return row.id === payload.id; });
          if (existingIndex >= 0) {
            rows[existingIndex] = payload;
          } else {
            rows.unshift(payload);
          }
          setRows(rows);
          if (collapsible) editorOpen = false;
          draw();
          renderDeskSignals();
        });

        container.querySelector('[data-reset-form]').addEventListener('click', function () {
          form.reset();
          form.elements.rowId.value = '';
        });
      }

      container.querySelectorAll('[data-edit]').forEach(function (button) {
        button.addEventListener('click', function () {
          const row = getRows()[Number(button.dataset.edit)];
          if (!row) return;
          if (collapsible) {
            editorOpen = true;
            draw();
          }
          const currentForm = container.querySelector('form');
          if (!currentForm) return;
          currentForm.elements.rowId.value = row.id;
          config.fields.forEach(function (field) {
            currentForm.elements[field.name].value = row[field.name] || '';
          });
          currentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      container.querySelectorAll('[data-delete]').forEach(function (button) {
        button.addEventListener('click', function () {
          const rows = getRows();
          rows.splice(Number(button.dataset.delete), 1);
          setRows(rows);
          draw();
          renderDeskSignals();
        });
      });

      container.querySelectorAll('[data-row-action]').forEach(function (button) {
        button.addEventListener('click', function () {
          const action = rowActions.find(function (item) {
            return item.key === button.dataset.rowAction;
          });
          if (!action || !action.handler) return;
          const rows = getRows();
          const index = Number(button.dataset.rowIndex);
          const row = rows[index];
          if (!row) return;
          action.handler({
            row: row,
            index: index,
            rows: rows,
            getRows: getRows,
            setRows: setRows,
            redraw: draw,
            form: container.querySelector('form'),
            container: container
          });
        });
      });

      if (typeof config.afterDraw === 'function') {
        config.afterDraw({
          rows: rows,
          container: container
        });
      }
    }

    draw();
  }

  function renderNoteSheet(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) return;
    seed(config.key, config.seed || { note: '' });
    const state = read(config.key, config.seed || { note: '' });
    container.innerHTML = [
      '<article class="planner-sheet">',
      '  <p class="eyebrow">' + escapeHtml(config.eyebrow || 'Notes') + '</p>',
      '  <h3>' + escapeHtml(config.title) + '</h3>',
      '  <p>' + escapeHtml(config.description || '') + '</p>',
      '  <textarea class="planner-note" rows="' + escapeHtml(config.rows || 16) + '" data-note-box>' + escapeHtml(state.note || '') + '</textarea>',
      config.prompts && config.prompts.length ? '  <div class="planner-list">' + config.prompts.map(function (prompt) {
        return '<div class="planner-item"><div class="planner-item-main"><strong>' + escapeHtml(prompt.title) + '</strong><span>' + escapeHtml(prompt.text) + '</span></div></div>';
      }).join('') + '</div>' : '',
      '</article>'
    ].join('');

    container.querySelector('[data-note-box]').addEventListener('input', function (event) {
      write(config.key, { note: event.target.value });
      renderDeskSignals();
    });
  }

  function renderBusinessDiaryLinks(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const key = 'business-diary-links';
    const defaults = {
      outlook: '',
      google: '',
      other: ''
    };
    seed(key, defaults);
    const state = Object.assign({}, defaults, read(key, defaults));
    const fields = [
      { id: 'outlook', title: 'Outlook business calendar', note: 'Add the Outlook calendar you use for business appointments and dated work.' },
      { id: 'google', title: 'Google business calendar', note: 'Add the Google calendar route if that is where the business diary is actually kept.' },
      { id: 'other', title: 'Other diary or support link', note: 'Use this for another calendar, booking view, or a supporting diary folder.' }
    ];

    container.innerHTML = [
      '<article class="planner-sheet">',
      '  <p class="eyebrow">Business Diary Links</p>',
      '  <h3>Calendar links and supporting routes</h3>',
      '  <p>Keep the main business-calendar routes here so Outlook or Google diaries can be opened from the same page as the register.</p>',
      '  <div class="diary-link-grid">',
           fields.map(function (field) {
             const value = state[field.id] || '';
             const href = normaliseLink(value);
             return [
               '<div class="diary-link-card">',
               '  <strong>' + escapeHtml(field.title) + '</strong>',
               '  <span>' + escapeHtml(field.note) + '</span>',
               '  <label>' + escapeHtml(field.title) + '</label>',
               '  <input type="text" data-diary-link="' + escapeHtml(field.id) + '" value="' + escapeHtml(value) + '" placeholder="Paste a URL or local path" />',
                    href ? '  <a href="' + escapeHtml(href) + '" target="_blank" rel="noopener">Open link</a>' : '  <span class="muted">Add a link when ready.</span>',
               '</div>'
             ].join('');
           }).join(''),
      '  </div>',
      '</article>'
    ].join('');

    container.querySelectorAll('[data-diary-link]').forEach(function (input) {
      input.addEventListener('change', function () {
        const next = Object.assign({}, defaults, read(key, defaults));
        next[input.dataset.diaryLink] = input.value.trim();
        write(key, next);
        renderBusinessDiaryLinks(containerId);
      });
    });
  }

  const supportLinks = [
    { title: 'Set up as a sole trader', note: 'GOV.UK step-by-step for starting as self-employed.', url: 'https://www.gov.uk/set-up-sole-trader' },
    { title: 'Register for Self Assessment', note: 'HMRC route to get registered and file properly.', url: 'https://www.gov.uk/register-for-self-assessment' },
    { title: 'Self-employed records', note: 'What records to keep and how long to keep them.', url: 'https://www.gov.uk/self-employed-records' },
    { title: 'Allowable expenses', note: 'Official HMRC guidance on self-employed expenses.', url: 'https://www.gov.uk/expenses-if-youre-self-employed' },
    { title: 'Universal Credit and self-employment', note: 'If relevant, official guidance on reporting and gainful self-employment.', url: 'https://www.gov.uk/self-employment-and-universal-credit' },
    { title: 'ICO data protection fee', note: 'Check whether you need to pay the fee and register.', url: 'https://ico.org.uk/for-organisations/data-protection-fee/' },
    { title: 'ICO small business checklist', note: 'Practical data-protection check for sole traders and small businesses.', url: 'https://ico.org.uk/for-organisations/advice-for-small-organisations/checklists/assessment-for-small-business-owners-and-sole-traders/' },
    { title: 'Employing staff for the first time', note: 'GOV.UK starting point if you later take on employees.', url: 'https://www.gov.uk/employing-staff' },
    { title: 'What must be in an employment contract', note: 'ACAS guidance for the future if staff are taken on.', url: 'https://www.acas.org.uk/what-must-be-written-in-an-employment-contract' },
    { title: 'Set up a limited company', note: 'Future route if you later move beyond sole trader structure.', url: 'https://www.gov.uk/set-up-limited-company' }
  ];

  const marketingSupportLinks = [
    { title: 'Google Search Console help', note: 'Official Google help for seeing how your public site performs in search.', url: 'https://support.google.com/webmasters/' },
    { title: 'Google Business Profile help', note: 'Official route for managing local presence and reviews.', url: 'https://support.google.com/business/' },
    { title: 'CAP Code', note: 'UK advertising rules so marketing stays clear, fair, and compliant.', url: 'https://www.asa.org.uk/codes-and-rulings/advertising-codes.html' },
    { title: 'ICO direct marketing guidance', note: 'Use this if you later do email or direct marketing that touches privacy rules.', url: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/' }
  ];

  const financeSupportLinks = [
    { title: 'Register for Self Assessment', note: 'HMRC route for getting registered and filing properly.', url: 'https://www.gov.uk/register-for-self-assessment' },
    { title: 'Self-employed records', note: 'GOV.UK guide to the records a self-employed business should keep.', url: 'https://www.gov.uk/self-employed-records' },
    { title: 'Allowable expenses', note: 'HMRC guidance on claiming expenses for self-employed work.', url: 'https://www.gov.uk/expenses-if-youre-self-employed' },
    { title: 'Self Assessment deadlines', note: 'Key filing and payment deadlines for Self Assessment.', url: 'https://www.gov.uk/self-assessment-tax-returns/deadlines' },
    { title: 'VAT registration', note: 'Official guidance on when VAT registration may be needed.', url: 'https://www.gov.uk/vat-registration' },
    { title: 'Making Tax Digital for Income Tax', note: 'Official GOV.UK guidance on signing up and who needs to use it.', url: 'https://www.gov.uk/guidance/sign-up-your-business-for-making-tax-digital-for-income-tax' },
    { title: 'Universal Credit and self-employment', note: 'Use this if support reporting becomes relevant.', url: 'https://www.gov.uk/self-employment-and-universal-credit' }
  ];

  function renderSupportLinks(containerId, title, intro, links) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = [
      '<article class="planner-sheet">',
      '  <p class="eyebrow">Authority Links</p>',
      '  <h3>' + escapeHtml(title) + '</h3>',
      '  <p>' + escapeHtml(intro) + '</p>',
      '  <div class="support-list">',
           links.map(function (link) {
             return [
               '<div class="support-item">',
               '  <div class="support-item-main">',
               '    <strong>' + escapeHtml(link.title) + '</strong>',
               '    <span>' + escapeHtml(link.note) + '</span>',
               '    <a href="' + escapeHtml(link.url) + '" target="_blank" rel="noopener">Open source</a>',
               '  </div>',
               '</div>'
             ].join('');
           }).join(''),
      '  </div>',
      '</article>'
    ].join('');
  }

  function financeMetric(label, value, note) {
    return [
      '<div class="mini finance-summary-card">',
      '  <span class="eyebrow">' + escapeHtml(label) + '</span>',
      '  <strong>' + escapeHtml(value) + '</strong>',
      '  <p>' + escapeHtml(note) + '</p>',
      '</div>'
    ].join('');
  }

  function insertFinanceRegisterSummary(container, cards) {
    if (!container || !cards || !cards.length) return;
    const sheet = container.querySelector('.planner-sheet');
    const toolbar = container.querySelector('.register-toolbar');
    if (!sheet || !toolbar) return;

    const summary = document.createElement('div');
    summary.className = 'finance-summary-grid finance-register-summary';
    summary.innerHTML = cards.map(function (card) {
      return financeMetric(card.label, card.value, card.note);
    }).join('');
    sheet.insertBefore(summary, toolbar);
  }

  function renderFinanceOverview(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const model = buildFinanceConsoleModel(new Date());
    const actions = model.financeOpenItems.slice(0, 6);
    const summaryCards = [
      financeMetric('Monthly income', formatCurrency(model.monthlyIncome), 'All inflows recorded this month.'),
      financeMetric('Monthly costs', formatCurrency(model.monthlyCosts), 'Recorded operating costs this month.'),
      financeMetric('Cash balance', formatCurrency(model.cashBalance), 'Recorded inflows minus expenses to date.'),
      financeMetric('Outstanding invoices', formatCurrency(model.outstandingInvoicesTotal), 'Sent, due, or overdue invoices still unpaid.'),
      financeMetric('Tax reserve', formatCurrency(model.taxReserve.currentValue), 'Current amount set aside for tax.'),
      financeMetric('Emergency reserve', formatCurrency(model.emergencyReserve.currentValue), 'Current contingency buffer.'),
      financeMetric('Client revenue this month', formatCurrency(model.clientRevenueThisMonth), 'Earned from clients, not personal support.'),
      financeMetric('Owner Contribution', formatCurrency(model.ownerContributionThisMonth), 'Personal funding introduced this month.'),
      financeMetric('Net operating position', formatCurrency(model.netOperatingPosition), 'Client revenue minus monthly costs.'),
      financeMetric('Bills due soon', formatCurrency(model.billsDueSoonTotal), model.billsDueSoonCount + ' renewal(s) due in the next 30 days.')
    ].join('');

    container.innerHTML = [
      '<article class="planner-sheet finance-sheet">',
      '  <p class="eyebrow">Finance Overview</p>',
      '  <h3>Current money picture</h3>',
      '  <p>Use this as the at-a-glance control view. It keeps earned client revenue separate from Owner Contribution so the business picture stays honest.</p>',
      '  <div class="finance-summary-grid">' + summaryCards + '</div>',
      '  <div class="finance-callout">',
      '    <strong>How to read this month</strong>',
      '    <span>' + escapeHtml('Monthly income includes ' + formatCurrency(model.ownerContributionThisMonth) + ' of Owner Contribution. Client-generated revenue remains shown separately so early-stage support does not inflate earned performance.') + '</span>',
      '  </div>',
      actions.length ? [
        '  <div class="finance-inline-table-wrap">',
        '    <table class="planner-table finance-inline-table">',
        '      <thead><tr><th>Next item</th><th>Source</th><th>Due</th><th>Status</th><th>Where to act</th></tr></thead>',
        '      <tbody>',
                 actions.map(function (item) {
                   return [
                     '<tr>',
                     '  <td>' + escapeHtml(item.title) + '</td>',
                     '  <td>' + escapeHtml(item.source) + '</td>',
                     '  <td>' + escapeHtml(formatDate(item.dueDate)) + '</td>',
                     '  <td>' + escapeHtml(item.status) + '</td>',
                     '  <td><a class="planner-open" href="' + escapeHtml(item.href || 'playtrix-focus.html?topic=finance-overview') + '">Open</a></td>',
                     '</tr>'
                   ].join('');
                 }).join(''),
        '      </tbody>',
        '    </table>',
        '  </div>'
      ].join('') : '',
      '</article>'
    ].join('');

    registerScrollCap(container.querySelector('.finance-inline-table-wrap'), 'tbody tr', {
      maxItems: 4,
      headerSelector: 'thead',
      extraOffset: 4
    });
  }

  function renderFinanceCashPosition(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const model = buildFinanceConsoleModel(new Date());
    const rows = [
      {
        item: 'Current balance',
        note: 'Recorded inflows and expenses across the live ledger.',
        value: formatCurrency(model.cashBalance)
      },
      {
        item: 'Expected receipts',
        note: 'Invoices marked sent, due, or overdue.',
        value: formatCurrency(model.expectedReceipts)
      },
      {
        item: 'Bills due soon',
        note: model.billsDueSoonCount + ' recurring cost(s) due in the next 30 days.',
        value: formatCurrency(model.billsDueSoonTotal)
      },
      {
        item: 'Available operating cash',
        note: 'Current balance after allowing for the remaining tax set-aside gap.',
        value: formatCurrency(model.availableOperatingCash)
      },
      {
        item: 'Tax set-aside still needed',
        note: 'Gap between the target tax reserve and what is already set aside.',
        value: formatCurrency(model.taxReserve.gapValue)
      },
      {
        item: 'Expected owner support this month',
        note: 'Forecasted personal funding, kept separate from client revenue.',
        value: formatCurrency(model.expectedOwnerContribution)
      }
    ].map(function (row) {
      return financeMetric(row.item, row.value, row.note);
    }).join('');

    container.innerHTML = [
      '<article class="planner-sheet finance-sheet">',
      '  <p class="eyebrow">Cash Position</p>',
      '  <h3>Near-term cash control</h3>',
      '  <p>This is the survival view: what is in the business, what should arrive next, what is about to leave, and how much cash is truly free to use.</p>',
      '  <div class="finance-summary-grid">' + rows + '</div>',
      '</article>'
    ].join('');
  }

  function renderFinanceTaxReporting(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const guidance = [
      financeMetric('Self Assessment', '31 January', 'Treat the online filing and balancing payment deadline as a fixed annual control point.'),
      financeMetric('Records to keep', 'Income, costs, evidence', 'Keep invoices, expenses, owner contribution notes, bank evidence, and support records orderly and exportable.'),
      financeMetric('Records retention', '5 years after deadline', 'For Self Assessment records, keep the evidence long enough for HMRC record-keeping requirements.'),
      financeMetric('VAT and support checks', 'Review when relevant', 'Use the register below to keep VAT threshold checks, MTD readiness, and any support-related notes visible.')
    ].join('');

    container.innerHTML = [
      '<article class="planner-sheet finance-sheet">',
      '  <p class="eyebrow">Tax & Reporting</p>',
      '  <h3>Tax and reporting kept practical</h3>',
      '  <p>Use this area for the working reminders, record-keeping discipline, and official links needed to stay orderly. It is an operational reference, not a legal essay.</p>',
      '  <div class="finance-summary-grid finance-guidance-grid">' + guidance + '</div>',
      '</article>'
    ].join('');
  }

  function renderFinancePanels() {
    renderFinanceOverview('financeOverview');
    renderFinanceCashPosition('financeCashPosition');
    renderFinanceTaxReporting('financeTaxReporting');
  }

  function governanceStatusClass(value) {
    const label = String(value || '').toLowerCase();
    if (label.indexOf('overdue') >= 0) return ' is-overdue';
    if (label.indexOf('due this month') >= 0 || label.indexOf('due review') >= 0 || label.indexOf('review due') >= 0 || label.indexOf('needs document') >= 0) return ' is-due';
    if (label.indexOf('due this quarter') >= 0) return ' is-quarter';
    if (label.indexOf('annual') >= 0) return ' is-annual';
    if (label.indexOf('archive') >= 0 || label.indexOf('deletion') >= 0 || label.indexOf('archived') >= 0) return ' is-archive';
    if (label.indexOf('in place') >= 0 || label.indexOf('active') >= 0 || label.indexOf('current') >= 0 || label.indexOf('verified') >= 0) return ' is-ok';
    if (label.indexOf('not applicable') >= 0 || label.indexOf('placeholder') >= 0 || label.indexOf('pipeline') >= 0 || label.indexOf('not needed yet') >= 0) return ' is-quiet';
    return ' is-neutral';
  }

  function renderGovernanceCalendar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const groups = [
      {
        frequency: 'Weekly',
        note: 'Short control work that stays attached to the business week.',
        items: [
          {
            review: 'Admin and operational review',
            timing: 'Friday, final admin block',
            focus: 'Clear inboxes, review live work, confirm next actions, and reset the workboard for next week.'
          }
        ]
      },
      {
        frequency: 'Monthly',
        note: 'Monthly checks that stop finance, backup, and website drift building quietly.',
        items: [
          {
            review: 'Finance and backup checks',
            timing: 'First Monday',
            focus: 'Check cash position, confirm backup success, and note any restore or subscription issues.'
          },
          {
            review: 'Website check',
            timing: 'Third Thursday',
            focus: 'Check contact routes, service pages, forms, and any visible content drift on the live site.'
          }
        ]
      },
      {
        frequency: 'Quarterly',
        note: 'Formal standards review without turning the business into admin theatre.',
        items: [
          {
            review: 'Policy review',
            timing: 'March, June, September, December',
            focus: 'Review active policies, version numbers, owners, and whether the controls still fit the business.'
          },
          {
            review: 'Accessibility and content check',
            timing: 'Quarter-end content review',
            focus: 'Review accessibility basics, plain-language clarity, trust material, and broken or stale content.'
          }
        ]
      },
      {
        frequency: 'Annual',
        note: 'The once-a-year clean-up that keeps governance credible and light.',
        items: [
          {
            review: 'SOP review',
            timing: 'January',
            focus: 'Confirm onboarding, build, handover, maintenance, backup, and incident procedures still match real delivery.'
          },
          {
            review: 'Process note clean-up',
            timing: 'February',
            focus: 'Remove stale guidance, merge duplicates, and tighten any notes that drifted into informal policy.'
          },
          {
            review: 'Records retention and deletion review',
            timing: 'March',
            focus: 'Check retention rules, archive folders, and what should now be deleted rather than carried forward.'
          },
          {
            review: 'Housekeeping and archive review',
            timing: 'December',
            focus: 'Close the year cleanly, archive what is complete, and remove dead links, duplicate files, and loose admin.'
          }
        ]
      }
    ];

    container.innerHTML = [
      '<article class="planner-sheet governance-sheet">',
      '  <p class="eyebrow">Governance Calendar</p>',
      '  <h3>Timing spine for governance activity</h3>',
      '  <p>This is the timing spine for governance activity across the business. It keeps reviews attached to the working rhythm instead of leaving them as good intentions.</p>',
      '  <div class="governance-frequency-grid">',
           groups.map(function (group) {
             return [
               '<section class="governance-cycle-group">',
               '  <div class="governance-cycle-head">',
               '    <span class="governance-status-pill is-frequency">' + escapeHtml(group.frequency) + '</span>',
               '    <p>' + escapeHtml(group.note) + '</p>',
               '  </div>',
               '  <div class="governance-table-wrap">',
               '    <table class="governance-table">',
               '      <thead><tr><th>Review</th><th>When</th><th>What it covers</th></tr></thead>',
               '      <tbody>',
                        group.items.map(function (item) {
                          return '<tr><td>' + escapeHtml(item.review) + '</td><td>' + escapeHtml(item.timing) + '</td><td>' + escapeHtml(item.focus) + '</td></tr>';
                        }).join(''),
               '      </tbody>',
               '    </table>',
               '  </div>',
               '</section>'
             ].join('');
           }).join(''),
      '  </div>',
      '</article>'
    ].join('');
  }

  function renderGovernanceReviewDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const reviewItems = [
      {
        item: 'Cookies and tracking note',
        source: 'Compliance',
        dueDate: '2026-03-05',
        bucket: 'Overdue',
        nextAction: 'Confirm what tracking is actually in use and update the cookie wording accordingly.'
      },
      {
        item: 'Website content and accessibility standard',
        source: 'Policy Register',
        dueDate: '2026-03-20',
        bucket: 'Due This Month',
        nextAction: 'Review live service pages for clarity, broken links, contrast issues, and stale examples.'
      },
      {
        item: 'Direct marketing wording check',
        source: 'Compliance',
        dueDate: '2026-03-25',
        bucket: 'Due This Month',
        nextAction: 'Check outbound email wording, opt-out wording, and whether follow-up examples still fit the offer.'
      },
      {
        item: 'Incident Handling SOP',
        source: 'SOP Register',
        dueDate: '2026-05-15',
        bucket: 'Due This Quarter',
        nextAction: 'Tighten the breach escalation note and make sure the reporting route is still clear.'
      },
      {
        item: 'Privacy and Data Protection review',
        source: 'Policy Register',
        dueDate: '2026-06-20',
        bucket: 'Due This Quarter',
        nextAction: 'Check lawful basis notes, suppliers, and whether the retention rules still match practice.'
      },
      {
        item: 'Annual SOP review',
        source: 'Governance Calendar',
        dueDate: '2026-12-15',
        bucket: 'Annual Review',
        nextAction: 'Review onboarding, build, handover, maintenance, backup, and incident handling as one set.'
      },
      {
        item: 'Records retention and deletion review',
        source: 'Governance Calendar',
        dueDate: '2026-12-18',
        bucket: 'Archive / Deletion Actions',
        nextAction: 'Delete expired records, move closed work to archive, and note what was intentionally retained.'
      }
    ];

    const filters = [
      { key: 'month', label: 'This Month', buckets: ['Due This Month'] },
      { key: 'quarter', label: 'This Quarter', buckets: ['Due This Quarter'] },
      { key: 'overdue', label: 'Overdue', buckets: ['Overdue'] },
      { key: 'annual', label: 'Annual', buckets: ['Annual Review'] },
      { key: 'archive', label: 'Archive', buckets: ['Archive / Deletion Actions'] }
    ];

    const summaryCards = [
      { label: 'Overdue', note: 'Controls that need chasing now.' },
      { label: 'Due This Month', note: 'Short-cycle reviews due next.' },
      { label: 'Due This Quarter', note: 'Quarterly items to keep in view.' },
      { label: 'Annual Review', note: 'Long-cycle governance work.' },
      { label: 'Archive / Deletion Actions', note: 'Retention and housekeeping actions.' }
    ];

    let activeFilter = 'month';

    function countForBucket(bucket) {
      return reviewItems.filter(function (item) { return item.bucket === bucket; }).length;
    }

    function draw() {
      const currentFilter = filters.find(function (filter) { return filter.key === activeFilter; }) || filters[0];
      const visibleItems = reviewItems.filter(function (item) {
        return currentFilter.buckets.indexOf(item.bucket) >= 0;
      });

      container.innerHTML = [
        '<article class="planner-sheet governance-sheet">',
        '  <p class="eyebrow">Review Dashboard</p>',
        '  <h3>What needs attention next</h3>',
        '  <p>This is the control view for reviews across policies, SOPs, process notes, compliance checks, and archive work. It is meant to show timing, not become another document library.</p>',
        '  <div class="governance-dashboard-grid">',
             summaryCards.map(function (card) {
               return [
                 '<div class="mini governance-summary-card' + (currentFilter.buckets.indexOf(card.label) >= 0 ? ' is-selected' : '') + '">',
                 '  <span class="eyebrow">' + escapeHtml(card.label) + '</span>',
                 '  <strong>' + countForBucket(card.label) + '</strong>',
                 '  <p>' + escapeHtml(card.note) + '</p>',
                 '</div>'
               ].join('');
             }).join(''),
        '  </div>',
        '  <div class="governance-filter-bar">',
             filters.map(function (filter) {
               return '<button type="button" class="planner-btn' + (filter.key === activeFilter ? ' primary' : '') + '" data-governance-filter="' + escapeHtml(filter.key) + '">' + escapeHtml(filter.label) + '</button>';
             }).join(''),
        '  </div>',
        '  <div class="governance-table-wrap" data-scroll-cap="4">',
        '    <table class="governance-table">',
        '      <thead><tr><th>Item</th><th>Source</th><th>Due</th><th>Bucket</th><th>Next action</th></tr></thead>',
        '      <tbody>',
               visibleItems.map(function (item) {
                 return [
                   '<tr>',
                   '  <td>' + escapeHtml(item.item) + '</td>',
                   '  <td>' + escapeHtml(item.source) + '</td>',
                   '  <td>' + escapeHtml(formatDate(item.dueDate)) + '</td>',
                   '  <td><span class="governance-status-pill' + governanceStatusClass(item.bucket) + '">' + escapeHtml(item.bucket) + '</span></td>',
                   '  <td>' + escapeHtml(item.nextAction) + '</td>',
                   '</tr>'
                 ].join('');
               }).join(''),
        '      </tbody>',
        '    </table>',
        '  </div>',
        '</article>'
      ].join('');

      registerScrollCap(container.querySelector('.governance-table-wrap'), 'tbody tr', {
        maxItems: 4,
        headerSelector: 'thead',
        extraOffset: 4
      });

      container.querySelectorAll('[data-governance-filter]').forEach(function (button) {
        button.addEventListener('click', function () {
          activeFilter = button.dataset.governanceFilter || 'month';
          draw();
        });
      });
    }

    draw();
  }

  function renderOperationsMap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const routes = [
      { title: 'Weekly rhythm', note: 'Treat the governance calendar as the timing spine for reviews, control points, and the business week.', url: 'governance-calendar.html' },
      { title: 'SOP library', note: 'Keep the practical procedures, checklists, and repeatable delivery steps together.', url: 'playtrix-focus.html?topic=sop-library' },
      { title: 'Delivery review', note: 'Projects and governance together should show what is live, what is blocked, and what needs formal review.', url: 'playtrix-focus.html?topic=review-dashboard' },
      { title: 'Sales process', note: 'Lead stage, next action, and offer logic already belong in Clients & Sales, so there is no separate duplicate layer to maintain.', url: 'playtrix-focus.html?topic=sales' },
      { title: 'Review cycle', note: 'Use Governance and Finance & Treasury for monthly, quarterly, and annual control points.', url: 'playtrix-focus.html?topic=governance-calendar' },
      { title: 'Learning plan', note: 'Keep capability building visible so the business grows in competence, not only activity.', url: 'playtrix-focus.html?topic=learning-plan' }
    ];

    container.innerHTML = [
      '<article class="planner-sheet">',
      '  <p class="eyebrow">Governance Routes</p>',
      '  <h3>Working cycle and review routes</h3>',
      '  <p>These working routes now sit where they actually belong: governance for rhythm and review, clients and sales for pipeline discipline, and library and resources for SOPs and learning.</p>',
      '  <div class="route-list">',
           routes.map(function (route) {
             return [
               '<div class="route-item">',
               '  <div class="route-item-main">',
               '    <strong>' + escapeHtml(route.title) + '</strong>',
               '    <span>' + escapeHtml(route.note) + '</span>',
               '    <a href="' + escapeHtml(route.url) + '">Open</a>',
               '  </div>',
               '</div>'
             ].join('');
           }).join(''),
      '  </div>',
      '</article>'
    ].join('');
  }

  function renderMethodSheet(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = [
      '<article class="planner-sheet">',
      '  <p class="eyebrow">Method</p>',
      '  <h3>How the business should be run</h3>',
      '  <p>This organiser should teach you how to work, not just store information.</p>',
      '  <div class="planner-list">',
      '    <div class="planner-item"><div class="planner-item-main"><strong>Lean</strong><span>Remove wasted effort, duplicated work, and unclear process. If something repeats, systemise it.</span></div></div>',
      '    <div class="planner-item"><div class="planner-item-main"><strong>Kaizen</strong><span>Make one small improvement each week. Small disciplined gains beat dramatic resets.</span></div></div>',
      '    <div class="planner-item"><div class="planner-item-main"><strong>Agile rhythm</strong><span>Work in short cycles, review what happened, keep a visible backlog, and adjust the next iteration rather than pretending the first plan was perfect.</span></div></div>',
      '    <div class="planner-item"><div class="planner-item-main"><strong>Sales discipline</strong><span>Every lead needs a stage, a next action, and a follow-up date. Interest without movement is not a pipeline.</span></div></div>',
      '    <div class="planner-item"><div class="planner-item-main"><strong>AI use</strong><span>Use AI to draft, analyse, structure, and review. Do not let it replace judgement, pricing, or responsibility.</span></div></div>',
      '  </div>',
      '  <details class="help-card">',
      '    <summary><span class="help-icon">i</span><span>What this means in practice</span></summary>',
      '    <div class="help-card-content"><p>Use AI for proposals, checklists, process notes, content structure, policy drafts, client communication drafting, and improving this console itself. Then review the output like the business owner, not a passenger.</p></div>',
      '  </details>',
      '</article>'
    ].join('');
  }

  function renderProjectRegister(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const key = 'projects';
    const seedRows = [
      {
        id: makeId(),
        dateOpened: '2026-03-01',
        project: 'Parish refresh',
        projectKind: 'Client',
        client: 'Local Parish',
        sector: 'Parish',
        type: 'Website',
        stage: 'Review',
        status: 'Active',
        package: 'Tailored Standard',
        approvedFrom: 'Parish network lead',
        contact: 'Parish communications lead',
        nextAction: 'Confirm content ownership and final homepage revisions.',
        currentUrl: '',
        demoUrl: '',
        folderLink: '',
        repoLink: '',
        workbenchFeed: 'Yes',
        workbenchTarget: 'Spring 2026',
        workbenchNote: 'Reference parish build in refinement.',
        invoiceStatus: 'Deposit due',
        maintenanceStatus: 'Proposed',
        leadSource: 'Parish network',
        completionDate: '',
        notes: 'Good candidate for an early case-study proof piece.'
      },
      {
        id: makeId(),
        dateOpened: '2026-02-18',
        project: 'Window cleaning site',
        projectKind: 'Client',
        client: 'Local sole trader',
        sector: 'Sole trader',
        type: 'Website',
        stage: 'Build',
        status: 'Active',
        package: 'Tailored Basic',
        approvedFrom: 'Referral conversation',
        contact: 'Owner',
        nextAction: 'Finish services sections and mobile tidy-up.',
        currentUrl: '',
        demoUrl: '',
        folderLink: '',
        repoLink: '',
        workbenchFeed: 'No',
        workbenchTarget: '',
        workbenchNote: '',
        invoiceStatus: 'Part paid',
        maintenanceStatus: 'None',
        leadSource: 'Referral',
        completionDate: '',
        notes: 'Simple service site and a good repeatable template candidate.'
      },
      {
        id: makeId(),
        dateOpened: '2026-01-09',
        project: 'Waylight Beam',
        projectKind: 'Internal',
        client: 'Waylight Atlantic',
        sector: 'Internal',
        type: 'Internal system',
        stage: 'Build',
        status: 'Active',
        package: 'Internal',
        approvedFrom: 'Internal operating need',
        contact: 'Alan Gallagher',
        nextAction: 'Unify the working registers and navigation shell.',
        currentUrl: '',
        demoUrl: '',
        folderLink: '',
        repoLink: '',
        workbenchFeed: 'No',
        workbenchTarget: '',
        workbenchNote: '',
        invoiceStatus: 'N/A',
        maintenanceStatus: 'Active',
        leadSource: 'Internal',
        completionDate: '',
        notes: 'The business console itself should become proof of competence.'
      }
    ];

    const fields = [
      { name: 'dateOpened', label: 'Date opened', type: 'date' },
      { name: 'project', label: 'Project', placeholder: 'Project or site name' },
      { name: 'projectKind', label: 'Project kind', type: 'select', options: ['Client', 'Internal', 'Demonstration', 'Foundation', 'Almsgiving', 'Marketing', 'Business'] },
      { name: 'client', label: 'Client / owner', placeholder: 'Client, owner, or internal owner' },
      { name: 'sector', label: 'Sector', placeholder: 'Parish, charity, sole trader' },
      { name: 'type', label: 'Type', placeholder: 'Website, maintenance, advisory' },
      { name: 'stage', label: 'Stage', type: 'select', options: ['Approved', 'Discovery', 'Build', 'Review', 'Live', 'Maintenance', 'Closed'] },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Waiting', 'Completed', 'On hold', 'Archived'] },
      { name: 'package', label: 'Package', placeholder: 'Tailored Basic, Tailored Standard' },
      { name: 'approvedFrom', label: 'Approved from / origin', placeholder: 'Lead name, referral, or internal idea' },
      { name: 'contact', label: 'Contact', placeholder: 'Main contact' },
      { name: 'nextAction', label: 'Next action', placeholder: 'What happens next?' },
      { name: 'currentUrl', label: 'Current URL', type: 'url', placeholder: 'Current site URL' },
      { name: 'demoUrl', label: 'Demo URL', type: 'url', placeholder: 'Demo or live link' },
      { name: 'folderLink', label: 'Folder link', type: 'url', placeholder: 'OneDrive or local path' },
      { name: 'repoLink', label: 'Repo link', type: 'url', placeholder: 'Repository URL' },
      { name: 'workbenchFeed', label: 'Atlantic workbench', type: 'select', options: ['No', 'Yes'] },
      { name: 'workbenchTarget', label: 'Workbench target', placeholder: 'Spring 2026, Autumn 2026' },
      { name: 'workbenchNote', label: 'Workbench note', placeholder: 'Public-facing summary for the Atlantic table' },
      { name: 'invoiceStatus', label: 'Invoice status', type: 'select', options: ['Not started', 'Quoted', 'Deposit due', 'Part paid', 'Paid', 'N/A'] },
      { name: 'maintenanceStatus', label: 'Maintenance status', type: 'select', options: ['None', 'Proposed', 'Active', 'Paused', 'Closed'] },
      { name: 'leadSource', label: 'Lead source', placeholder: 'Referral, parish, website' },
      { name: 'completionDate', label: 'Completion date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Plain working notes' }
    ];

    const portfolioColumns = [
      { name: 'project', label: 'Project' },
      { name: 'type', label: 'Type' },
      { name: 'stage', label: 'Stage' },
      { name: 'status', label: 'Status' },
      { name: 'nextAction', label: 'Next action' },
      { name: 'workbenchTarget', label: 'Target' },
      { name: 'links', label: 'Demo / Live links' },
      { name: 'workbenchNote', label: 'Notes' }
    ];

    const internalColumns = [
      { name: 'dateOpened', label: 'Date opened', type: 'date' },
      { name: 'project', label: 'Project' },
      { name: 'projectKind', label: 'Project kind' },
      { name: 'client', label: 'Client / owner' },
      { name: 'sector', label: 'Sector' },
      { name: 'type', label: 'Type' },
      { name: 'stage', label: 'Stage' },
      { name: 'status', label: 'Status' },
      { name: 'package', label: 'Package' },
      { name: 'approvedFrom', label: 'Approved from / origin' },
      { name: 'contact', label: 'Contact' },
      { name: 'nextAction', label: 'Next action' },
      { name: 'currentUrl', label: 'Current URL', type: 'link' },
      { name: 'demoUrl', label: 'Demo URL', type: 'link' },
      { name: 'folderLink', label: 'Folder link', type: 'link' },
      { name: 'repoLink', label: 'Repo link', type: 'link' },
      { name: 'workbenchFeed', label: 'Atlantic workbench' },
      { name: 'workbenchTarget', label: 'Workbench target' },
      { name: 'workbenchNote', label: 'Workbench note' },
      { name: 'invoiceStatus', label: 'Invoice status' },
      { name: 'maintenanceStatus', label: 'Maintenance status' },
      { name: 'leadSource', label: 'Lead source' },
      { name: 'completionDate', label: 'Completion date', type: 'date' },
      { name: 'notes', label: 'Notes' }
    ];

    let activeView = 'portfolio';
    let editorOpen = false;

    seed(key, seedRows);

    function inferProjectKind(row) {
      const type = String(row.type || '').toLowerCase();
      const sector = String(row.sector || '').toLowerCase();
      const source = String(row.leadSource || '').toLowerCase();
      const packageName = String(row.package || '').toLowerCase();
      if (sector === 'internal' || source === 'internal' || packageName === 'internal' || type.indexOf('internal') >= 0) return 'Internal';
      if (type.indexOf('demo') >= 0 || String(row.project || '').toLowerCase().indexOf('demo') >= 0) return 'Demonstration';
      return 'Client';
    }

    function normaliseProjectRow(row) {
      const next = Object.assign({}, row);
      next.projectKind = next.projectKind || inferProjectKind(next);
      next.approvedFrom = next.approvedFrom || next.leadSource || (next.projectKind === 'Internal' ? 'Internal idea' : '');
      next.workbenchFeed = next.workbenchFeed || (((next.demoUrl || next.currentUrl) && next.projectKind !== 'Internal') ? 'Yes' : 'No');
      next.workbenchTarget = next.workbenchTarget || '';
      next.workbenchNote = typeof next.workbenchNote === 'string' ? next.workbenchNote : (next.notes || '');
      if (next.stage === 'Lead') next.stage = 'Approved';
      return next;
    }

    function getRows() {
      return read(key, seedRows).map(normaliseProjectRow);
    }

    function setRows(rows) {
      write(key, rows.map(normaliseProjectRow));
      renderDeskSignals();
    }

    function metric(label, value) {
      return '<div class="project-metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
    }

    function buildField(field) {
      function resolveProjectInputType(inputField) {
        const hint = ((inputField.label || '') + ' ' + (inputField.placeholder || '')).toLowerCase();
        if (inputField.type === 'url' && /path|folder|link/.test(hint)) {
          return 'text';
        }
        return inputField.type || 'text';
      }

      if (field.type === 'select') {
        return [
          '<div class="' + (field.name === 'notes' ? 'planner-field-notes' : (field.name === 'nextAction' || field.name === 'currentUrl' || field.name === 'demoUrl' || field.name === 'folderLink' || field.name === 'repoLink' || field.name === 'workbenchNote' ? 'planner-field-wide' : '')) + '">',
          '  <label>' + escapeHtml(field.label) + '</label>',
          '  <select name="' + escapeHtml(field.name) + '">',
               field.options.map(function (option) {
                 return '<option value="' + escapeHtml(option) + '">' + escapeHtml(option) + '</option>';
               }).join(''),
          '  </select>',
          '</div>'
        ].join('');
      }

      if (field.type === 'textarea') {
        return [
          '<div class="planner-field-notes">',
          '  <label>' + escapeHtml(field.label) + '</label>',
          '  <textarea name="' + escapeHtml(field.name) + '" rows="5" placeholder="' + escapeHtml(field.placeholder || '') + '"></textarea>',
          '</div>'
        ].join('');
      }

      const classes = [];
      if (field.name === 'nextAction' || field.name === 'currentUrl' || field.name === 'demoUrl' || field.name === 'folderLink' || field.name === 'repoLink' || field.name === 'workbenchNote') {
        classes.push('planner-field-wide');
      }

      return [
        '<div class="' + classes.join(' ') + '">',
        '  <label>' + escapeHtml(field.label) + '</label>',
        '  <input name="' + escapeHtml(field.name) + '" type="' + escapeHtml(resolveProjectInputType(field)) + '" placeholder="' + escapeHtml(field.placeholder || '') + '" />',
        '</div>'
      ].join('');
    }

    function renderLinkCell(value, label) {
      const href = normaliseLinkHref(value);
      if (!href) return '';
      return '<a class="planner-open" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(label) + '</a>';
    }

    function renderCell(row, column) {
      if (column.name === 'links') {
        const links = [renderLinkCell(row.demoUrl, 'Demo'), renderLinkCell(row.currentUrl, 'Live')].filter(Boolean);
        return links.length ? links.join(' / ') : '-';
      }

      const value = row[column.name] || '';
      if (column.type === 'date') {
        return value ? formatDate(value) : '';
      }
      if (column.type === 'link') {
        return value ? renderLinkCell(value, 'Open') : '';
      }
      return escapeHtml(value);
    }

    function draw() {
      const rows = getRows();
      const visibleRows = activeView === 'portfolio'
        ? rows.filter(function (row) { return row.workbenchFeed === 'Yes'; })
        : rows;
      const activeCount = rows.filter(function (row) { return row.status === 'Active'; }).length;
      const waitingCount = rows.filter(function (row) { return row.status === 'Waiting' || row.status === 'On hold'; }).length;
      const completedCount = rows.filter(function (row) { return row.status === 'Completed'; }).length;
      const maintenanceCount = rows.filter(function (row) { return row.maintenanceStatus === 'Active'; }).length;
      const feedCount = rows.filter(function (row) { return row.workbenchFeed === 'Yes'; }).length;
      const columns = activeView === 'portfolio' ? portfolioColumns : internalColumns;
      const editorTitle = editorOpen ? 'Add or edit project' : 'Add a project when you are ready';
      const editorText = editorOpen
        ? 'Fill the project card, then save it into the register below.'
        : 'Keep the list readable. Open the project card only when you want to add or edit a record.';

      container.innerHTML = [
        '<article class="planner-sheet">',
        '  <p class="eyebrow">Projects</p>',
        '  <h3>One register for the whole project life</h3>',
        '  <p>Keep client work, internal builds, demonstrations, and finished jobs in one project register. Portfolio View shows the Atlantic-facing subset, while Internal View keeps the fuller operating record together.</p>',
        '  <details class="help-card">',
        '    <summary><span class="help-icon">i</span><span>How to use projects</span></summary>',
        '    <div class="help-card-content"><p>Once work is approved, Projects becomes the place where the live record stays together. Mark only the rows you want shown on the Atlantic workbench with Atlantic workbench = Yes; everything else can stay here as the fuller internal record.</p></div>',
        '  </details>',
        '  <div class="project-metrics">',
             metric('Active', activeCount),
             metric('Waiting', waitingCount),
             metric('Completed', completedCount),
             metric('Maintenance', maintenanceCount),
             metric('Atlantic feed', feedCount),
        '  </div>',
        '  <div class="project-register-toolbar">',
        '    <div class="project-register-copy">',
        '      <strong>' + escapeHtml(editorTitle) + '</strong>',
        '      <span>' + escapeHtml(editorText) + '</span>',
        '    </div>',
        '    <div class="project-register-actions">',
        '      <button type="button" class="planner-btn primary" data-project-open>' + (editorOpen ? 'Hide project card' : 'Open project card') + '</button>',
        '      <button type="button" class="planner-btn" data-project-export-csv>Export CSV</button>',
        '    </div>',
        '  </div>',
        editorOpen ? [
          '  <div class="project-editor-card">',
          '    <form class="planner-form" data-project-form>',
          '      <input type="hidden" name="rowId" />',
          '      <div class="planner-row-grid project-form-grid">',
                   fields.map(buildField).join(''),
          '      </div>',
          '      <div class="planner-actions">',
          '        <button type="submit" class="planner-btn primary">Save project</button>',
          '        <button type="button" class="planner-btn" data-project-reset>Clear</button>',
          '      </div>',
          '    </form>',
          '  </div>'
        ].join('') : '',
        '  <div class="project-tabs" role="tablist" aria-label="Project register view">',
        '    <button type="button" class="project-tab' + (activeView === 'portfolio' ? ' is-active' : '') + '" data-project-view="portfolio">Portfolio View</button>',
        '    <button type="button" class="project-tab' + (activeView === 'internal' ? ' is-active' : '') + '" data-project-view="internal">Internal View</button>',
        '  </div>',
        '  <div class="planner-table-wrap project-table-wrap" data-scroll-cap="4">',
        '    <table class="planner-table">',
        '      <thead><tr>' + columns.map(function (column) { return '<th>' + escapeHtml(column.label) + '</th>'; }).join('') + '<th>Actions</th></tr></thead>',
        '      <tbody>',
             visibleRows.length ? visibleRows.map(function (row) {
               return '<tr>' + columns.map(function (column) {
                 return '<td>' + renderCell(row, column) + '</td>';
               }).join('') + '<td><button type="button" class="planner-edit" data-project-edit="' + escapeHtml(row.id) + '">Edit</button> <button type="button" class="planner-delete" data-project-delete="' + escapeHtml(row.id) + '">Delete</button></td></tr>';
             }).join('') : '<tr><td colspan="' + (columns.length + 1) + '">' + (activeView === 'portfolio' ? 'No projects are currently marked for the Atlantic workbench.' : 'No projects recorded yet.') + '</td></tr>',
        '      </tbody>',
        '    </table>',
        '  </div>',
        '</article>'
      ].join('');

      registerScrollCap(container.querySelector('.project-table-wrap'), 'tbody tr', {
        maxItems: 4,
        headerSelector: 'thead',
        extraOffset: 4
      });

      const openButton = container.querySelector('[data-project-open]');
      if (openButton) {
        openButton.addEventListener('click', function () {
          editorOpen = !editorOpen;
          draw();
        });
      }

      const exportCsv = container.querySelector('[data-project-export-csv]');
      if (exportCsv) {
        exportCsv.addEventListener('click', function () {
          downloadText('projects-' + activeView + '.csv', rowsToCsv(columns, visibleRows), 'text/csv;charset=utf-8');
        });
      }

      const form = container.querySelector('[data-project-form]');
      if (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          const rows = getRows();
          const rowId = form.elements.rowId.value;
          const payload = { id: rowId || makeId() };
          fields.forEach(function (field) {
            payload[field.name] = form.elements[field.name].value.trim();
          });
          if (!payload.project) return;
          const existingIndex = rows.findIndex(function (row) { return row.id === payload.id; });
          if (existingIndex >= 0) {
            rows[existingIndex] = payload;
          } else {
            rows.unshift(payload);
          }
          setRows(rows);
          editorOpen = false;
          draw();
        });

        container.querySelector('[data-project-reset]').addEventListener('click', function () {
          form.reset();
          form.elements.rowId.value = '';
        });
      }

      container.querySelectorAll('[data-project-view]').forEach(function (button) {
        button.addEventListener('click', function () {
          activeView = button.dataset.projectView;
          draw();
        });
      });

      container.querySelectorAll('[data-project-edit]').forEach(function (button) {
        button.addEventListener('click', function () {
          const row = getRows().find(function (item) {
            return item.id === button.dataset.projectEdit;
          });
          if (!row) return;
          editorOpen = true;
          draw();
          const currentForm = container.querySelector('[data-project-form]');
          if (!currentForm) return;
          currentForm.elements.rowId.value = row.id;
          fields.forEach(function (field) {
            currentForm.elements[field.name].value = row[field.name] || '';
          });
          const editorCard = container.querySelector('.project-editor-card');
          if (editorCard) {
            editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });

      container.querySelectorAll('[data-project-delete]').forEach(function (button) {
        button.addEventListener('click', function () {
          const rows = getRows();
          setRows(rows.filter(function (row) {
            return row.id !== button.dataset.projectDelete;
          }));
          draw();
        });
      });
    }

    draw();
  }

  function pressureMetric(label, value, meta, href) {
    return [
      '<a class="pressure-chip" href="' + escapeHtml(href) + '" data-route-key="' + escapeHtml((href.split('#')[1] || href).replace('.html', '')) + '">',
      '  <span>' + escapeHtml(label) + '</span>',
      '  <strong>' + escapeHtml(value) + '</strong>',
      '  <small>' + escapeHtml(meta) + '</small>',
      '</a>'
    ].join('');
  }

  function pressureItem(ticket) {
    return [
      '<div class="pressure-row">',
      '  <span class="pressure-priority pressure-priority-' + escapeHtml(ticket.priority) + '">' + escapeHtml(ticket.priorityLabel) + '</span>',
      '  <span class="pressure-source">' + escapeHtml(ticket.source) + '</span>',
      '  <strong>' + escapeHtml(ticket.title) + '</strong>',
      '  <span class="pressure-handling">' + escapeHtml(ticket.handling) + '</span>',
      '  <span>' + escapeHtml(ticket.nextMove) + '</span>',
      '  <a class="pressure-link" href="' + escapeHtml(ticket.href) + '" data-route-key="' + escapeHtml(ticket.routeKey) + '">Open</a>',
      '</div>'
    ].join('');
  }

  function buildPressureTickets(model) {
    const tickets = [];
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const priorityScore = { low: 20, medium: 50, high: 80 };

    function pushTicket(source, title, handling, nextMove, href, routeKey, priority, score) {
      tickets.push({
        source: source,
        title: title,
        handling: handling,
        nextMove: nextMove,
        href: href,
        routeKey: routeKey,
        priority: priority,
        priorityLabel: priority === 'high' ? 'High' : (priority === 'medium' ? 'Medium' : 'Low'),
        score: score
      });
    }

    const boardHandling = {
      inbox: { label: 'Inbox', boost: 45 },
      today: { label: 'Do today', boost: 75 },
      'this-week': { label: 'Do this week', boost: 55 },
      'this-month': { label: 'Do this month', boost: 35 },
      pending: { label: 'Pending', boost: 15 },
      waiting: { label: 'Pending', boost: 15 }
    };
    const cardPriority = { steady: { label: 'low', score: 20 }, important: { label: 'medium', score: 48 }, urgent: { label: 'high', score: 78 } };

    model.cards
      .filter(function (card) {
        const column = card.column === 'waiting' ? 'pending' : card.column;
        return column !== 'done';
      })
      .forEach(function (card) {
        const column = card.column === 'waiting' ? 'pending' : card.column;
        const handling = boardHandling[column] || boardHandling.inbox;
        const priority = cardPriority[card.priority] || cardPriority.steady;
        pushTicket(
          'Workbench',
          card.title || 'Workboard card',
          handling.label,
          card.note || 'Open the board card and decide the next move.',
          'playtrix-focus.html?topic=workboard',
          'workboard',
          priority.label,
          priority.score + handling.boost
        );
      });

    model.liveLeads.forEach(function (lead) {
      const stage = String(lead.stage || '');
      const leadPriority = stage === 'Proposal' ? 'high' : (stage === 'Qualified' ? 'medium' : 'low');
      const leadScore = stage === 'Proposal' ? 88 : (stage === 'Qualified' ? 68 : 42);
      pushTicket(
        'Sales',
        lead.lead || 'Live lead',
        'Pipeline',
        lead.nextAction || 'Decide the next commercial step.',
        'playtrix-focus.html?topic=sales',
        'sales',
        leadPriority,
        leadScore
      );
    });

    model.diaryDue.forEach(function (item) {
      const dateKey = item.date || '';
      const overdue = dateKey && dateKey < todayKey;
      const dueToday = dateKey === todayKey;
      const priority = overdue || dueToday ? 'high' : 'medium';
      pushTicket(
        'Business Diary',
        item.item || 'Business diary item',
        overdue || dueToday ? 'Quick hit' : 'Do today',
        item.nextAction || 'Check the next action.',
        'playtrix-console.html#diary',
        'diary',
        priority,
        priorityScore[priority] + (overdue ? 25 : dueToday ? 18 : 8)
      );
    });

    model.financeOpen.forEach(function (item) {
      const dueKey = item.dueDate || '';
      const overdue = dueKey && dueKey < todayKey;
      const dueToday = dueKey === todayKey;
      const waiting = normaliseValue(item.status) === 'waiting';
      const priority = waiting ? 'low' : (overdue || dueToday ? 'high' : 'medium');
      const nextMove = item.dueDate ? 'Due ' + formatDate(item.dueDate) : (item.status || 'Open');
      pushTicket(
        'Finance',
        item.title || item.item || 'Finance item',
        waiting ? 'Pending' : (item.source || 'Quick hit'),
        nextMove,
        item.href || 'playtrix-focus.html?topic=finance-overview',
        item.routeKey || 'finance-overview',
        priority,
        priorityScore[priority] + (waiting ? 0 : 18)
      );
    });

    return tickets.sort(function (a, b) {
      return b.score - a.score || a.source.localeCompare(b.source) || a.title.localeCompare(b.title);
    });
  }

  function renderPressureSheet() {
    const container = document.getElementById('deskPressure');
    if (!container) return;

    const model = getAnalyticsModel();
    const counts = model.counts;
    const pressure = buildPressureTickets(model);
    const quickHits = pressure.filter(function (ticket) { return ticket.handling === 'Quick hit'; }).length;

    container.innerHTML = [
      '<section class="front-desk-band-inner pressure-surface">',
      '  <div class="pressure-header">',
      '    <div>',
      '      <p class="eyebrow">Current Pressure</p>',
      '      <h3>Service queue for what matters next</h3>',
      '      <p>This queue is derived from the business diary, workboard, sales pipeline, and finance queue. Update the source once, and this desk order follows.</p>',
      '    </div>',
      '    <a class="pressure-link pressure-link-plain" href="analytics.html" data-route-key="analytics">Analytics page</a>',
      '  </div>',
      '  <div class="pressure-summary-row">',
           pressureMetric('Inbox', counts.inbox + ' items', 'Triage queue', 'playtrix-focus.html?topic=workboard'),
           pressureMetric('Do today', counts.today + ' items', 'Workboard', 'playtrix-focus.html?topic=workboard'),
           pressureMetric('Do this week', counts['this-week'] + ' items', 'Board focus', 'playtrix-focus.html?topic=workboard'),
           pressureMetric('Quick hits', quickHits + ' items', 'Business diary and finance', 'playtrix-console.html#diary'),
           pressureMetric('Pending', counts.pending + ' items', 'Blocked or waiting', 'playtrix-focus.html?topic=workboard'),
      '  </div>',
      '  <div class="pressure-table">',
      '    <div class="pressure-row pressure-row-head"><span>Priority</span><span>Source</span><span>Ticket</span><span>Handling</span><span>Next move</span><span>Open</span></div>',
           pressure.length ? pressure.slice(0, 10).map(pressureItem).join('') : '<div class="pressure-row pressure-row-empty"><span>Clear</span><span>Desk</span><strong>No immediate pressure is coming through.</strong><span>Closed</span><span>Keep the live sheets current and this stays honest.</span><span>-</span></div>',
      '  </div>',
      '</section>'
    ].join('');

    container.querySelectorAll('[data-route-key]').forEach(function (link) {
      trackRoute(link, link.dataset.routeKey);
    });
  }

  function renderTimeClock() {
    const container = document.getElementById('frontDeskClock');
    if (!container) return;

    const clock = getWorkClockModel(new Date());
    const statusText = clock.active ? 'Clocked in' : 'Clocked out';
    const statusNote = clock.active
      ? 'Current session started ' + formatDateTime(clock.active.startedAt) + ' and has run for ' + formatMinutes(clock.activeMinutes) + '.'
      : (clock.recentSessions[0]
        ? 'Last recorded session finished ' + formatDateTime(clock.recentSessions[0].endedAt) + '.'
        : 'No working session has been recorded yet.');

    container.innerHTML = [
      '<section class="front-clock-strip">',
      '  <div class="front-clock-copy">',
      '    <p class="eyebrow">Time Clock</p>',
      '    <h3>Record the hours given to the business</h3>',
      '    <p>' + escapeHtml(statusNote) + '</p>',
      '  </div>',
      '  <div class="front-clock-metrics">',
      '    <div class="front-clock-metric"><span>Today</span><strong>' + escapeHtml(formatMinutes(clock.todayMinutes)) + '</strong></div>',
      '    <div class="front-clock-metric"><span>This week</span><strong>' + escapeHtml(formatMinutes(clock.weekMinutes)) + '</strong></div>',
      '    <div class="front-clock-metric"><span>This month</span><strong>' + escapeHtml(formatMinutes(clock.monthMinutes)) + '</strong></div>',
      '  </div>',
      '  <div class="front-clock-actions">',
      '    <span class="front-clock-status' + (clock.active ? ' is-live' : '') + '">' + escapeHtml(statusText) + '</span>',
      '    <button type="button" class="planner-btn primary" data-clock-toggle>' + (clock.active ? 'Clock out' : 'Clock in') + '</button>',
      '    <a class="planner-btn" href="analytics.html" data-route-key="analytics">Analytics</a>',
      '  </div>',
      '</section>'
    ].join('');

    const toggle = container.querySelector('[data-clock-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        if (getWorkClockModel(new Date()).active) {
          stopWorkSession(new Date());
        } else {
          startWorkSession(new Date());
        }
        renderTimeClock();
        renderDeskSignals();
      });
    }

    const analyticsLink = container.querySelector('[data-route-key="analytics"]');
    trackRoute(analyticsLink, 'analytics');
  }

  function refreshClockPanels() {
    renderTimeClock();
    const clock = getWorkClockModel(new Date());
    if (clock.active || document.getElementById('analyticsDetail')) {
      renderAnalyticsSnapshot();
      renderAnalyticsDetail();
    }
  }

  function renderDeskSignals() {
    renderTimeClock();
    renderPressureSheet();
    renderAnalyticsSnapshot();
    renderAnalyticsDetail();
    renderFinancePanels();
  }

  function analyticsMetric(label, value, note) {
    return [
      '<div class="analytics-metric">',
      '  <span>' + escapeHtml(label) + '</span>',
      '  <strong>' + escapeHtml(value) + '</strong>',
      '  <small>' + escapeHtml(note) + '</small>',
      '</div>'
    ].join('');
  }

  let analyticsManualEntryOpen = false;

  function renderAnalyticsSnapshot() {
    const container = document.getElementById('analyticsSnapshot');
    if (!container) return;

    const model = getAnalyticsModel();
    container.innerHTML = [
      '<section class="front-desk-band-inner analytics-surface">',
      '  <div class="analytics-header">',
      '    <div>',
      '      <p class="eyebrow">Analytics</p>',
      '      <h3>Simple business snapshot</h3>',
      '      <p>Enough to answer what is live, what is blocked, and where the business stands today without opening a reporting suite.</p>',
      '    </div>',
      '    <a class="planner-open" href="analytics.html" data-route-key="analytics">Open analytics page</a>',
      '  </div>',
      '  <div class="analytics-grid">',
           analyticsMetric('Active projects', model.activeProjects.length, 'Live delivery work'),
           analyticsMetric('Live leads', model.liveLeads.length, 'Commercial opportunities in motion'),
           analyticsMetric('Open finance items', model.financeOpen.length, 'Money work still to handle'),
           analyticsMetric('Hours today', formatMinutes(model.clock.todayMinutes), model.clock.active ? 'Clock running' : 'Recorded time'),
           analyticsMetric('Hours this week', formatMinutes(model.clock.weekMinutes), 'Business time logged'),
           analyticsMetric('Contacts', model.contacts.length, 'People and organisations recorded'),
           analyticsMetric('Owned properties', model.properties.length, 'Public sites and digital properties'),
           analyticsMetric('Workboard done', model.counts.done, 'Completed board cards'),
      '  </div>',
      '  <div class="analytics-summary-list">',
      '    <div class="analytics-summary-item"><strong>Delivery:</strong><span>' + escapeHtml(model.activeProjects.length + ' active project(s), ' + model.waitingProjects.length + ' waiting, ' + model.maintenanceProjects.length + ' in maintenance.') + '</span></div>',
      '    <div class="analytics-summary-item"><strong>Commercial:</strong><span>' + escapeHtml(model.liveLeads.length + ' live lead(s), ' + model.wonLeads.length + ' won, ' + model.activeClients.length + ' client relationship(s) active or waiting.') + '</span></div>',
      '    <div class="analytics-summary-item"><strong>Control:</strong><span>' + escapeHtml(model.diaryDue.length + ' business diary item(s) dated, ' + model.financeOpen.length + ' finance item(s) open, ' + model.documents.length + ' document record(s) in the register.') + '</span></div>',
      '    <div class="analytics-summary-item"><strong>Time:</strong><span>' + escapeHtml(formatMinutes(model.clock.todayMinutes) + ' today, ' + formatMinutes(model.clock.weekMinutes) + ' this week, ' + formatMinutes(model.clock.monthMinutes) + ' this month.') + '</span></div>',
      '  </div>',
      '</section>'
    ].join('');

    const link = container.querySelector('[data-route-key="analytics"]');
    trackRoute(link, 'analytics');
  }

  function renderAnalyticsDetail() {
    const container = document.getElementById('analyticsDetail');
    if (!container) return;

    const model = getAnalyticsModel();
    const defaultManualDate = new Date();
    defaultManualDate.setDate(defaultManualDate.getDate() - 1);
    const defaultManualDateValue = defaultManualDate.toISOString().slice(0, 10);
    const stages = ['Prospecting', 'Warm', 'Qualified', 'Proposal', 'Won', 'Lost'];
    const stageCounts = stages.map(function (stage) {
      return {
        stage: stage,
        count: model.leads.filter(function (item) { return item.stage === stage; }).length
      };
    });

    container.innerHTML = [
      '<article class="planner-sheet analytics-sheet analytics-detail-sheet">',
      '  <p class="eyebrow">Analytics</p>',
      '  <h3>Business snapshot in plain language</h3>',
      '  <p>This page reads the live registers already in Waylight-Playtrix. It is intentionally modest: enough to answer what you have, what is moving, and what is waiting.</p>',
      '  <div class="analytics-grid analytics-grid-detail">',
           analyticsMetric('Active projects', model.activeProjects.length, 'Current live delivery'),
           analyticsMetric('Waiting projects', model.waitingProjects.length, 'Blocked or paused'),
           analyticsMetric('Live leads', model.liveLeads.length, 'Warm, qualified, or proposal'),
           analyticsMetric('Won leads', model.wonLeads.length, 'Business already secured'),
           analyticsMetric('Finance open', model.financeOpen.length, 'Not yet done'),
           analyticsMetric('Business diary due', model.diaryDue.length, 'Dated commitments'),
           analyticsMetric('Hours today', formatMinutes(model.clock.todayMinutes), model.clock.active ? 'Clocked in now' : 'Recorded today'),
           analyticsMetric('Hours this week', formatMinutes(model.clock.weekMinutes), 'Week-to-date'),
           analyticsMetric('Hours this month', formatMinutes(model.clock.monthMinutes), 'Month-to-date'),
           analyticsMetric('Sessions logged', model.clock.sessionCount, 'Completed work sessions'),
           analyticsMetric('Contacts', model.contacts.length, 'Total records'),
           analyticsMetric('Owned properties', model.properties.length, 'Sites and digital properties'),
      '  </div>',
      '  <div class="planner-table-wrap" style="margin-top:1rem;">',
      '    <table class="planner-table">',
      '      <thead><tr><th>Area</th><th>What the numbers say</th><th>Where to act</th></tr></thead>',
      '      <tbody>',
      '        <tr><td>Workboard</td><td>' + escapeHtml(model.counts.today + ' in Do Today, ' + model.counts['this-week'] + ' in Do This Week, ' + model.counts.pending + ' in Pending, ' + model.counts.done + ' in Done.') + '</td><td><a href="playtrix-focus.html?topic=workboard">Open workboard</a></td></tr>',
      '        <tr><td>Projects</td><td>' + escapeHtml(model.activeProjects.length + ' active project(s), ' + model.maintenanceProjects.length + ' maintenance relationship(s).') + '</td><td><a href="playtrix-focus.html?topic=projects">Open projects</a></td></tr>',
      '        <tr><td>Sales</td><td>' + escapeHtml(model.liveLeads.length + ' live lead(s), ' + model.activeClients.length + ' active or waiting client relationship(s).') + '</td><td><a href="playtrix-focus.html?topic=sales">Open sales</a></td></tr>',
      '        <tr><td>Finance</td><td>' + escapeHtml(model.financeOpen.length + ' open finance item(s), ' + model.financeWaiting.length + ' waiting.') + '</td><td><a href="playtrix-focus.html?topic=finance-overview">Open finance</a></td></tr>',
      '        <tr><td>Assets</td><td>' + escapeHtml(model.properties.length + ' property record(s), ' + model.documents.length + ' document record(s).') + '</td><td><a href="playtrix-focus.html?topic=asset-register">Open assets</a></td></tr>',
      '      </tbody>',
      '    </table>',
      '  </div>',
      '  <div class="planner-table-wrap" style="margin-top:1rem;">',
      '    <table class="planner-table">',
      '      <thead><tr><th>Lead stage</th><th>Count</th></tr></thead>',
      '      <tbody>',
             stageCounts.map(function (item) {
               return '<tr><td>' + escapeHtml(item.stage) + '</td><td>' + escapeHtml(item.count) + '</td></tr>';
             }).join(''),
      '      </tbody>',
      '    </table>',
      '  </div>',
      '  <div class="register-toolbar analytics-session-toolbar">',
      '    <div class="register-toolbar-copy">Missed hours can be added manually here and will count in the same daily, weekly, and monthly totals as the clocked sessions.</div>',
      '    <div class="register-toolbar-actions"><button type="button" class="planner-btn primary" data-manual-session-toggle>' + (analyticsManualEntryOpen ? 'Hide missed-time card' : 'Add missed time') + '</button></div>',
      '  </div>',
      analyticsManualEntryOpen ? [
        '  <div class="register-editor-card analytics-session-editor">',
        '    <form class="planner-form" data-manual-session-form>',
        '      <div class="planner-row-grid analytics-session-grid">',
        '        <div><label>Date</label><input name="sessionDate" type="date" value="' + escapeHtml(defaultManualDateValue) + '" /></div>',
        '        <div><label>Hours</label><input name="durationHours" type="number" step="0.25" min="0.25" placeholder="3" /></div>',
        '        <div class="planner-field-wide"><label>Note</label><input name="sessionNote" type="text" placeholder="Optional note for the register" /></div>',
        '      </div>',
        '      <div class="planner-actions">',
        '        <button type="submit" class="planner-btn primary">Add session</button>',
        '        <button type="button" class="planner-btn" data-manual-session-reset>Clear</button>',
        '      </div>',
        '    </form>',
        '  </div>'
      ].join('') : '',
      '  <div class="planner-table-wrap" style="margin-top:1rem;">',
      '    <table class="planner-table">',
      '      <thead><tr><th>Work session</th><th>Date</th><th>Started</th><th>Finished</th><th>Duration</th><th>Note</th></tr></thead>',
      '      <tbody>',
           (model.clock.active ? '<tr><td>Current session</td><td>' + escapeHtml(formatDate(model.clock.active.startedAt.slice(0, 10))) + '</td><td>' + escapeHtml(formatDateTime(model.clock.active.startedAt)) + '</td><td>Running</td><td>' + escapeHtml(formatMinutes(model.clock.activeMinutes)) + '</td><td>Clock running</td></tr>' : '') +
           (model.clock.recentSessions.length ? model.clock.recentSessions.map(function (session, index) {
             return '<tr><td>' + escapeHtml(session.manual ? 'Manual entry ' + (index + 1) : 'Recorded session ' + (index + 1)) + '</td><td>' + escapeHtml(formatDate(session.manual ? session.manualDate : String(session.startedAt).slice(0, 10))) + '</td><td>' + (session.manual ? 'Manual entry' : escapeHtml(formatDateTime(session.startedAt))) + '</td><td>' + (session.manual ? '-' : escapeHtml(formatDateTime(session.endedAt))) + '</td><td>' + escapeHtml(formatMinutes(session.minutes)) + '</td><td>' + escapeHtml(session.note || '') + '</td></tr>';
           }).join('') : '<tr><td colspan="6">No finished sessions recorded yet.</td></tr>'),
      '      </tbody>',
      '    </table>',
      '  </div>',
      '</article>'
    ].join('');

    const toggle = container.querySelector('[data-manual-session-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        analyticsManualEntryOpen = !analyticsManualEntryOpen;
        renderAnalyticsDetail();
      });
    }

    const form = container.querySelector('[data-manual-session-form]');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const added = addManualWorkSession(form.elements.sessionDate.value, form.elements.durationHours.value, form.elements.sessionNote.value);
        if (!added) return;
        analyticsManualEntryOpen = false;
        renderDeskSignals();
      });

      const reset = container.querySelector('[data-manual-session-reset]');
      if (reset) {
        reset.addEventListener('click', function () {
          form.reset();
          form.elements.sessionDate.value = defaultManualDateValue;
        });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderBusinessDiaryLinks('businessDiaryLinks');
    renderTableSheet('diaryRegister', {
      key: 'diary',
      eyebrow: 'Business Diary Register',
      title: 'Dated commitments and follow-up',
      description: 'Use one row per dated promise, appointment, renewal, or reminder.',
      toolbarText: 'Open the entry card when you need to add a dated commitment, follow-up, or reminder to the business diary.',
      tableScrollable: true,
      fields: [
        { name: 'item', label: 'Item', placeholder: 'Call, review, renewal, handover' },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'area', label: 'Area', type: 'select', options: ['Client', 'Sales', 'Governance', 'Finance', 'Admin', 'Personal'] },
        { name: 'nextAction', label: 'Next action', placeholder: 'What happens next?' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Optional URL or local path' }
      ],
      columns: [
        { name: 'item', label: 'Item' },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'area', label: 'Area' },
        { name: 'nextAction', label: 'Next action' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: []
    });

    renderNoteSheet('diaryNotesPanel', {
      key: 'diary-notes',
      eyebrow: 'Business Diary Notes',
      title: 'Business diary notes and action memory',
      description: 'Capture what happened, what was decided, and what now follows.',
      rows: 12,
      seed: { note: '' },
      prompts: [
        { title: 'What happened?', text: 'Record the important event or conversation plainly.' },
        { title: 'What matters now?', text: 'Note the judgement, risk, or promise that follows from it.' },
        { title: 'What must be done?', text: 'Turn that into a next action in the business diary or workboard.' }
      ]
    });

    renderTableSheet('clientRegister', {
      key: 'clients',
      eyebrow: 'Clients',
      title: 'Client relationships',
      description: 'Keep only active, waiting, maintenance, or completed client relationships here. Before approval, keep the opportunity in the lead pipeline instead.',
      toolbarText: 'Use this for real client relationships after approval, delivery, or maintenance has begun.',
      collapsibleForm: true,
      tableScrollable: true,
      exportName: 'client-relationships',
      fields: [
        { name: 'name', label: 'Client', placeholder: 'Organisation or person' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Waiting', 'Maintenance', 'Completed', 'Dormant'] },
        { name: 'nextAction', label: 'Next action', placeholder: 'What needs doing next?' },
        { name: 'folder', label: 'Folder or link', type: 'url', placeholder: 'Optional URL or path' }
      ],
      columns: [
        { name: 'name', label: 'Client' },
        { name: 'status', label: 'Status' },
        { name: 'nextAction', label: 'Next action' },
        { name: 'folder', label: 'Folder', type: 'link' }
      ],
      seed: [
        { id: makeId(), name: 'Parish refresh', status: 'Waiting', nextAction: 'Chase content ownership decision', folder: '' },
        { id: makeId(), name: 'Maintenance anchor', status: 'Maintenance', nextAction: 'Confirm the next monthly support cycle', folder: '' }
      ]
    });

    renderTableSheet('leadRegister', {
      key: 'leads',
      eyebrow: 'Pipeline',
      title: 'Lead pipeline',
      description: 'Keep stage, source, and next action practical and visible. When a lead is approved, promote it into Projects so the fuller working record starts there.',
      toolbarText: 'This is the pre-project commercial pipeline: before yes, before delivery, before it becomes a live client relationship.',
      collapsibleForm: true,
      tableScrollable: true,
      exportName: 'lead-pipeline',
      fields: [
        { name: 'lead', label: 'Lead', placeholder: 'Who is it?' },
        { name: 'stage', label: 'Stage', type: 'select', options: ['Prospecting', 'Warm', 'Qualified', 'Proposal', 'Won', 'Lost'] },
        { name: 'source', label: 'Source', placeholder: 'Referral, parish, local search' },
        { name: 'nextAction', label: 'Next action', placeholder: 'What happens next?' },
        { name: 'retentionReview', label: 'Retention review', type: 'date' }
      ],
      columns: [
        { name: 'lead', label: 'Lead' },
        { name: 'stage', label: 'Stage' },
        { name: 'source', label: 'Source' },
        { name: 'nextAction', label: 'Next action' },
        { name: 'retentionReview', label: 'Retention review', type: 'date' }
      ],
      rowActions: [
        {
          key: 'lead-to-project',
          label: function (row) {
            return row.stage === 'Won' ? 'Create project' : 'Approve to project';
          },
          when: function (row) {
            return row.stage !== 'Lost';
          },
          handler: function (context) {
            const lead = context.row;
            const projectName = String(lead.lead || '').trim();
            if (!projectName) return;

            const projects = read('projects', []);
            const existing = projects.some(function (project) {
              return String(project.project || '').trim().toLowerCase() === projectName.toLowerCase();
            });

            if (!existing) {
              const source = String(lead.source || '').trim();
              const projectKind = source.toLowerCase() === 'internal' ? 'Internal' : 'Client';
              projects.unshift({
                id: makeId(),
                dateOpened: new Date().toISOString().slice(0, 10),
                project: projectName,
                projectKind: projectKind,
                client: projectKind === 'Internal' ? 'Waylight Atlantic' : projectName,
                sector: '',
                type: 'Website',
                stage: 'Approved',
                status: 'Active',
                package: '',
                approvedFrom: projectName,
                contact: '',
                nextAction: lead.nextAction || 'Clarify scope and open the working record properly.',
                currentUrl: '',
                demoUrl: '',
                folderLink: '',
                repoLink: '',
                workbenchFeed: 'No',
                workbenchTarget: '',
                workbenchNote: '',
                invoiceStatus: projectKind === 'Internal' ? 'N/A' : 'Quoted',
                maintenanceStatus: 'None',
                leadSource: source,
                completionDate: '',
                notes: 'Promoted from the lead register.'
              });
              write('projects', projects);
            }

            if (String(lead.source || '').trim().toLowerCase() !== 'internal') {
              const clients = read('clients', []);
              const existingClient = clients.some(function (client) {
                return String(client.name || '').trim().toLowerCase() === projectName.toLowerCase();
              });
              if (!existingClient) {
                clients.unshift({
                  id: makeId(),
                  name: projectName,
                  status: 'Active',
                  nextAction: lead.nextAction || 'Open the client relationship and confirm next delivery steps.',
                  folder: ''
                });
                write('clients', clients);
              }
            }

            const leads = context.rows.slice();
            leads[context.index] = Object.assign({}, lead, {
              stage: 'Won',
              nextAction: existing ? 'Project already exists in Projects.' : 'Project opened in Projects. Fill out the fuller record there.'
            });
            context.setRows(leads);
            renderProjectRegister('projectRegister');
            context.redraw();
            renderDeskSignals();
          }
        }
      ],
      afterDraw: function () {
        renderSalesPipelineBoard('salesPipelineBoard');
      },
      seed: [
        { id: makeId(), lead: 'Parish network list', stage: 'Prospecting', source: 'Parish network', nextAction: 'Prepare examples and a short message sequence.', retentionReview: '' },
        { id: makeId(), lead: 'Charity enquiry', stage: 'Qualified', source: 'Referral', nextAction: 'Clarify contact flow and likely scope.', retentionReview: '' },
        { id: makeId(), lead: 'Parish refresh', stage: 'Proposal', source: 'Direct enquiry', nextAction: 'Chase content ownership and domain decision.', retentionReview: '' }
      ]
    });

    renderTableSheet('marketingCampaigns', {
      key: 'marketing-campaigns',
      eyebrow: 'Campaign Register',
      title: 'Campaign register',
      description: 'Track the campaigns that are actually in motion, the season or window they support, and what should happen next.',
      toolbarText: 'Use one row per real campaign. Tie the timing back to the campaign governance calendar above.',
      tableScrollable: true,
      fields: [
        { name: 'campaign', label: 'Campaign', placeholder: 'Spring parish outreach, portfolio refresh' },
        { name: 'channel', label: 'Channel', type: 'select', options: ['Website', 'Article', 'Email', 'Referral', 'LinkedIn', 'Local outreach', 'Google profile', 'Portfolio'] },
        { name: 'window', label: 'Window', placeholder: 'Spring, summer, autumn renewals' },
        { name: 'status', label: 'Status', type: 'select', options: ['Idea', 'Drafting', 'Ready', 'Live', 'Paused', 'Done'] },
        { name: 'nextAction', label: 'Next action', placeholder: 'What should happen next?' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Optional URL or path' }
      ],
      columns: [
        { name: 'campaign', label: 'Campaign' },
        { name: 'channel', label: 'Channel' },
        { name: 'window', label: 'Window' },
        { name: 'status', label: 'Status' },
        { name: 'nextAction', label: 'Next action' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), campaign: 'Waylight pricing refresh', channel: 'Website', window: 'Q1', status: 'Drafting', nextAction: 'Keep services and pricing aligned with the live offer ladder', link: 'https://www.waylight-atlantic.co.uk/pricing' },
        { id: makeId(), campaign: 'Parish example follow-up', channel: 'Email', window: 'Spring', status: 'Ready', nextAction: 'Send one useful example with a simple next step', link: '' }
      ]
    });

    renderTableSheet('marketingAssets', {
      key: 'marketing-assets',
      eyebrow: 'Proof Assets',
      title: 'Article and proof asset register',
      description: 'Treat proof assets as managed articles and trust material. Give them a review cycle so they can be refreshed or recertified when needed.',
      toolbarText: 'Use one row per article, case study, or trust asset. Review them on a real cycle rather than letting them decay.',
      tableScrollable: true,
      fields: [
        { name: 'asset', label: 'Asset', placeholder: 'Case study, article, proof page' },
        { name: 'type', label: 'Type', type: 'select', options: ['Case study', 'Article', 'Portfolio item', 'Testimonial', 'Offer page', 'Email sequence'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Idea', 'Drafting', 'Needs review', 'Live', 'Archived'] },
        { name: 'reviewCycle', label: 'Review cycle', type: 'select', options: ['Monthly', 'Quarterly', 'Bi-annual', 'Annual', 'As needed'] },
        { name: 'nextReview', label: 'Next review', type: 'date' },
        { name: 'nextAction', label: 'Next action', placeholder: 'What must happen next?' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Optional URL or path' }
      ],
      columns: [
        { name: 'asset', label: 'Asset' },
        { name: 'type', label: 'Type' },
        { name: 'status', label: 'Status' },
        { name: 'reviewCycle', label: 'Review cycle' },
        { name: 'nextReview', label: 'Next review', type: 'date' },
        { name: 'nextAction', label: 'Next action' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), asset: 'Parish refresh case study', type: 'Case study', status: 'Needs review', reviewCycle: 'Bi-annual', nextReview: '', nextAction: 'Capture the before, after, and practical result', link: '' },
        { id: makeId(), asset: 'What digital hygiene means for a small organisation', type: 'Article', status: 'Drafting', reviewCycle: 'Quarterly', nextReview: '', nextAction: 'Write the plain-language first draft', link: '' }
      ]
    });

    renderTableSheet('marketingChannels', {
      key: 'marketing-channels',
      eyebrow: 'Channel Register',
      title: 'Channels and their working discipline',
      description: 'Record the channels you actually intend to use and what "good order" looks like for each one.',
      tableScrollable: true,
      fields: [
        { name: 'channel', label: 'Channel', placeholder: 'Website, LinkedIn, referrals' },
        { name: 'purpose', label: 'Purpose', placeholder: 'What this channel is for' },
        { name: 'cadence', label: 'Cadence', placeholder: 'Weekly, monthly, as needed' },
        { name: 'nextAction', label: 'Next action', placeholder: 'One practical next step' }
      ],
      columns: [
        { name: 'channel', label: 'Channel' },
        { name: 'purpose', label: 'Purpose' },
        { name: 'cadence', label: 'Cadence' },
        { name: 'nextAction', label: 'Next action' }
      ],
      seed: [
        { id: makeId(), channel: 'Waylight website', purpose: 'Primary proof and service explanation', cadence: 'Weekly review', nextAction: 'Keep services, proof, and contact routes current' },
        { id: makeId(), channel: 'LinkedIn', purpose: 'Professional visibility and proof of thinking', cadence: 'One useful post a week', nextAction: 'Post one practical note or project proof piece' },
        { id: makeId(), channel: 'Referrals', purpose: 'Warm introductions and trust-based work', cadence: 'Ongoing', nextAction: 'Ask one happy contact for a useful introduction' }
      ]
    });

    renderMarketingCalendar('marketingCalendar');

    renderTableSheet('marketingSupport', {
      key: 'authority-reviews',
      eyebrow: 'Authority Register',
      title: 'Authority links and review log',
      description: 'Treat authority links as review tasks, not loose bookmarks. Record when they were checked, what matters, and whether follow-up is needed.',
      toolbarText: 'Open the entry card when you need to add a source or log a review. Use "Mark reviewed" to tick off a source with today\'s date.',
      tableScrollable: true,
      fields: [
        { name: 'source', label: 'Source', placeholder: 'Google Search Console help, CAP Code' },
        { name: 'status', label: 'Status', type: 'select', options: ['To review', 'Reviewed', 'Follow up', 'Reference only'] },
        { name: 'reviewDate', label: 'Review date', type: 'date' },
        { name: 'nextAction', label: 'Next action', placeholder: 'What should happen next?' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 4, className: 'planner-field-wide', placeholder: 'What changed, what matters, and what needs following up?' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Official source URL' }
      ],
      columns: [
        { name: 'source', label: 'Source' },
        { name: 'status', label: 'Status' },
        { name: 'reviewDate', label: 'Review date', type: 'date' },
        { name: 'nextAction', label: 'Next action' },
        { name: 'notes', label: 'Notes' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      rowActions: [
        {
          key: 'mark-reviewed',
          label: function (row) {
            return row.status === 'Reviewed' ? 'Reviewed' : 'Mark reviewed';
          },
          when: function (row) {
            return row.status !== 'Reviewed';
          },
          handler: function (context) {
            const rows = context.rows.slice();
            rows[context.index] = Object.assign({}, context.row, {
              status: 'Reviewed',
              reviewDate: new Date().toISOString().slice(0, 10),
              nextAction: context.row.nextAction || 'No follow-up needed.'
            });
            context.setRows(rows);
            context.redraw();
            renderDeskSignals();
          }
        }
      ],
      seed: marketingSupportLinks.map(function (link) {
        return {
          id: makeId(),
          source: link.title,
          status: 'To review',
          reviewDate: '',
          nextAction: link.note,
          notes: '',
          link: link.url
        };
      })
    });

    renderProjectRegister('projectRegister');

    renderTableSheet('operatingGoals', {
      key: 'goals',
      eyebrow: 'Direction',
      title: 'Short, medium, and long-term goals',
      description: 'Every goal needs a horizon and a next move, not just a nice sentence.',
      fields: [
        { name: 'goal', label: 'Goal', placeholder: 'What is to be achieved?' },
        { name: 'horizon', label: 'Horizon', type: 'select', options: ['Short', 'Medium', 'Long'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Waiting', 'Done'] },
        { name: 'nextAction', label: 'Next action', placeholder: 'What moves this next?' }
      ],
      columns: [
        { name: 'goal', label: 'Goal' },
        { name: 'horizon', label: 'Horizon' },
        { name: 'status', label: 'Status' },
        { name: 'nextAction', label: 'Next action' }
      ],
      seed: [
        { id: makeId(), goal: 'Land the first steady maintenance clients', horizon: 'Short', status: 'Active', nextAction: 'Turn one completed build into a maintenance offer' },
        { id: makeId(), goal: 'Build a repeatable small-organisation website process', horizon: 'Medium', status: 'Active', nextAction: 'Tighten questionnaires, SOPs, and handover notes' },
        { id: makeId(), goal: 'Make Waylight-Playtrix the operating desk for the whole business', horizon: 'Long', status: 'Active', nextAction: 'Unify registers, documents, and review routines' }
      ]
    });

    renderMethodSheet('operatingMethod');
    renderSupportLinks('operatingSupport', 'Business support references', 'Keep the official routes close while the business is being built and governed properly.', supportLinks);
    renderGovernanceCalendar('governanceCalendar');
    renderGovernanceReviewDashboard('governanceReviewDashboard');

    renderTableSheet('governancePolicyRegister', {
      key: 'governancePolicies',
      eyebrow: 'Policy Register',
      title: 'Formal policies and standards',
      description: 'Keep one row per live policy or standard. This is the formal rule layer for the business.',
      toolbarText: 'Keep the register readable, current, and easy to export.',
      fields: [
        { name: 'policyName', label: 'Policy name', placeholder: 'Privacy and Data Protection' },
        { name: 'owner', label: 'Owner', placeholder: 'Alan Gallagher' },
        { name: 'appliesTo', label: 'Applies to', placeholder: 'Client enquiries, stored records, website content' },
        { name: 'version', label: 'Version', placeholder: '1.0' },
        { name: 'lastReview', label: 'Last review', type: 'date' },
        { name: 'nextReview', label: 'Next review', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Draft', 'Due Review', 'Archived'] },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Document home or folder path' }
      ],
      columns: [
        { name: 'policyName', label: 'Policy Name' },
        { name: 'owner', label: 'Owner' },
        { name: 'appliesTo', label: 'Applies To' },
        { name: 'version', label: 'Version' },
        { name: 'lastReview', label: 'Last Review', type: 'date' },
        { name: 'nextReview', label: 'Next Review', type: 'date' },
        { name: 'status', label: 'Status' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), policyName: 'Privacy and Data Protection', owner: 'Alan Gallagher', appliesTo: 'Client enquiries, supplier records, and people records metadata', version: '1.2', lastReview: '2026-01-15', nextReview: '2026-04-15', status: 'Active', link: 'playtrix-focus.html?topic=documents' },
        { id: makeId(), policyName: 'Data Retention and Deletion', owner: 'Alan Gallagher', appliesTo: 'Client files, finance records, and archive folders', version: '1.0', lastReview: '2025-12-12', nextReview: '2026-03-31', status: 'Due Review', link: 'playtrix-focus.html?topic=documents' },
        { id: makeId(), policyName: 'Website Content and Accessibility Standard', owner: 'Alan Gallagher', appliesTo: 'Waylight Atlantic and outward-facing content', version: '0.9', lastReview: '2025-11-20', nextReview: '2026-03-20', status: 'Due Review', link: 'playtrix-focus.html?topic=documents' },
        { id: makeId(), policyName: 'Information Security / Digital Hygiene', owner: 'Alan Gallagher', appliesTo: 'Devices, passwords, admin accounts, and backups', version: '1.1', lastReview: '2026-02-05', nextReview: '2026-06-05', status: 'Active', link: 'playtrix-focus.html?topic=documents' },
        { id: makeId(), policyName: 'Complaints and Service Issues', owner: 'Alan Gallagher', appliesTo: 'Client delivery, maintenance, and post-handover support', version: '0.8', lastReview: '2025-10-14', nextReview: '2026-04-14', status: 'Draft', link: 'playtrix-focus.html?topic=documents' },
        { id: makeId(), policyName: 'Records Management', owner: 'Alan Gallagher', appliesTo: 'Working files, archive structure, and document naming', version: '1.0', lastReview: '2026-01-28', nextReview: '2027-01-28', status: 'Active', link: 'playtrix-focus.html?topic=documents' }
      ]
    });

    renderTableSheet('governanceSopRegister', {
      key: 'governanceSops',
      eyebrow: 'SOP Register',
      title: 'Repeatable standard operating procedures',
      description: 'SOPs hold the formal repeatable method. Keep them distinct from policy and lighter working notes.',
      toolbarText: 'Open an entry card only when adding or revising a procedure reference.',
      fields: [
        { name: 'sopTitle', label: 'SOP title', placeholder: 'Client Onboarding SOP' },
        { name: 'area', label: 'Area', placeholder: 'Delivery, operations, maintenance' },
        { name: 'owner', label: 'Owner', placeholder: 'Alan Gallagher' },
        { name: 'version', label: 'Version', placeholder: '1.0' },
        { name: 'lastReview', label: 'Last review', type: 'date' },
        { name: 'nextReview', label: 'Next review', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Draft', 'Due Review', 'Archived'] },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Document home or folder path' }
      ],
      columns: [
        { name: 'sopTitle', label: 'SOP Title' },
        { name: 'area', label: 'Area' },
        { name: 'owner', label: 'Owner' },
        { name: 'version', label: 'Version' },
        { name: 'lastReview', label: 'Last Review', type: 'date' },
        { name: 'nextReview', label: 'Next Review', type: 'date' },
        { name: 'status', label: 'Status' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), sopTitle: 'Client Onboarding SOP', area: 'Client delivery', owner: 'Alan Gallagher', version: '1.3', lastReview: '2026-02-01', nextReview: '2027-02-01', status: 'Active', link: 'playtrix-focus.html?topic=sop-library' },
        { id: makeId(), sopTitle: 'Website Build SOP', area: 'Delivery', owner: 'Alan Gallagher', version: '1.4', lastReview: '2026-01-20', nextReview: '2026-07-20', status: 'Active', link: 'playtrix-focus.html?topic=sop-library' },
        { id: makeId(), sopTitle: 'Website Handover SOP', area: 'Delivery', owner: 'Alan Gallagher', version: '1.1', lastReview: '2025-11-28', nextReview: '2026-05-28', status: 'Due Review', link: 'playtrix-focus.html?topic=sop-library' },
        { id: makeId(), sopTitle: 'Maintenance SOP', area: 'Recurring service', owner: 'Alan Gallagher', version: '1.0', lastReview: '2026-01-08', nextReview: '2026-07-08', status: 'Active', link: 'playtrix-focus.html?topic=sop-library' },
        { id: makeId(), sopTitle: 'Backup SOP', area: 'Operations', owner: 'Alan Gallagher', version: '1.0', lastReview: '2026-02-12', nextReview: '2026-05-12', status: 'Active', link: 'playtrix-focus.html?topic=sop-library' },
        { id: makeId(), sopTitle: 'Incident Handling SOP', area: 'Governance', owner: 'Alan Gallagher', version: '0.7', lastReview: '2025-09-15', nextReview: '2026-03-15', status: 'Due Review', link: 'playtrix-focus.html?topic=sop-library' },
        { id: makeId(), sopTitle: 'Free-Site / Portfolio Project SOP', area: 'Portfolio work', owner: 'Alan Gallagher', version: '0.8', lastReview: '2025-12-05', nextReview: '2026-06-05', status: 'Draft', link: 'playtrix-focus.html?topic=sop-library' },
        { id: makeId(), sopTitle: 'Legacy launch checklist', area: 'Historic reference', owner: 'Alan Gallagher', version: '0.5', lastReview: '2024-08-30', nextReview: '2025-08-30', status: 'Archived', link: 'playtrix-focus.html?topic=archive' }
      ]
    });

    renderTableSheet('governanceProcessNotes', {
      key: 'governanceProcessNotes',
      eyebrow: 'Process Notes',
      title: 'Practical notes, guidance, and exceptions',
      description: 'Policies set the rule. SOPs set the formal repeatable method. Process Notes hold the lighter guidance, reminders, and known exceptions.',
      toolbarText: 'Keep these lighter than SOPs so they remain useful.',
      fields: [
        { name: 'noteTitle', label: 'Note title', placeholder: 'Handling small content amendments' },
        { name: 'area', label: 'Area', placeholder: 'Maintenance, delivery, portfolio work' },
        { name: 'lastUpdated', label: 'Last updated', type: 'date' },
        { name: 'owner', label: 'Owner', placeholder: 'Alan Gallagher' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Document home or folder path' }
      ],
      columns: [
        { name: 'noteTitle', label: 'Note Title' },
        { name: 'area', label: 'Area' },
        { name: 'lastUpdated', label: 'Last Updated', type: 'date' },
        { name: 'owner', label: 'Owner' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), noteTitle: 'Handling small content amendments', area: 'Maintenance', lastUpdated: '2026-03-01', owner: 'Alan Gallagher', link: 'playtrix-focus.html?topic=reference-notes' },
        { id: makeId(), noteTitle: 'Domain renewal reminders', area: 'Assets', lastUpdated: '2026-02-14', owner: 'Alan Gallagher', link: 'playtrix-focus.html?topic=asset-register' },
        { id: makeId(), noteTitle: 'Free-site selection notes', area: 'Portfolio work', lastUpdated: '2026-01-22', owner: 'Alan Gallagher', link: 'playtrix-focus.html?topic=projects' },
        { id: makeId(), noteTitle: 'Handover exceptions', area: 'Delivery', lastUpdated: '2026-02-27', owner: 'Alan Gallagher', link: 'playtrix-focus.html?topic=reference-notes' },
        { id: makeId(), noteTitle: 'Photography / asset request guidance', area: 'Client onboarding', lastUpdated: '2026-02-18', owner: 'Alan Gallagher', link: 'playtrix-focus.html?topic=reference-notes' }
      ]
    });

    renderTableSheet('governanceCompliance', {
      key: 'governanceCompliance',
      eyebrow: 'Compliance',
      title: 'Practical compliance checklist',
      description: 'Keep this as an administrative dashboard rather than a legal essay. Review what exists, what evidence supports it, and what action is next.',
      toolbarText: 'If a personal-data breach reaches the reporting threshold, the incident route should be assessed and reported without undue delay and within 72 hours.',
      fields: [
        { name: 'requirementArea', label: 'Requirement area', placeholder: 'Data protection' },
        { name: 'status', label: 'Status', type: 'select', options: ['In place', 'Needs document', 'Review due', 'Not applicable yet'] },
        { name: 'evidence', label: 'Evidence / document', placeholder: 'Policy, note, page, or checklist' },
        { name: 'nextAction', label: 'Next action', placeholder: 'What needs doing next?' },
        { name: 'reviewDate', label: 'Review date', type: 'date' }
      ],
      columns: [
        { name: 'requirementArea', label: 'Requirement Area' },
        { name: 'status', label: 'Status' },
        { name: 'evidence', label: 'Evidence / Document' },
        { name: 'nextAction', label: 'Next Action' },
        { name: 'reviewDate', label: 'Review Date', type: 'date' }
      ],
      seed: [
        { id: makeId(), requirementArea: 'Data protection', status: 'In place', evidence: 'Privacy and Data Protection policy plus retention schedule', nextAction: 'Check supplier list, ICO fee position, and review notes against current practice.', reviewDate: '2026-04-15' },
        { id: makeId(), requirementArea: 'Cookies / tracking', status: 'Needs document', evidence: 'Cookie banner check and analytics inventory', nextAction: 'Confirm what cookies are actually present and update the cookie wording before new analytics changes.', reviewDate: '2026-03-31' },
        { id: makeId(), requirementArea: 'Direct marketing', status: 'Review due', evidence: 'Enquiry follow-up wording and opt-out wording', nextAction: 'Review outbound email wording before the next follow-up round.', reviewDate: '2026-03-25' },
        { id: makeId(), requirementArea: 'Consumer information', status: 'Not applicable yet', evidence: 'No live online checkout or deposit flow at present', nextAction: 'If online payments or distance selling go live, add a Consumer Contracts information check.', reviewDate: '2026-04-30' },
        { id: makeId(), requirementArea: 'Records retention / deletion', status: 'Review due', evidence: 'Retention schedule and archive routine', nextAction: 'Run the annual deletion review and note what was deleted or retained.', reviewDate: '2026-03-31' },
        { id: makeId(), requirementArea: 'Accessibility / content standards', status: 'In place', evidence: 'Website Content and Accessibility Standard', nextAction: 'Run the quarterly page review and fix the issues found.', reviewDate: '2026-03-20' },
        { id: makeId(), requirementArea: 'Cybersecurity / backup hygiene', status: 'In place', evidence: 'Backup SOP and device hygiene checklist', nextAction: 'Run a restore test and check password, device, and backup hygiene together.', reviewDate: '2026-03-29' }
      ]
    });

    renderTableSheet('governancePeople', {
      key: 'governancePeople',
      eyebrow: 'People',
      title: 'People Register',
      description: 'Sensitive personnel records are stored in a restricted secure location. This console records their existence and review status only.',
      toolbarText: 'The secure file link should open the restricted folder or document location used for the live record.',
      fields: [
        { name: 'name', label: 'Name', placeholder: 'Alan Gallagher' },
        { name: 'role', label: 'Role', placeholder: 'Principal, admin support, delivery assistant' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Placeholder', 'Pipeline'] },
        { name: 'identityCheck', label: 'Identity check', type: 'select', options: ['Verified', 'Required before start', 'Not needed yet'] },
        { name: 'roleProfile', label: 'Role profile status', placeholder: 'Current, draft, not started' },
        { name: 'trainingLog', label: 'Training log status', placeholder: 'Current, not started' },
        { name: 'equipmentIssued', label: 'Equipment issued status', placeholder: 'Business laptop, none issued' },
        { name: 'workingPattern', label: 'Working pattern note', placeholder: 'Standard week, ad hoc support, tbc' },
        { name: 'supportRecord', label: 'Support record status', placeholder: 'Restricted file only, not created yet' },
        { name: 'startDate', label: 'Start date', type: 'date' },
        { name: 'nextReview', label: 'Next review', type: 'date' },
        { name: 'secureFileLink', label: 'Secure file link', type: 'url', placeholder: 'Restricted OneDrive folder or document' }
      ],
      columns: [
        { name: 'name', label: 'Name' },
        { name: 'role', label: 'Role' },
        { name: 'status', label: 'Status' },
        { name: 'identityCheck', label: 'Identity Check' },
        { name: 'roleProfile', label: 'Role Profile' },
        { name: 'trainingLog', label: 'Training Log' },
        { name: 'equipmentIssued', label: 'Equipment Issued' },
        { name: 'workingPattern', label: 'Working Pattern Note' },
        { name: 'supportRecord', label: 'Support Record Status' },
        { name: 'startDate', label: 'Start Date', type: 'date' },
        { name: 'nextReview', label: 'Next Review', type: 'date' },
        { name: 'secureFileLink', label: 'Secure File Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), name: 'Alan Gallagher', role: 'Principal', status: 'Active', identityCheck: 'Verified', roleProfile: 'Current', trainingLog: 'Current', equipmentIssued: 'Business laptop and phone', workingPattern: 'Core business week recorded', supportRecord: 'Restricted file only', startDate: '2025-01-01', nextReview: '2026-06-30', secureFileLink: 'https://onedrive.live.com/' },
        { id: makeId(), name: 'Future admin support', role: 'Admin / operations support', status: 'Placeholder', identityCheck: 'Required before start', roleProfile: 'Draft', trainingLog: 'Not started', equipmentIssued: 'None issued', workingPattern: 'Part-time support, timing to be confirmed', supportRecord: 'Not created yet', startDate: '', nextReview: '2026-09-30', secureFileLink: 'https://onedrive.live.com/' },
        { id: makeId(), name: 'Future delivery assistant', role: 'Delivery support', status: 'Pipeline', identityCheck: 'Required before start', roleProfile: 'Not started', trainingLog: 'Not started', equipmentIssued: 'None issued', workingPattern: 'Project-led support if needed', supportRecord: 'Not created yet', startDate: '', nextReview: '2026-12-15', secureFileLink: 'https://onedrive.live.com/' }
      ]
    });

    renderTableSheet('financeIncomeExpense', {
      key: 'finance-ledger',
      eyebrow: 'Income & Expense Register',
      title: 'Working money ledger',
      description: 'Record the actual inflows and outflows that matter. Owner Contribution stays visible here but separate from true client-earned revenue.',
      toolbarText: 'Open the entry card only when adding or correcting a ledger line. Export when you need a clean handover or backup.',
      fields: [
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'description', label: 'Description', placeholder: 'Monthly business funding, Microsoft 365, client payment' },
        { name: 'sourceSupplier', label: 'Source / supplier', placeholder: 'Client, provider, or owner funding source' },
        { name: 'sourceType', label: 'Source type', type: 'select', options: ['Client', 'Owner Contribution', 'Grant / Support', 'Refund', 'Other'] },
        { name: 'income', label: 'Income', type: 'currency', placeholder: '0.00' },
        { name: 'expense', label: 'Expense', type: 'currency', placeholder: '0.00' },
        { name: 'category', label: 'Category', type: 'select', options: ['Owner Contribution', 'Website Build', 'Maintenance', 'Advisory', 'Software', 'Hosting', 'Domain', 'Infrastructure', 'Insurance', 'Admin', 'Equipment', 'Tax', 'Other'] },
        { name: 'link', label: 'Link / evidence', type: 'url', placeholder: 'Invoice, receipt, folder path' },
        { name: 'notes', label: 'Notes', placeholder: 'Anything useful to remember', className: 'planner-field-wide' }
      ],
      columns: [
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'description', label: 'Description' },
        { name: 'sourceSupplier', label: 'Source / Supplier' },
        { name: 'sourceType', label: 'Source Type' },
        { name: 'income', label: 'Income', type: 'currency' },
        { name: 'expense', label: 'Expense', type: 'currency' },
        { name: 'category', label: 'Category' },
        { name: 'link', label: 'Link / Evidence', type: 'link' },
        { name: 'notes', label: 'Notes' }
      ],
      seed: [
        { id: makeId(), date: '2026-03-09', description: 'Domain renewal', sourceSupplier: 'Namecheap', sourceType: 'Other', income: '', expense: '14.00', category: 'Domain', link: 'playtrix-focus.html?topic=asset-register', notes: 'Annual renewal for main business domain.' },
        { id: makeId(), date: '2026-03-07', description: 'Hosting renewal', sourceSupplier: 'Krystal', sourceType: 'Other', income: '', expense: '18.00', category: 'Hosting', link: 'playtrix-focus.html?topic=asset-register', notes: 'Monthly hosting for public site and working demos.' },
        { id: makeId(), date: '2026-03-05', description: 'Parish refresh payment', sourceSupplier: 'St Anselm by the Sea', sourceType: 'Client', income: '900.00', expense: '', category: 'Website Build', link: 'playtrix-focus.html?topic=invoice-tracker', notes: 'Payment received against invoice INV-2026-001.' },
        { id: makeId(), date: '2026-03-04', description: 'Broadband share', sourceSupplier: 'BT', sourceType: 'Other', income: '', expense: '24.00', category: 'Infrastructure', link: 'https://onedrive.live.com/', notes: 'Business-use share of broadband cost.' },
        { id: makeId(), date: '2026-03-03', description: 'ChatGPT subscription', sourceSupplier: 'OpenAI', sourceType: 'Other', income: '', expense: '20.00', category: 'Software', link: 'https://onedrive.live.com/', notes: 'Operational writing and planning support.' },
        { id: makeId(), date: '2026-03-02', description: 'Microsoft 365', sourceSupplier: 'Microsoft', sourceType: 'Other', income: '', expense: '12.99', category: 'Software', link: 'https://onedrive.live.com/', notes: 'Core email, documents, and admin stack.' },
        { id: makeId(), date: '2026-03-01', description: 'Monthly business funding', sourceSupplier: 'Alan Gallagher', sourceType: 'Owner Contribution', income: '450.00', expense: '', category: 'Owner Contribution', link: 'https://onedrive.live.com/', notes: 'Personal top-up to cover early-stage operating costs.' },
        { id: makeId(), date: '2026-02-19', description: 'Cloud storage', sourceSupplier: 'OneDrive', sourceType: 'Other', income: '', expense: '7.99', category: 'Software', link: 'https://onedrive.live.com/', notes: 'Restricted storage for business files.' },
        { id: makeId(), date: '2026-02-12', description: 'Insurance payment', sourceSupplier: 'Hiscox', sourceType: 'Other', income: '', expense: '26.00', category: 'Insurance', link: 'https://onedrive.live.com/', notes: 'Monthly business insurance premium.' },
        { id: makeId(), date: '2026-02-11', description: 'Portfolio support payment', sourceSupplier: 'Local parish contact', sourceType: 'Client', income: '150.00', expense: '', category: 'Advisory', link: 'playtrix-console.html#clients', notes: 'Small support fee for content and advice.' },
        { id: makeId(), date: '2026-02-01', description: 'Early-stage business funding', sourceSupplier: 'Alan Gallagher', sourceType: 'Owner Contribution', income: '200.00', expense: '', category: 'Owner Contribution', link: 'https://onedrive.live.com/', notes: 'Initial owner support to cover software and hosting.' }
      ]
    });

    renderTableSheet('financeInvoiceTracker', {
      key: 'finance-invoices',
      eyebrow: 'Invoice Tracker',
      title: 'Issued invoices and payment status',
      description: 'Track what has been invoiced, what is still due, and what needs chasing. Keep it clean enough to export quickly.',
      toolbarText: 'Open the entry card when a real invoice is issued or its status changes.',
      fields: [
        { name: 'invoiceNumber', label: 'Invoice number', placeholder: 'INV-2026-001' },
        { name: 'client', label: 'Client', placeholder: 'St Anselm by the Sea' },
        { name: 'projectService', label: 'Project / service', placeholder: 'Homepage revision, maintenance, advisory' },
        { name: 'amount', label: 'Amount', type: 'currency', placeholder: '0.00' },
        { name: 'issuedDate', label: 'Issued date', type: 'date' },
        { name: 'dueDate', label: 'Due date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Due', 'Overdue', 'Paid', 'Cancelled'] },
        { name: 'paidDate', label: 'Paid date', type: 'date' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Invoice PDF or folder path' }
      ],
      columns: [
        { name: 'invoiceNumber', label: 'Invoice Number' },
        { name: 'client', label: 'Client' },
        { name: 'projectService', label: 'Project / Service' },
        { name: 'amount', label: 'Amount', type: 'currency' },
        { name: 'issuedDate', label: 'Issued Date', type: 'date' },
        { name: 'dueDate', label: 'Due Date', type: 'date' },
        { name: 'status', label: 'Status' },
        { name: 'paidDate', label: 'Paid Date', type: 'date' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      afterDraw: function (context) {
        const model = buildFinanceConsoleModel(new Date());
        insertFinanceRegisterSummary(context.container, [
          { label: 'Total outstanding', value: formatCurrency(model.outstandingInvoicesTotal), note: 'Invoices marked sent, due, or overdue.' },
          { label: 'Total overdue', value: formatCurrency(model.overdueInvoicesTotal), note: 'Invoices already past the due date.' },
          { label: 'Paid this month', value: formatCurrency(model.paidThisMonthTotal), note: 'Invoices marked paid in the current month.' }
        ]);
      },
      seed: [
        { id: makeId(), invoiceNumber: 'INV-2026-004', client: 'Charity enquiry', projectService: 'Microsite deposit', amount: '480.00', issuedDate: '2026-03-06', dueDate: '2026-03-20', status: 'Due', paidDate: '', link: 'https://onedrive.live.com/' },
        { id: makeId(), invoiceNumber: 'INV-2026-003', client: 'Waylight Atlantic enquiry', projectService: 'Advisory scoping session', amount: '240.00', issuedDate: '2026-02-18', dueDate: '2026-03-01', status: 'Overdue', paidDate: '', link: 'https://onedrive.live.com/' },
        { id: makeId(), invoiceNumber: 'INV-2026-002', client: 'Parish refresh', projectService: 'March maintenance', amount: '180.00', issuedDate: '2026-03-01', dueDate: '2026-03-15', status: 'Sent', paidDate: '', link: 'https://onedrive.live.com/' },
        { id: makeId(), invoiceNumber: 'INV-2026-001', client: 'St Anselm by the Sea', projectService: 'Homepage revision', amount: '900.00', issuedDate: '2026-02-26', dueDate: '2026-03-12', status: 'Paid', paidDate: '2026-03-05', link: 'https://onedrive.live.com/' },
        { id: makeId(), invoiceNumber: 'INV-2026-005', client: 'Prospect follow-up', projectService: 'Proposal deposit', amount: '350.00', issuedDate: '', dueDate: '', status: 'Draft', paidDate: '', link: 'https://onedrive.live.com/' }
      ]
    });

    renderTableSheet('financeRecurringCosts', {
      key: 'finance-recurring',
      eyebrow: 'Recurring Cost Register',
      title: 'Repeating costs and renewals',
      description: 'Keep subscriptions, infrastructure, and renewal points visible so costs do not drift into the background.',
      toolbarText: 'Use one row per repeating cost or renewal obligation.',
      fields: [
        { name: 'service', label: 'Service', placeholder: 'Broadband share, Microsoft 365, hosting' },
        { name: 'provider', label: 'Provider', placeholder: 'BT, Microsoft, Krystal' },
        { name: 'cost', label: 'Cost', type: 'currency', placeholder: '0.00' },
        { name: 'frequency', label: 'Frequency', type: 'select', options: ['Weekly', 'Monthly', 'Quarterly', 'Annual'] },
        { name: 'renewalDate', label: 'Renewal date', type: 'date' },
        { name: 'category', label: 'Category', type: 'select', options: ['Software', 'Hosting', 'Domain', 'Infrastructure', 'Insurance', 'Admin', 'Other'] },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Invoice, subscription, or folder path' },
        { name: 'notes', label: 'Notes', placeholder: 'Anything useful to remember', className: 'planner-field-wide' }
      ],
      columns: [
        { name: 'service', label: 'Service' },
        { name: 'provider', label: 'Provider' },
        { name: 'cost', label: 'Cost', type: 'currency' },
        { name: 'frequency', label: 'Frequency' },
        { name: 'renewalDate', label: 'Renewal Date', type: 'date' },
        { name: 'category', label: 'Category' },
        { name: 'link', label: 'Link', type: 'link' },
        { name: 'notes', label: 'Notes' }
      ],
      seed: [
        { id: makeId(), service: 'Cloud storage', provider: 'OneDrive', cost: '7.99', frequency: 'Monthly', renewalDate: '2026-03-24', category: 'Software', link: 'https://onedrive.live.com/', notes: 'Restricted business storage and archive support.' },
        { id: makeId(), service: 'Insurance', provider: 'Hiscox', cost: '26.00', frequency: 'Monthly', renewalDate: '2026-03-28', category: 'Insurance', link: 'https://onedrive.live.com/', notes: 'Business insurance cover.' },
        { id: makeId(), service: 'Domain renewals', provider: 'Namecheap', cost: '14.00', frequency: 'Annual', renewalDate: '2026-05-02', category: 'Domain', link: 'playtrix-focus.html?topic=asset-register', notes: 'Main business domain and routing.' },
        { id: makeId(), service: 'Hosting', provider: 'Krystal', cost: '18.00', frequency: 'Monthly', renewalDate: '2026-03-21', category: 'Hosting', link: 'playtrix-focus.html?topic=asset-register', notes: 'Live site hosting.' },
        { id: makeId(), service: 'ChatGPT', provider: 'OpenAI', cost: '20.00', frequency: 'Monthly', renewalDate: '2026-03-16', category: 'Software', link: 'https://onedrive.live.com/', notes: 'Planning and drafting support.' },
        { id: makeId(), service: 'Microsoft 365', provider: 'Microsoft', cost: '12.99', frequency: 'Monthly', renewalDate: '2026-03-14', category: 'Software', link: 'https://onedrive.live.com/', notes: 'Email, office docs, and admin.' },
        { id: makeId(), service: 'Broadband share', provider: 'BT', cost: '24.00', frequency: 'Monthly', renewalDate: '2026-03-18', category: 'Infrastructure', link: 'https://onedrive.live.com/', notes: 'Business-use share of home broadband.' }
      ]
    });

    renderTableSheet('financeAssetRegister', {
      key: 'finance-assets',
      eyebrow: 'Asset Register',
      title: 'Durable business tools and replacement timing',
      description: 'This is a practical control record for important tools and likely replacement timing, not a depreciation engine.',
      toolbarText: 'Record the assets that would matter if they failed or needed replacement planning.',
      fields: [
        { name: 'asset', label: 'Asset', placeholder: 'Laptop, camera, phone' },
        { name: 'type', label: 'Type', placeholder: 'Device, storage, office equipment' },
        { name: 'purchaseDate', label: 'Purchase date', type: 'date' },
        { name: 'cost', label: 'Cost', type: 'currency', placeholder: '0.00' },
        { name: 'replacementDate', label: 'Replacement date', type: 'date' },
        { name: 'conditionStatus', label: 'Condition / status', placeholder: 'Good, watch, replace soon' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Receipt, warranty, or folder path' },
        { name: 'notes', label: 'Notes', placeholder: 'Anything useful to remember', className: 'planner-field-wide' }
      ],
      columns: [
        { name: 'asset', label: 'Asset' },
        { name: 'type', label: 'Type' },
        { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
        { name: 'cost', label: 'Cost', type: 'currency' },
        { name: 'replacementDate', label: 'Replacement Date', type: 'date' },
        { name: 'conditionStatus', label: 'Condition / Status' },
        { name: 'link', label: 'Link', type: 'link' },
        { name: 'notes', label: 'Notes' }
      ],
      seed: [
        { id: makeId(), asset: 'Laptop', type: 'Primary device', purchaseDate: '2024-11-18', cost: '1199.00', replacementDate: '2027-11-18', conditionStatus: 'Good', link: 'https://onedrive.live.com/', notes: 'Main build and admin machine.' },
        { id: makeId(), asset: 'External SSD', type: 'Backup storage', purchaseDate: '2025-04-08', cost: '109.00', replacementDate: '2028-04-08', conditionStatus: 'Good', link: 'https://onedrive.live.com/', notes: 'Used for local backup rotation.' },
        { id: makeId(), asset: 'Camera', type: 'Photo / content equipment', purchaseDate: '2023-07-12', cost: '540.00', replacementDate: '2027-07-12', conditionStatus: 'Watch', link: 'https://onedrive.live.com/', notes: 'Still fine, but battery replacement likely first.' },
        { id: makeId(), asset: 'Phone', type: 'Business comms', purchaseDate: '2024-02-02', cost: '399.00', replacementDate: '2027-02-02', conditionStatus: 'Good', link: 'https://onedrive.live.com/', notes: 'Used for calls, photos, and verification codes.' },
        { id: makeId(), asset: 'Office equipment', type: 'Workspace', purchaseDate: '2025-01-10', cost: '180.00', replacementDate: '2028-01-10', conditionStatus: 'Good', link: 'https://onedrive.live.com/', notes: 'Desk, chair adjustments, and working accessories.' }
      ]
    });

    renderTableSheet('financeClientRevenue', {
      key: 'finance-client-revenue',
      eyebrow: 'Client Revenue Register',
      title: 'Where earned client income comes from',
      description: 'This register is only for revenue earned from clients. Owner Contribution belongs in the ledger and forecasts, not here.',
      toolbarText: 'Keep one row per real client-earned revenue line.',
      fields: [
        { name: 'client', label: 'Client', placeholder: 'St Anselm by the Sea' },
        { name: 'projectService', label: 'Project / service', placeholder: 'Website build, maintenance, advisory' },
        { name: 'revenueType', label: 'Revenue type', type: 'select', options: ['Website Build', 'Maintenance', 'Advisory', 'One-off support', 'Retainer'] },
        { name: 'amount', label: 'Amount', type: 'currency', placeholder: '0.00' },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'year', label: 'Year', placeholder: '2026' },
        { name: 'notes', label: 'Notes', placeholder: 'Anything useful to remember', className: 'planner-field-wide' }
      ],
      columns: [
        { name: 'client', label: 'Client' },
        { name: 'projectService', label: 'Project / Service' },
        { name: 'revenueType', label: 'Revenue Type' },
        { name: 'amount', label: 'Amount', type: 'currency' },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'year', label: 'Year' },
        { name: 'notes', label: 'Notes' }
      ],
      seed: [
        { id: makeId(), client: 'St Anselm by the Sea', projectService: 'Homepage revision', revenueType: 'Website Build', amount: '900.00', date: '2026-03-05', year: '2026', notes: 'Payment received after approval of revised homepage work.' },
        { id: makeId(), client: 'Parish refresh', projectService: 'Monthly maintenance', revenueType: 'Maintenance', amount: '180.00', date: '2026-02-24', year: '2026', notes: 'Steady recurring support.' },
        { id: makeId(), client: 'Local parish contact', projectService: 'Content and support advice', revenueType: 'One-off support', amount: '150.00', date: '2026-02-11', year: '2026', notes: 'Small practical support engagement.' },
        { id: makeId(), client: 'Waylight Atlantic enquiry', projectService: 'Advisory scoping session', revenueType: 'Advisory', amount: '240.00', date: '2026-01-24', year: '2026', notes: 'Commercial scoping and offer-shaping session.' }
      ]
    });

    renderTableSheet('financePricing', {
      key: 'finance-pricing',
      eyebrow: 'Pricing',
      title: 'Service pricing and offer logic',
      description: 'Use this as the working pricing reference. It should explain the offer shape, not try to become a quoting engine.',
      toolbarText: 'Keep packages, rates, and exceptions plain enough to review quickly.',
      fields: [
        { name: 'service', label: 'Service', placeholder: 'Brochure site, maintenance, advisory' },
        { name: 'package', label: 'Package / rate', placeholder: 'Starter site, monthly maintenance, half-day advisory' },
        { name: 'price', label: 'Price', placeholder: '1250, 45 per month, 180' },
        { name: 'billing', label: 'Billing', placeholder: 'Fixed project, monthly, per session' },
        { name: 'included', label: 'What is included', placeholder: 'Pages, revisions, support window', className: 'planner-field-wide' },
        { name: 'notes', label: 'Notes', placeholder: 'Discount logic, free-site notes, exceptions', className: 'planner-field-wide' }
      ],
      columns: [
        { name: 'service', label: 'Service' },
        { name: 'package', label: 'Package / Rate' },
        { name: 'price', label: 'Price' },
        { name: 'billing', label: 'Billing' },
        { name: 'included', label: 'What Is Included' },
        { name: 'notes', label: 'Notes' }
      ],
      seed: [
        { id: makeId(), service: 'Small organisation website', package: 'Brochure site', price: 'From 1250', billing: 'Fixed project', included: 'Core pages, mobile layout, contact route, copy tidy-up, and launch support.', notes: 'Adjust upward if content wrangling or restructuring is heavy.' },
        { id: makeId(), service: 'Maintenance', package: 'Essential maintenance', price: '45 per month', billing: 'Monthly', included: 'Routine checks, small content amendments, uptime awareness, and practical support.', notes: 'Larger structural updates stay outside the maintenance scope.' },
        { id: makeId(), service: 'Advisory', package: 'Half-day advisory session', price: '180', billing: 'Per session', included: 'Review, recommendations, and practical next actions.', notes: 'Useful as a pre-project or post-handover support offer.' },
        { id: makeId(), service: 'Content support', package: 'Focused tidy-up', price: '90', billing: 'Per block', included: 'Small page tidy-up, wording refinement, and light asset handling.', notes: 'Use when the work is too large for maintenance but too small for a rebuild.' },
        { id: makeId(), service: 'Portfolio / free-site work', package: 'Selected free-site route', price: 'No fee', billing: 'By selection', included: 'Chosen demonstration or mission-aligned project with agreed limits.', notes: 'Only where the project has clear portfolio or strategic value.' }
      ]
    });

    renderTableSheet('financeForecasts', {
      key: 'finance-forecasts',
      eyebrow: 'Forecasts',
      title: 'Directional planning and cash thinking',
      description: 'Keep this lightweight. Forecasts are for directional planning, not formal financial modelling.',
      toolbarText: 'Review what is realistically expected this month rather than writing optimistic fiction.',
      fields: [
        { name: 'forecastItem', label: 'Forecast item', placeholder: 'Monthly target revenue, owner contribution expected this month' },
        { name: 'month', label: 'Month', type: 'date' },
        { name: 'value', label: 'Value', placeholder: '1500, 450, 3' },
        { name: 'type', label: 'Type', type: 'select', options: ['Revenue target', 'Maintenance revenue', 'Project revenue', 'Owner contribution', 'Funding gap', 'Client target count'] },
        { name: 'notes', label: 'Notes', placeholder: 'Anything useful to remember', className: 'planner-field-wide' }
      ],
      columns: [
        { name: 'forecastItem', label: 'Forecast Item' },
        { name: 'month', label: 'Month', type: 'date' },
        {
          name: 'value',
          label: 'Value',
          compute: function (row) {
            return row.type === 'Client target count' ? String(row.value || '') : formatCurrency(row.value);
          }
        },
        { name: 'type', label: 'Type' },
        { name: 'notes', label: 'Notes' }
      ],
      seed: [
        { id: makeId(), forecastItem: 'Monthly target revenue', month: '2026-03-01', value: '1500', type: 'Revenue target', notes: 'Enough to cover live costs and sustain steady project work.' },
        { id: makeId(), forecastItem: 'Expected maintenance revenue', month: '2026-03-01', value: '180', type: 'Maintenance revenue', notes: 'Current live maintenance line already in motion.' },
        { id: makeId(), forecastItem: 'Expected project revenue', month: '2026-03-01', value: '900', type: 'Project revenue', notes: 'Anchored to the live parish homepage revision.' },
        { id: makeId(), forecastItem: 'Owner contribution expected this month', month: '2026-03-01', value: '450', type: 'Owner contribution', notes: 'Personal support still needed while revenue base is building.' },
        { id: makeId(), forecastItem: 'Cash need / funding gap', month: '2026-03-01', value: '300', type: 'Funding gap', notes: 'Gap if one expected payment slips into next month.' },
        { id: makeId(), forecastItem: 'Client target count', month: '2026-03-01', value: '3', type: 'Client target count', notes: 'Target number of active client relationships to hold this month.' }
      ]
    });

    renderTableSheet('financeReserves', {
      key: 'finance-reserves',
      eyebrow: 'Reserves',
      title: 'Reserve targets and gaps',
      description: 'This is disciplined visibility, not treasury theatre. Track the reserve categories that actually protect the business.',
      toolbarText: 'Keep the target, the current amount, and the gap visible together.',
      fields: [
        { name: 'category', label: 'Category', type: 'select', options: ['Operating reserve', 'Emergency reserve', 'Tax reserve', 'Equipment replacement reserve'] },
        { name: 'target', label: 'Target', type: 'currency', placeholder: '0.00' },
        { name: 'currentAmount', label: 'Current amount', type: 'currency', placeholder: '0.00' },
        { name: 'notes', label: 'Notes', placeholder: 'Anything useful to remember', className: 'planner-field-wide' }
      ],
      columns: [
        { name: 'category', label: 'Category' },
        { name: 'target', label: 'Target', type: 'currency' },
        { name: 'currentAmount', label: 'Current Amount', type: 'currency' },
        {
          name: 'gap',
          label: 'Gap',
          compute: function (row) {
            return formatCurrency(Math.max(0, parseMoney(row.target) - parseMoney(row.currentAmount)));
          }
        },
        { name: 'notes', label: 'Notes' }
      ],
      afterDraw: function (context) {
        const model = buildFinanceConsoleModel(new Date());
        insertFinanceRegisterSummary(context.container, [
          { label: 'Tax reserve gap', value: formatCurrency(model.taxReserve.gapValue), note: 'Still needed to reach the current tax set-aside target.' },
          { label: 'Emergency reserve gap', value: formatCurrency(model.emergencyReserve.gapValue), note: 'Shortfall against the contingency buffer target.' },
          { label: 'Equipment reserve gap', value: formatCurrency(model.equipmentReserve.gapValue), note: 'Shortfall against planned hardware replacement cover.' }
        ]);
      },
      seed: [
        { id: makeId(), category: 'Operating reserve', target: '1500.00', currentAmount: '600.00', notes: 'Aim for roughly one month of baseline operating costs.' },
        { id: makeId(), category: 'Emergency reserve', target: '1000.00', currentAmount: '350.00', notes: 'Buffer for quiet periods or short-term disruption.' },
        { id: makeId(), category: 'Tax reserve', target: '900.00', currentAmount: '280.00', notes: 'Set aside steadily rather than leaving a single large payment shock.' },
        { id: makeId(), category: 'Equipment replacement reserve', target: '750.00', currentAmount: '120.00', notes: 'Helps absorb laptop, phone, or storage replacement costs.' }
      ]
    });

    renderTableSheet('financeReportingRegister', {
      key: 'finance-reporting',
      eyebrow: 'Reporting Calendar',
      title: 'Tax, reporting, and record-keeping actions',
      description: 'Keep the reporting rhythm visible so nothing important is left to memory.',
      toolbarText: 'Use one row per real finance-admin control point.',
      fields: [
        { name: 'area', label: 'Area', placeholder: 'Self Assessment, VAT threshold check' },
        { name: 'nextDate', label: 'Next date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Waiting', 'Done'] },
        { name: 'note', label: 'Note', placeholder: 'What needs doing next?', className: 'planner-field-wide' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Official source or folder path' }
      ],
      columns: [
        { name: 'area', label: 'Area' },
        { name: 'nextDate', label: 'Next Date', type: 'date' },
        { name: 'status', label: 'Status' },
        { name: 'note', label: 'Note' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), area: 'Self Assessment return and payment', nextDate: '2027-01-31', status: 'Open', note: 'Keep income, expenses, owner contribution lines, and payment evidence ready for the year-end return.', link: 'https://www.gov.uk/self-assessment-tax-returns/deadlines' },
        { id: makeId(), area: 'Monthly record-keeping review', nextDate: '2026-03-31', status: 'Open', note: 'Export the ledger, check links to receipts, and make sure March invoices and expenses are complete.', link: 'https://www.gov.uk/self-employed-records' },
        { id: makeId(), area: 'Allowable expenses check', nextDate: '2026-04-05', status: 'Waiting', note: 'Review broadband share, software, hosting, domain, and equipment purchases against current HMRC guidance.', link: 'https://www.gov.uk/expenses-if-youre-self-employed' },
        { id: makeId(), area: 'VAT threshold check', nextDate: '2026-06-30', status: 'Waiting', note: 'Not registered yet. Recheck turnover and whether voluntary registration would help or complicate the model.', link: 'https://www.gov.uk/vat-registration' },
        { id: makeId(), area: 'Making Tax Digital readiness check', nextDate: '2026-12-01', status: 'Waiting', note: 'Check whether the current turnover and timetable make Income Tax digital reporting relevant for the next cycle.', link: 'https://www.gov.uk/guidance/sign-up-your-business-for-making-tax-digital-for-income-tax' },
        { id: makeId(), area: 'Support / benefit reporting note', nextDate: '2026-05-15', status: 'Done', note: 'No live support claim to report at present, but keep the official route noted if circumstances change.', link: 'https://www.gov.uk/self-employment-and-universal-credit' }
      ]
    });

    renderSupportLinks('financeSupportLinks', 'HMRC and finance support', 'Keep the official routes close when money, tax, and reporting questions need a real source.', financeSupportLinks);

    renderTableSheet('assetWebsites', {
      key: 'asset-websites',
      eyebrow: 'Properties',
      title: 'Website and property register',
      description: 'List every public-facing site or digital property the business owns or runs.',
      fields: [
        { name: 'property', label: 'Property', placeholder: 'Waylight Atlantic' },
        { name: 'purpose', label: 'Purpose', placeholder: 'Public business site, profile, client site' },
        { name: 'status', label: 'Status', type: 'select', options: ['Owned', 'Managed', 'Archive'] },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Site URL or admin link' }
      ],
      columns: [
        { name: 'property', label: 'Property' },
        { name: 'purpose', label: 'Purpose' },
        { name: 'status', label: 'Status' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), property: 'Waylight Atlantic', purpose: 'Main public business site', status: 'Owned', link: 'https://www.waylight-atlantic.co.uk' },
        { id: makeId(), property: 'AlanWP Gallagher', purpose: 'Personal public profile and writing', status: 'Owned', link: 'https://www.alanwpgallagher.info' }
      ]
    });

    renderTableSheet('assetFolders', {
      key: 'asset-folders',
      eyebrow: 'Working folders',
      title: 'Working folder structure',
      description: 'Link the live folders that back the business and keep their purpose visible.',
      fields: [
        { name: 'folder', label: 'Folder', placeholder: '01 Waylight Business' },
        { name: 'area', label: 'Area', placeholder: 'Business, learning, templates' },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'OneDrive or local path' },
        { name: 'note', label: 'Note', placeholder: 'What lives here?' }
      ],
      columns: [
        { name: 'folder', label: 'Folder' },
        { name: 'area', label: 'Area' },
        { name: 'note', label: 'Purpose' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), folder: '00 Archive', area: 'Archive', link: '', note: 'Closed work, superseded records, and historical material.' },
        { id: makeId(), folder: '01 Waylight Business', area: 'Business', link: '', note: 'Core operating files, governance, finance, and active business material.' },
        { id: makeId(), folder: '02 Waylight Alms', area: 'Mission', link: '', note: 'Almsgiving, free-site, and charitable work.' },
        { id: makeId(), folder: '03 Waylight Foundation Websites', area: 'Delivery', link: '', note: 'Live builds and foundation website work.' },
        { id: makeId(), folder: '04 Learning and Development', area: 'Growth', link: '', note: 'Study, formation, technical learning, and capability building.' },
        { id: makeId(), folder: '05 Templates', area: 'Templates', link: '', note: 'Reusable documents, questionnaires, contracts, and layout patterns.' }
      ]
    });

    renderTableSheet('assetInventory', {
      key: 'asset-inventory',
      eyebrow: 'Inventory',
      title: 'Software, hardware, and materials',
      description: 'Track the tools and objects the business depends on.',
      fields: [
        { name: 'item', label: 'Item', placeholder: 'Laptop, domain renewal, notebook stock' },
        { name: 'type', label: 'Type', type: 'select', options: ['Software', 'Hardware', 'Stationery', 'Subscription', 'Other'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Needs review', 'Replace soon', 'Archive'] },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Supplier or record link' }
      ],
      columns: [
        { name: 'item', label: 'Item' },
        { name: 'type', label: 'Type' },
        { name: 'status', label: 'Status' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), item: 'Primary workstation', type: 'Hardware', status: 'Active', link: '' },
        { id: makeId(), item: 'OneDrive and Microsoft 365', type: 'Software', status: 'Active', link: '' },
        { id: makeId(), item: 'Domain renewals', type: 'Subscription', status: 'Needs review', link: '' }
      ]
    });

    renderTableSheet('documentRegister', {
      key: 'documents',
      eyebrow: 'Document Control',
      title: 'Questionnaires, contracts, and business documents',
      description: 'A simple register of core business documents, their status, and where they live.',
      fields: [
        { name: 'document', label: 'Document', placeholder: 'Proposal terms, onboarding questionnaire' },
        { name: 'area', label: 'Area', type: 'select', options: ['Client', 'Governance', 'Finance', 'SOP', 'Internal'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Active', 'Needs review', 'Archived'] },
        { name: 'link', label: 'Link', type: 'url', placeholder: 'Optional URL or path' }
      ],
      columns: [
        { name: 'document', label: 'Document' },
        { name: 'area', label: 'Area' },
        { name: 'status', label: 'Status' },
        { name: 'link', label: 'Link', type: 'link' }
      ],
      seed: [
        { id: makeId(), document: 'Client discovery questionnaire', area: 'Client', status: 'Draft', link: '' },
        { id: makeId(), document: 'Website build SOP', area: 'SOP', status: 'Draft', link: '' },
        { id: makeId(), document: 'Maintenance agreement', area: 'Client', status: 'Draft', link: '' }
      ]
    });

    renderSupportLinks('documentSupport', 'Business references', 'Keep authoritative support close to the documents and processes they affect.', supportLinks);
    renderDeskSignals();
    applyRegisteredScrollCaps(document);
    window.addEventListener('playtrix:boardchange', renderDeskSignals);
    window.setInterval(refreshClockPanels, 30000);
  });

  window.addEventListener('playtrix:page-change', function () {
    window.setTimeout(function () {
      applyRegisteredScrollCaps(document);
    }, 80);
  });

  window.addEventListener('resize', function () {
    window.setTimeout(function () {
      applyRegisteredScrollCaps(document);
    }, 80);
  });

  window.PlaytrixOrganiser = Object.assign({}, window.PlaytrixOrganiser, {
    renderDeskSignals: renderDeskSignals,
    refreshClockPanels: refreshClockPanels
  });
})();
