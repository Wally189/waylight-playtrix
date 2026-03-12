(function () {
  const Storage = window.PlaytrixStorage;
  const boardRoot = document.getElementById('kanbanBoard');
  if (!boardRoot) return;

  const storageKey = 'playtrix.kanban.board';
  const backupKey = 'playtrix.kanban.board.backup';
  const columns = [
    { id: 'inbox', label: 'Inbox', hint: 'Capture first. Decide later.' },
    { id: 'today', label: 'Do Today', hint: 'Only what must move now.' },
    { id: 'this-week', label: 'Do This Week', hint: 'Important, but not all at once.' },
    { id: 'this-month', label: 'Do This Month', hint: 'Keep it visible without crowding the week.' },
    { id: 'pending', label: 'Pending', hint: 'Held by other people, dates, or dependencies.' },
    { id: 'done', label: 'Done', hint: 'Closed properly.' }
  ];

  const summaryRoot = document.getElementById('kanbanSummary');
  const form = document.getElementById('kanbanForm');
  const resetButton = document.getElementById('kanbanFormReset');
  const editorCard = document.getElementById('kanbanEditorCard');
  const editorToggle = document.getElementById('kanbanEditorToggle');
  const editorStateTitle = document.getElementById('kanbanEditorStateTitle');
  const editorStateText = document.getElementById('kanbanEditorStateText');
  const titleInput = document.getElementById('kanbanTitle');
  const noteInput = document.getElementById('kanbanNote');
  const categoryInput = document.getElementById('kanbanCategory');
  const dueDateInput = document.getElementById('kanbanDueDate');
  const priorityInput = document.getElementById('kanbanPriority');
  const columnInput = document.getElementById('kanbanColumn');
  const idInput = document.getElementById('kanbanCardId');

  let draggedCardId = null;
  let editorOpen = false;
  let board = loadBoard();

  function seedCards() {
    const now = new Date().toISOString();
    return [
      { id: makeId(), title: 'Review open enquiries', note: 'Decide the next action for each live lead.', category: 'Sales', dueDate: '', priority: 'important', column: 'today', createdAt: now, updatedAt: now },
      { id: makeId(), title: 'Tidy the maintenance checklist', note: 'Remove friction before the next review round.', category: 'Governance', dueDate: '', priority: 'steady', column: 'this-week', createdAt: now, updatedAt: now },
      { id: makeId(), title: 'Await client content pack', note: 'Parish refresh is blocked until the content owner replies.', category: 'Client', dueDate: '', priority: 'steady', column: 'pending', createdAt: now, updatedAt: now }
    ];
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'kb-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function loadBoard() {
    const fallback = { version: 1, cards: seedCards() };
    if (Storage) {
      const parsed = Storage.readJson(storageKey, fallback);
      if (Array.isArray(parsed)) return migrateBoard({ version: 1, cards: parsed });
      if (parsed && Array.isArray(parsed.cards)) return migrateBoard({ version: 1, cards: parsed.cards });
      return fallback;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return migrateBoard({ version: 1, cards: parsed });
      if (parsed && Array.isArray(parsed.cards)) return migrateBoard({ version: 1, cards: parsed.cards });
    } catch {
      // Ignore and fall through to defaults.
    }
    return fallback;
  }

  function migrateBoard(inputBoard) {
    const validColumns = new Set(columns.map(function (column) { return column.id; }));
    const migrated = {
      version: 2,
      cards: (inputBoard.cards || []).map(function (card) {
        const next = Object.assign({}, card);
        if (next.column === 'waiting') next.column = 'pending';
        if (!validColumns.has(next.column)) next.column = 'inbox';
        return next;
      })
    };
    return migrated;
  }

  function saveBoard() {
    const current = localStorage.getItem(storageKey);
    if (current && Storage) {
      Storage.writeText(backupKey, current);
    } else if (current) {
      localStorage.setItem(backupKey, current);
    }
    if (Storage) {
      Storage.writeJson(storageKey, board);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(board));
    }
    window.dispatchEvent(new Event('playtrix:boardchange'));
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
    const summaryItems = [
      { label: 'Inbox', value: countFor('inbox') },
      { label: 'Do Today', value: countFor('today') },
      { label: 'Do This Week', value: countFor('this-week') },
      { label: 'Do This Month', value: countFor('this-month') },
      { label: 'Pending', value: countFor('pending') },
      { label: 'Done', value: countFor('done') }
    ];
    summaryRoot.innerHTML = [
      summaryItems.map((item) => '<div class="kanban-summary-card"><span>' + item.label + '</span><strong>' + item.value + '</strong></div>').join('')
    ].join('');
  }

  function getColumnLabel(columnId) {
    const column = columns.find((item) => item.id === columnId);
    return column ? column.label : 'Inbox';
  }

  function syncEditorState(mode) {
    if (editorCard) {
      editorCard.hidden = !editorOpen;
    }
    if (editorToggle) {
      editorToggle.textContent = editorOpen ? 'Hide work card' : 'Open work card';
    }
    if (!editorStateTitle || !editorStateText) return;
    if (!editorOpen) {
      editorStateTitle.textContent = 'Add a work item when you are ready';
      editorStateText.textContent = 'Keep the board readable. Open the work card only when you want to add or edit something.';
      return;
    }
    const targetColumn = getColumnLabel(columnInput.value || 'inbox');
    if (mode === 'edit') {
      editorStateTitle.textContent = 'Editing a work item';
      editorStateText.textContent = 'Refine the current card and save it back into ' + targetColumn + '.';
      return;
    }
    editorStateTitle.textContent = 'Open work card';
    editorStateText.textContent = 'Capture the next item cleanly and place it straight into ' + targetColumn + '.';
  }

  function openEditor(mode) {
    editorOpen = true;
    syncEditorState(mode || 'add');
    if (editorCard) {
      window.requestAnimationFrame(() => {
        editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function closeEditor() {
    editorOpen = false;
    syncEditorState();
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
      '    <div class="wl-kanban-card-title-wrap"><span class="wl-kanban-drag-handle" aria-hidden="true">::</span><h4 class="wl-kanban-card-title">' + escapeHtml(card.title) + '</h4></div>',
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
    openEditor('edit');
    titleInput.focus();
  }

  function clearForm(columnId) {
    form.reset();
    idInput.value = '';
    priorityInput.value = 'steady';
    columnInput.value = columnId || 'inbox';
    syncEditorState('add');
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
    if (idInput.value === cardId) {
      clearForm();
      closeEditor();
    }
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
      openEditor('add');
      titleInput.focus();
    }
  });

  if (editorToggle) {
    editorToggle.addEventListener('click', function () {
      if (editorOpen) {
        closeEditor();
        return;
      }
      clearForm(columnInput.value || 'inbox');
      openEditor('add');
      titleInput.focus();
    });
  }

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
    closeEditor();
  });

  resetButton.addEventListener('click', function () {
    clearForm(columnInput.value || 'inbox');
    titleInput.focus();
  });

  clearForm('inbox');
  closeEditor();
  saveBoard();
  renderBoard();
})();

