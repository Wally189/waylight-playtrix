(function () {
  const Storage = window.PlaytrixStorage;
  const Common = window.PlaytrixCommon || null;
  const main = document.getElementById('toolsDeckRows');
  const addLineButton = document.getElementById('addToolsLine');
  const exportDataButton = document.getElementById('exportPlaytrixData');
  const importDataButton = document.getElementById('importPlaytrixDataButton');
  const importDataInput = document.getElementById('importPlaytrixDataInput');
  const dataStatus = document.getElementById('toolsDataStatus');
  if (!main) return;

  const deckKey = 'playtrix.tools.deck.sections';
  const defaultSections = [
    {
      id: 'microsoft',
      title: 'Microsoft',
      description: 'Work, files, and productivity',
      tools: [
        { key: 'ms-outlook', label: 'Outlook' },
        { key: 'ms-word', label: 'Word' },
        { key: 'ms-excel', label: 'Excel' },
        { key: 'ms-powerpoint', label: 'PowerPoint' },
        { key: 'ms-onedrive', label: 'OneDrive' },
        { key: 'ms-teams', label: 'Teams' },
        { key: 'ms-todo', label: 'To Do' }
      ]
    },
    {
      id: 'google',
      title: 'Google',
      description: 'Search, maps, and cloud tools',
      tools: [
        { key: 'google-gmail', label: 'Gmail' },
        { key: 'google-drive', label: 'Drive' },
        { key: 'google-docs', label: 'Docs' },
        { key: 'google-sheets', label: 'Sheets' },
        { key: 'google-calendar', label: 'Calendar' },
        { key: 'google-maps', label: 'Maps' },
        { key: 'google-youtube', label: 'YouTube' }
      ]
    },
    {
      id: 'waylight-and-work',
      title: 'Waylight and Work',
      description: 'Business and client systems',
      tools: [
        { key: 'wl-console', label: 'Business Console' },
        { key: 'wl-site', label: 'Waylight Site' },
        { key: 'wl-workbench', label: 'Workbench' },
        { key: 'work-email', label: 'Email' },
        { key: 'work-onedrive', label: 'OneDrive' },
        { key: 'work-notion', label: 'Notion' },
        { key: 'work-librarieswest', label: 'LibrariesWest' }
      ]
    },
    {
      id: 'communication',
      title: 'Communication',
      description: 'People, messages, and meetings',
      tools: [
        { key: 'comm-phone', label: 'Phone' },
        { key: 'comm-contacts', label: 'Contacts' },
        { key: 'comm-whatsapp', label: 'WhatsApp' },
        { key: 'comm-messenger', label: 'Messenger' },
        { key: 'comm-discord', label: 'Discord' },
        { key: 'comm-chatgpt', label: 'ChatGPT' }
      ]
    },
    {
      id: 'finance-and-bills',
      title: 'Finance and Bills',
      description: 'Money, accounts, and utilities',
      tools: [
        { key: 'fin-banking', label: 'Banking' },
        { key: 'fin-bills', label: 'Bills' },
        { key: 'fin-tescomobile', label: 'Tesco Mobile' },
        { key: 'fin-wallet', label: 'Wallet' },
        { key: 'fin-pay-expenses', label: 'Pay and Expenses' }
      ]
    },
    {
      id: 'system-and-device',
      title: 'System and Device',
      description: 'Keep the machine stable',
      tools: [
        { key: 'sys-settings', label: 'Settings' },
        { key: 'sys-devicecare', label: 'Device care' },
        { key: 'sys-msdefender', label: 'MS Defender' },
        { key: 'sys-playstore', label: 'Play Store' },
        { key: 'sys-calculator', label: 'Calculator' }
      ]
    }
  ];

  let draggedPill = null;
  let draggedSection = null;

  function normaliseOpenTarget(value) {
    if (Common && typeof Common.normaliseActionLink === 'function') {
      return Common.normaliseActionLink(value);
    }
    return String(value || '').trim();
  }

  function setDataStatus(message, isError) {
    if (!dataStatus) return;
    dataStatus.textContent = message;
    dataStatus.dataset.state = isError ? 'error' : 'ok';
  }

  function snapshotFilename(prefix) {
    const stamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
    return prefix + '-' + stamp + '.json';
  }

  function downloadSnapshotObject(snapshot, prefix) {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = snapshotFilename(prefix);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 0);
  }

  function slug(text, fallback) {
    if (!text) return fallback;
    const value = text
      .toLowerCase()
      .trim()
      .replace(/&/g, 'and')
      .replace(/[\/\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    return value || fallback;
  }

  function readJson(key, fallback) {
    if (Storage) return Storage.readJson(key, fallback);
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (Storage) {
      Storage.writeJson(key, value);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readText(key) {
    if (Storage) return Storage.readText(key, '');
    return localStorage.getItem(key) || '';
  }

  function writeText(key, value) {
    if (Storage) {
      Storage.writeText(key, value);
      return;
    }
    localStorage.setItem(key, value);
  }

  function removeKey(key) {
    if (Storage) {
      Storage.remove(key);
      return;
    }
    localStorage.removeItem(key);
  }

  function cloneSections(sections) {
    return (sections || []).map(function (section) {
      return {
        id: section.id,
        title: section.title,
        description: section.description,
        tools: (section.tools || []).map(function (tool) {
          return {
            key: tool.key,
            label: tool.label,
            custom: !!tool.custom
          };
        })
      };
    });
  }

  function normaliseTool(tool, sectionId, index) {
    const label = (tool && tool.label) ? String(tool.label).trim() : 'Tool ' + (index + 1);
    return {
      key: tool && tool.key ? tool.key : slug(label, sectionId + '-tool-' + index),
      label: label,
      custom: !!(tool && tool.custom)
    };
  }

  function normaliseSection(section, index) {
    const id = section && section.id ? section.id : slug(section && section.title, 'section-' + index);
    return {
      id: id,
      title: section && section.title ? String(section.title).trim() : 'Tool line',
      description: section && section.description ? String(section.description).trim() : '',
      tools: Array.isArray(section && section.tools) ? section.tools.map(function (tool, toolIndex) {
        return normaliseTool(tool, id, toolIndex);
      }) : []
    };
  }

  function buildInitialDeck() {
    const sections = cloneSections(defaultSections);
    sections.forEach(function (section) {
      const extras = readJson('playtrixToolsExtras_' + section.id, []);
      extras.forEach(function (meta) {
        if (!meta || !meta.key || !meta.label) return;
        if (section.tools.some(function (tool) { return tool.key === meta.key; })) return;
        section.tools.push({ key: meta.key, label: meta.label, custom: true });
      });

      const order = readJson('playtrixToolsOrder_' + section.id, []);
      if (Array.isArray(order) && order.length) {
        const toolMap = new Map(section.tools.map(function (tool) { return [tool.key, tool]; }));
        const ordered = [];
        order.forEach(function (key) {
          if (toolMap.has(key)) {
            ordered.push(toolMap.get(key));
            toolMap.delete(key);
          }
        });
        toolMap.forEach(function (tool) {
          ordered.push(tool);
        });
        section.tools = ordered;
      }
    });

    const sectionOrder = readJson('playtrixToolsSectionOrder', []);
    if (Array.isArray(sectionOrder) && sectionOrder.length) {
      const sectionMap = new Map(sections.map(function (section) { return [section.id, section]; }));
      const orderedSections = [];
      sectionOrder.forEach(function (id) {
        if (sectionMap.has(id)) {
          orderedSections.push(sectionMap.get(id));
          sectionMap.delete(id);
        }
      });
      sectionMap.forEach(function (section) {
        orderedSections.push(section);
      });
      return orderedSections;
    }

    return sections;
  }

  function getSections() {
    const existing = readJson(deckKey, null);
    if (Array.isArray(existing) && existing.length) {
      return existing.map(normaliseSection);
    }
    const seeded = buildInitialDeck().map(normaliseSection);
    writeJson(deckKey, seeded);
    return seeded;
  }

  function setSections(sections) {
    writeJson(deckKey, sections.map(normaliseSection));
  }

  function renderSection(section) {
    return [
      '<section class="pt-tools-row" data-section-id="' + section.id + '">',
      '  <div class="pt-tools-row-header">',
      '    <div class="pt-tools-row-meta">',
      '      <h2>' + escapeHtml(section.title) + '</h2>',
      '      <p>' + escapeHtml(section.description || 'No description yet.') + '</p>',
      '    </div>',
      '    <div class="pt-tools-row-controls">',
      '      <span class="pt-row-hint">Drag tools or drag the line handle to reorder.</span>',
      '      <button type="button" class="pt-row-control" data-line-edit>Edit line</button>',
      '      <button type="button" class="pt-row-control" data-line-add-tool>Add tool</button>',
      '      <button type="button" class="pt-row-control" data-line-delete>Delete line</button>',
      '      <button type="button" class="pt-line-handle" data-line-handle aria-label="Drag to reorder line" draggable="true">::</button>',
      '    </div>',
      '  </div>',
      '  <div class="pt-tools-chips">',
           section.tools.length ? section.tools.map(function (tool) {
             const linked = readText('playtrixTool_' + tool.key);
             return '<button class="pt-tool-pill' + (linked ? ' pt-tool-linked' : '') + '" data-tool-key="' + escapeHtml(tool.key) + '" data-custom="' + (tool.custom ? 'true' : 'false') + '" draggable="true">' + escapeHtml(tool.label) + '</button>';
           }).join('') : '<div class="line"><span class="bullet"></span><div>No tools added to this line yet.</div></div>',
      '  </div>',
      '</section>'
    ].join('');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render() {
    const sections = getSections();
    main.innerHTML = sections.map(renderSection).join('');
    bindControls();
  }

  function promptLineDetails(section) {
    const title = window.prompt('Line title:', section ? section.title : '');
    if (title === null) return null;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;
    const description = window.prompt('Short line description:', section ? section.description : '');
    if (description === null) return null;
    return {
      title: trimmedTitle,
      description: description.trim()
    };
  }

  function addLine() {
    const details = promptLineDetails(null);
    if (!details) return;
    const sections = getSections();
    const id = slug(details.title, 'tool-line') + '-' + Date.now().toString(36);
    sections.push({
      id: id,
      title: details.title,
      description: details.description,
      tools: []
    });
    setSections(sections);
    render();
  }

  function editLine(sectionId) {
    const sections = getSections();
    const section = sections.find(function (item) { return item.id === sectionId; });
    if (!section) return;
    const details = promptLineDetails(section);
    if (!details) return;
    section.title = details.title;
    section.description = details.description;
    setSections(sections);
    render();
  }

  function deleteLine(sectionId) {
    const sections = getSections();
    const section = sections.find(function (item) { return item.id === sectionId; });
    if (!section) return;
    if (!window.confirm('Delete the tool line "' + section.title + '"?')) return;
    setSections(sections.filter(function (item) { return item.id !== sectionId; }));
    render();
  }

  function addTool(sectionId) {
    const label = window.prompt('Tool name:');
    if (label === null) return;
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    const sections = getSections();
    const section = sections.find(function (item) { return item.id === sectionId; });
    if (!section) return;
    let key = slug(trimmedLabel, sectionId + '-tool');
    const usedKeys = new Set(sections.flatMap(function (item) { return item.tools.map(function (tool) { return tool.key; }); }));
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = slug(trimmedLabel, sectionId + '-tool') + '-' + suffix;
      suffix += 1;
    }
    section.tools.push({ key: key, label: trimmedLabel, custom: true });
    setSections(sections);
    render();
  }

  function removeTool(sectionId, toolKey) {
    const sections = getSections();
    const section = sections.find(function (item) { return item.id === sectionId; });
    if (!section) return;
    const tool = section.tools.find(function (item) { return item.key === toolKey; });
    if (!tool || !tool.custom) return;
    if (!window.confirm('Delete "' + tool.label + '" from this line?')) return;
    section.tools = section.tools.filter(function (item) { return item.key !== toolKey; });
    removeKey('playtrixTool_' + toolKey);
    setSections(sections);
    render();
  }

  function openOrSetTool(toolKey, pill) {
    const existing = readText('playtrixTool_' + toolKey);
    if (existing) {
      const href = normaliseOpenTarget(existing);
      if (href) {
        window.open(href, '_blank', 'noopener');
      }
      return;
    }
    const pasted = window.prompt('No link saved yet for this tool.\n\nPaste a link or file path:');
    if (!pasted) return;
    const clean = pasted.trim();
    if (!clean) return;
    writeText('playtrixTool_' + toolKey, clean);
    pill.classList.add('pt-tool-linked');
  }

  function saveExternalLink(toolKey, uri, pill) {
    const clean = String(uri || '').trim();
    if (!clean) return;
    writeText('playtrixTool_' + toolKey, clean);
    pill.classList.add('pt-tool-linked');
  }

  function getAfterPill(container, x) {
    const others = Array.from(container.querySelectorAll('.pt-tool-pill:not(.pt-tool-pill-dragging)'));
    return others.reduce(function (closest, child) {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  function getAfterSection(container, y) {
    const others = Array.from(container.querySelectorAll('.pt-tools-row:not(.pt-tools-row-dragging)'));
    return others.reduce(function (closest, child) {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  function syncDeckFromDom() {
    const current = getSections();
    const sectionMap = new Map(current.map(function (section) { return [section.id, section]; }));
    const toolMap = new Map();
    current.forEach(function (section) {
      section.tools.forEach(function (tool) {
        toolMap.set(tool.key, tool);
      });
    });

    const next = Array.from(main.querySelectorAll('.pt-tools-row')).map(function (row) {
      const section = sectionMap.get(row.dataset.sectionId);
      return {
        id: section.id,
        title: section.title,
        description: section.description,
        tools: Array.from(row.querySelectorAll('.pt-tool-pill')).map(function (pill, index) {
          const existing = toolMap.get(pill.dataset.toolKey);
          return normaliseTool(existing || {
            key: pill.dataset.toolKey,
            label: pill.textContent.trim(),
            custom: pill.dataset.custom === 'true'
          }, section.id, index);
        })
      };
    });

    setSections(next);
  }

  function bindControls() {
    main.querySelectorAll('.pt-tools-row').forEach(function (row) {
      const sectionId = row.dataset.sectionId;
      const chips = row.querySelector('.pt-tools-chips');
      const handle = row.querySelector('[data-line-handle]');

      row.querySelector('[data-line-edit]').addEventListener('click', function () {
        editLine(sectionId);
      });

      row.querySelector('[data-line-add-tool]').addEventListener('click', function () {
        addTool(sectionId);
      });

      row.querySelector('[data-line-delete]').addEventListener('click', function () {
        deleteLine(sectionId);
      });

      if (handle) {
        handle.addEventListener('dragstart', function (event) {
          draggedSection = row;
          row.classList.add('pt-tools-row-dragging');
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/playtrix-section', sectionId);
          }
        });

        handle.addEventListener('dragend', function () {
          row.classList.remove('pt-tools-row-dragging');
          draggedSection = null;
          syncDeckFromDom();
          render();
        });
      }

      chips.addEventListener('dragover', function (event) {
        if (!draggedPill) return;
        event.preventDefault();
        chips.classList.add('pt-tools-drop-target');
        const after = getAfterPill(chips, event.clientX);
        if (!after) {
          chips.appendChild(draggedPill);
        } else {
          chips.insertBefore(draggedPill, after);
        }
      });

      chips.addEventListener('dragleave', function () {
        chips.classList.remove('pt-tools-drop-target');
      });

      chips.addEventListener('drop', function (event) {
        if (!draggedPill) return;
        event.preventDefault();
        chips.classList.remove('pt-tools-drop-target');
      });

      chips.querySelectorAll('.pt-tool-pill').forEach(function (pill) {
        const toolKey = pill.dataset.toolKey;

        pill.addEventListener('dragstart', function (event) {
          draggedPill = pill;
          pill.classList.add('pt-tool-pill-dragging');
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/playtrix-tool', toolKey);
          }
        });

        pill.addEventListener('dragend', function () {
          pill.classList.remove('pt-tool-pill-dragging');
          draggedPill = null;
          syncDeckFromDom();
          render();
        });

        pill.addEventListener('dragover', function (event) {
          const dt = event.dataTransfer;
          if (!dt) return;
          if (draggedPill) return;
          if (!Array.from(dt.types).some(function (type) { return type === 'text/uri-list' || type === 'text/plain'; })) return;
          event.preventDefault();
          pill.classList.add('pt-tool-pill-drop-target');
        });

        pill.addEventListener('dragleave', function () {
          pill.classList.remove('pt-tool-pill-drop-target');
        });

        pill.addEventListener('drop', function (event) {
          if (draggedPill) return;
          const dt = event.dataTransfer;
          if (!dt) return;
          event.preventDefault();
          pill.classList.remove('pt-tool-pill-drop-target');
          const uri = (dt.getData('text/uri-list') || dt.getData('text/plain') || '').trim();
          if (!uri) return;
          saveExternalLink(toolKey, uri, pill);
        });

        pill.addEventListener('click', function () {
          openOrSetTool(toolKey, pill);
        });

        pill.addEventListener('contextmenu', function (event) {
          event.preventDefault();
          removeTool(sectionId, toolKey);
        });
      });
    });

    main.addEventListener('dragover', function (event) {
      if (!draggedSection) return;
      event.preventDefault();
      const after = getAfterSection(main, event.clientY);
      if (!after) {
        main.appendChild(draggedSection);
      } else {
        main.insertBefore(draggedSection, after);
      }
    });

    main.addEventListener('drop', function (event) {
      if (!draggedSection) return;
      event.preventDefault();
    });
  }

  if (addLineButton) {
    addLineButton.addEventListener('click', addLine);
  }

  if (exportDataButton) {
    exportDataButton.addEventListener('click', function () {
      if (!Storage || typeof Storage.createSnapshot !== 'function') {
        setDataStatus('Snapshot export is not available in this browser.', true);
        return;
      }
      const snapshot = Storage.createSnapshot();
      downloadSnapshotObject(snapshot, 'playtrix-snapshot');
      setDataStatus('Snapshot exported. Keep the JSON file somewhere outside this browser.', false);
    });
  }

  if (importDataButton && importDataInput) {
    importDataButton.addEventListener('click', function () {
      importDataInput.click();
    });

    importDataInput.addEventListener('change', async function () {
      const file = importDataInput.files && importDataInput.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const snapshot = JSON.parse(text);
        if (!snapshot || typeof snapshot !== 'object' || !snapshot.keys || typeof snapshot.keys !== 'object') {
          throw new Error('This file is not a valid Playtrix snapshot.');
        }
        if (!window.confirm('Import this snapshot into the current browser? Existing Playtrix keys with the same names will be replaced.')) {
          return;
        }
        if (Storage && typeof Storage.createSnapshot === 'function') {
          const currentSnapshot = Storage.createSnapshot();
          if (Object.keys(currentSnapshot.keys || {}).length) {
            downloadSnapshotObject(currentSnapshot, 'playtrix-pre-import-backup');
          }
        }
        const written = Storage && typeof Storage.applySnapshot === 'function'
          ? Storage.applySnapshot(snapshot)
          : 0;
        render();
        setDataStatus('Imported ' + written + ' key(s). Reload any other open Playtrix pages to pick up the restored state.', false);
      } catch (error) {
        setDataStatus(error && error.message ? error.message : 'Snapshot import failed.', true);
      } finally {
        importDataInput.value = '';
      }
    });
  }

  render();
})();
