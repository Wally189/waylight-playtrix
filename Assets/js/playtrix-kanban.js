(function () {
  const boardRoot = document.getElementById('kanbanBoard');
  if (!boardRoot) return;

  const storageKey = 'playtrix.kanban.board';
  const backupKey = 'playtrix.kanban.board.backup';
  const columns = [
    { id: 'inbox', label: 'Inbox', hint: 'Capture first. Decide later.' },
    { id: 'today', label: 'Today', hint: 'Only what must move now.' },
    { id: 'this-week', label: 'This Week', hint: 'Important, but not all at once.' },
    { id: 'waiting', label: 'Waiting', hint: 'Held by other people or dates.' },
    { id: 'done', label: 'Done', hint: 'Closed properly.' }
  ];

  const summaryRoot = document.getElementById('kanbanSummary');
  const form = document.getElementById('kanbanForm');
  const resetButton = document.getElementById('kanbanFormReset');
  const titleInput = document.getElementById('kanbanTitle');
  const noteInput = document.getElementById('kanbanNote');
  const categoryInput = document.getElementById('kanbanCategory');
  const dueDateInput = document.getElementById('kanbanDueDate');
  const priorityInput = document.getElementById('kanbanPriority');
  const columnInput = document.getElementById('kanbanColumn');
  const idInput = document.getElementById('kanbanCardId');

  let draggedCardId = null;
  let board = loadBoard();

  function seedCards() {
    const now = new Date().toISOString();
    return [
      { id: makeId(), title: 'Review open enquiries', note: 'Decide the next action for each live lead.', category: 'Sales', dueDate: '', priority: 'important', column: 'today', createdAt: now, updatedAt: now },
      { id: makeId(), title: 'Tidy the maintenance checklist', note: 'Remove friction before the next review round.', category: 'Governance', dueDate: '', priority: 'steady', column: 'this-week', createdAt: now, updatedAt: now },
      { id: makeId(), title: 'Await client content pack', note: 'Parish refresh is blocked until the content owner replies.', category: 'Client', dueDate: '', priority: 'steady', column: 'waiting', createdAt: now, updatedAt: now }
    ];
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'kb-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function loadBoard() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return { version: 1, cards: seedCards() };
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { version: 1, cards: parsed };
      }
      if (parsed && Array.isArray(parsed.cards)) {
        return { version: 1, cards: parsed.cards };
      }
    } catch {
      // Ignore and fall through to defaults.
    }
    return { version: 1, cards: seedCards() };
  }

  function saveBoard() {
    const current = localStorage.getItem(storageKey);
    if (current) {
      localStorage.setItem(backupKey, current);
    }
    localStorage.setItem(storageKey, JSON.stringify(board));
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function countFor(columnId) {
    return board.cards.filter((card) => card.column === columnId).length;
  }

  function renderSummary() {
    if (!summaryRoot) return;
    const total = board.cards.length;
    const today = countFor('today');
    const waiting = countFor('waiting');
    const done = countFor('done');
    summaryRoot.innerHTML = [
      { label: 'Total cards', value: total },
      { label: 'Today', value: today },
      { label: 'Waiting', value: waiting },
      { label: 'Done', value: done }
    ].map((item) => '<div class="kanban-summary-card"><span>' + item.label + '</span><strong>' + item.value + '</strong></div>').join('');
  }

  function renderBoard() {
    boardRoot.innerHTML = columns.map((column) => {
      const cards = board.cards.filter((card) => card.column === column.id);
      const cardsHtml = cards.length ? cards.map(renderCard).join('') : '<p class="wl-kanban-empty">No cards here.</p>';
      return [
        '<section class="wl-kanban-column" data-column="' + column.id + '">',
        '  <div class="wl-kanban-column-header">',
        '    <div>',
        '      <h3>' + column.label + '</h3>',
        '      <p class="muted">' + column.hint + '</p>',
        '    </div>',
        '    <div class="wl-kanban-column-meta">',
        '      <span class="wl-kanban-count">' + cards.length + '</span>',
        '      <button type="button" class="wl-kanban-column-add" data-column-add="' + column.id + '" aria-label="Add a card to ' + column.label + '">+</button>',
        '    </div>',
        '  </div>',
        '  <div class="wl-kanban-column-cards">',
             cardsHtml,
        '  </div>',
        '</section>'
      ].join('');
    }).join('');

    boardRoot.querySelectorAll('.wl-kanban-card').forEach((card) => {
      card.addEventListener('dragstart', onDragStart);
      card.addEventListener('dragend', onDragEnd);
      card.addEventListener('keydown', onCardKeyDown);
    });

    boardRoot.querySelectorAll('.wl-kanban-column').forEach((column) => {
      column.addEventListener('dragover', onColumnDragOver);
      column.addEventListener('dragleave', onColumnDragLeave);
      column.addEventListener('drop', onColumnDrop);
    });

    renderSummary();
  }

  function renderCard(card) {
    const note = card.note ? '<p class="wl-kanban-card-note">' + escapeHtml(card.note) + '</p>' : '';
    const category = card.category ? '<span class="wl-kanban-tag">' + escapeHtml(card.category) + '</span>' : '';
    const date = card.dueDate ? '<span class="wl-kanban-date">Due ' + escapeHtml(formatDate(card.dueDate)) + '</span>' : '';
    return [
      '<article class="wl-kanban-card" draggable="true" tabindex="0" data-card-id="' + card.id + '">',
      '  <div class="wl-kanban-card-top">',
      '    <h4 class="wl-kanban-card-title">' + escapeHtml(card.title) + '</h4>',
      '    <span class="wl-kanban-priority" data-priority="' + escapeHtml(card.priority) + '">' + escapeHtml(card.priority) + '</span>',
      '  </div>',
           note,
      '  <div class="wl-kanban-card-meta">',
      '    <div class="wl-kanban-card-meta-left">',
             category,
             date,
      '    </div>',
      '  </div>',
      '  <div class="wl-kanban-card-actions">',
      '    <button type="button" data-action="edit" data-card-id="' + card.id + '">Edit</button>',
      '    <button type="button" data-action="delete" data-card-id="' + card.id + '">Delete</button>',
      '  </div>',
      '</article>'
    ].join('');
  }

  function findCard(cardId) {
    return board.cards.find((card) => card.id === cardId);
  }

  function onDragStart(event) {
    const card = event.currentTarget;
    draggedCardId = card.dataset.cardId;
    card.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedCardId);
    }
  }

  function onDragEnd(event) {
    event.currentTarget.classList.remove('is-dragging');
    boardRoot.querySelectorAll('.wl-kanban-column').forEach((column) => column.classList.remove('is-drop-target'));
  }

  function onColumnDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('is-drop-target');
  }

  function onColumnDragLeave(event) {
    event.currentTarget.classList.remove('is-drop-target');
  }

  function onColumnDrop(event) {
    event.preventDefault();
    const column = event.currentTarget;
    column.classList.remove('is-drop-target');
    const targetColumn = column.dataset.column;
    const cardId = draggedCardId || (event.dataTransfer ? event.dataTransfer.getData('text/plain') : '');
    moveCard(cardId, targetColumn);
    draggedCardId = null;
  }

  function moveCard(cardId, columnId) {
    const card = findCard(cardId);
    if (!card || !columnId || card.column === columnId) return;
    card.column = columnId;
    card.updatedAt = new Date().toISOString();
    saveBoard();
    renderBoard();
  }

  function fillForm(card) {
    idInput.value = card.id || '';
    titleInput.value = card.title || '';
    noteInput.value = card.note || '';
    categoryInput.value = card.category || '';
    dueDateInput.value = card.dueDate || '';
    priorityInput.value = card.priority || 'steady';
    columnInput.value = card.column || 'inbox';
    titleInput.focus();
  }

  function clearForm(columnId) {
    form.reset();
    idInput.value = '';
    priorityInput.value = 'steady';
    columnInput.value = columnId || 'inbox';
  }

  function onCardKeyDown(event) {
    const cardId = event.currentTarget.dataset.cardId;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const card = findCard(cardId);
      if (card) fillForm(card);
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      removeCard(cardId);
    }
  }

  function removeCard(cardId) {
    const card = findCard(cardId);
    if (!card) return;
    if (!window.confirm('Delete this card?')) return;
    board.cards = board.cards.filter((item) => item.id !== cardId);
    saveBoard();
    renderBoard();
    if (idInput.value === cardId) clearForm();
  }

  boardRoot.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const cardId = actionButton.dataset.cardId;
      if (actionButton.dataset.action === 'edit') {
        const card = findCard(cardId);
        if (card) fillForm(card);
      }
      if (actionButton.dataset.action === 'delete') {
        removeCard(cardId);
      }
      return;
    }

    const addButton = event.target.closest('[data-column-add]');
    if (addButton) {
      clearForm(addButton.dataset.columnAdd);
      titleInput.focus();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const now = new Date().toISOString();
    const payload = {
      title: title,
      note: noteInput.value.trim(),
      category: categoryInput.value.trim(),
      dueDate: dueDateInput.value,
      priority: priorityInput.value,
      column: columnInput.value,
      updatedAt: now
    };

    if (idInput.value) {
      const card = findCard(idInput.value);
      if (card) {
        Object.assign(card, payload);
      }
    } else {
      board.cards.unshift(Object.assign({ id: makeId(), createdAt: now }, payload));
    }

    saveBoard();
    renderBoard();
    clearForm(columnInput.value);
  });

  resetButton.addEventListener('click', function () {
    clearForm();
  });

  clearForm('inbox');
  saveBoard();
  renderBoard();
})();
