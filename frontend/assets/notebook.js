'use strict';

let nbIdCounter = 0;
function nbGenId() { return 'nb' + (++nbIdCounter); }

const _nbEditors = {};

// Unwrap a backend Text struct {content: <tiptap_doc>} to just the doc.
// Backend Text has only a "content" key; TipTap docs have "type":"doc" at root.
function ttUnwrap(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v ?? null;
  // If it looks like a backend Text wrapper (has "content" but no "type"), unwrap it.
  if ('content' in v && !('type' in v)) return v.content ?? null;
  return v;
}
// Render a TipTap JSON doc to HTML for the viewer.
function ttHtml(doc) {
  if (!doc || !window.TipTapGenerateHTML) return '';
  try { return window.TipTapGenerateHTML(doc); } catch { return ''; }
}
// Extract plain text from a TipTap JSON doc (for labels/tabs).
function ttText(doc) {
  if (!doc || typeof doc !== 'object') return '';
  if (doc.text) return doc.text;
  if (Array.isArray(doc.content)) return doc.content.map(ttText).join('');
  return '';
}

function parseRawElements(raw) {
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw.map(e => ({
    id: nbGenId(),
    type: e.type || 'text',
    content: ttUnwrap(e.content),
    cells: e.cells ? e.cells.map(row => row.map(ttUnwrap)) : [[null, null], [null, null]],
    header: ttUnwrap(e.header),
    cards: e.cards ? e.cards.map(card => ({ header: ttUnwrap(card.header), content: ttUnwrap(card.content) })) : [{ header: null, content: null }],
    question: ttUnwrap(e.question),
    options: e.options ? e.options.map(ttUnwrap) : [null, null],
    answer: e.answer ?? 0,
    questions: e.questions ? e.questions.map(q => ({
      question: ttUnwrap(q.question),
      options: q.options ? q.options.map(ttUnwrap) : [null, null],
      answer: q.answer ?? 0,
    })) : [{ question: null, options: [null, null], answer: 0 }],
  }));
}

function nbCellsToElements() {
  const wrap = v => ({ content: v });
  return S.notebookCells.map(c => {
    if (c.type === 'table')     return { type: 'table', cells: c.cells.map(row => row.map(wrap)) };
    if (c.type === 'card')      return { type: 'card', header: wrap(c.header), content: wrap(c.content) };
    if (c.type === 'cardSlide') return { type: 'cardSlide', cards: c.cards.map(card => ({ header: wrap(card.header), content: wrap(card.content) })) };
    if (c.type === 'question')  return { type: 'question', question: wrap(c.question), options: c.options.map(wrap), answer: c.answer };
    if (c.type === 'questionSlide') return { type: 'questionSlide', questions: c.questions.map(q => ({ question: wrap(q.question), options: q.options.map(wrap), answer: q.answer })) };
    return { type: 'text', content: c.content };
  });
}

function nbAddCell(type, insertIdx) {
  const base = { id: nbGenId(), type, content: null, cells: [], header: null, cards: [{ header: null, content: null }], question: null, options: [null, null], answer: 0, questions: [{ question: null, options: [null, null], answer: 0 }] };
  if (type === 'table') base.cells = [[null, null], [null, null]];
  S.notebookCells.splice(insertIdx, 0, base);
  renderNotebook();
  scheduleElementsSave();
  setTimeout(() => {
    const el = document.querySelector(`[data-id="${cell.id}"] textarea, [data-id="${cell.id}"] input`);
    if (el) el.focus();
  }, 0);
}

function nbDeleteCell(id) {
  S.notebookCells = S.notebookCells.filter(c => c.id !== id);
  renderNotebook();
  scheduleElementsSave();
}

function nbMountEditor(key, content, setter, hasToolbar) {
  const el = document.getElementById('tiptap-' + key);
  if (!el || _nbEditors[key]) return;
  _nbEditors[key] = new window.TipTapEditor({
    element: el,
    extensions: [window.TipTapStarterKit, window.TipTapTabExtension],
    content: content ?? '',
    onUpdate({ editor }) {
      setter(editor.getJSON());
      scheduleElementsSave();
      if (hasToolbar) nbTipTapUpdateToolbar(key);
    },
    onSelectionUpdate() { if (hasToolbar) nbTipTapUpdateToolbar(key); },
  });
}

function nbMountTipTapEditors() {
  if (!window.TipTapEditor) {
    window.addEventListener('tiptap-ready', nbMountTipTapEditors, { once: true });
    return;
  }
  S.notebookCells.forEach(c => {
    if (c.type === 'text') {
      nbMountEditor(c.id, c.content, v => { c.content = v; }, true);
    } else if (c.type === 'table') {
      c.cells.forEach((row, r) => {
        row.forEach((val, col) => {
          nbMountEditor(`${c.id}-t-${r}-${col}`, val, v => { c.cells[r][col] = v; }, false);
        });
      });
    } else if (c.type === 'card') {
      nbMountEditor(`${c.id}-hdr`, c.header, v => { c.header = v; }, false);
      nbMountEditor(`${c.id}-cnt`, c.content, v => { c.content = v; }, true);
    } else if (c.type === 'cardSlide') {
      const idx = c._slideIdx ?? 0;
      const card = c.cards[idx];
      nbMountEditor(`${c.id}-${idx}-hdr`, card.header, v => { c.cards[idx].header = v; }, false);
      nbMountEditor(`${c.id}-${idx}-cnt`, card.content, v => { c.cards[idx].content = v; }, true);
    } else if (c.type === 'question') {
      nbMountEditor(`${c.id}-q`, c.question, v => { c.question = v; }, false);
      c.options.forEach((opt, i) => {
        nbMountEditor(`${c.id}-opt-${i}`, opt, v => { c.options[i] = v; }, false);
      });
    } else if (c.type === 'questionSlide') {
      const idx = c._slideIdx ?? 0;
      const q = c.questions[idx];
      nbMountEditor(`${c.id}-qs-${idx}-q`, q.question, v => { c.questions[idx].question = v; }, false);
      q.options.forEach((opt, i) => {
        nbMountEditor(`${c.id}-qs-${idx}-opt-${i}`, opt, v => { c.questions[idx].options[i] = v; }, false);
      });
    }
  });
}

function nbDestroyTipTapEditors() {
  Object.keys(_nbEditors).forEach(id => {
    _nbEditors[id].destroy();
    delete _nbEditors[id];
  });
}

function nbUpdateTableCell(id, r, col, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c && c.cells[r]) c.cells[r][col] = val;
}

function nbAddRow(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  const cols = c.cells[0]?.length || 1;
  c.cells.push(Array(cols).fill(null));
  renderNotebook();
  scheduleElementsSave();
}

function nbDelRow(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.cells.length <= 1) return;
  c.cells.pop();
  renderNotebook();
  scheduleElementsSave();
}

function nbAddCol(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || (c.cells[0]?.length ?? 0) >= 10) return;
  c.cells.forEach(row => row.push(null));
  renderNotebook();
  scheduleElementsSave();
}

function nbDelCol(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || (c.cells[0]?.length ?? 0) <= 1) return;
  c.cells.forEach(row => row.pop());
  renderNotebook();
  scheduleElementsSave();
}

function nbAddZoneHTML(insertIdx) {
  return `<div class="nb-add-zone">
    <div class="nb-add-line"></div>
    <button class="nb-add-btn" onclick="nbAddCell('text',${insertIdx})">＋ Text</button>
    <button class="nb-add-btn" onclick="nbAddCell('table',${insertIdx})">＋ Table</button>
    <button class="nb-add-btn" onclick="nbAddCell('card',${insertIdx})">＋ Card</button>
    <button class="nb-add-btn" onclick="nbAddCell('cardSlide',${insertIdx})">＋ Card Slide</button>
    <button class="nb-add-btn" onclick="nbAddCell('question',${insertIdx})">＋ Question</button>
    <button class="nb-add-btn" onclick="nbAddCell('questionSlide',${insertIdx})">＋ Question Slide</button>
    <div class="nb-add-line"></div>
  </div>`;
}

function nbTtToolbarHTML(key) {
  return `<div class="nb-tt-toolbar" id="tttb-${key}">
    <button class="nb-tt-btn" data-cmd="bold" onclick="nbTipTapCmd('${key}','bold')" title="Bold"><b>B</b></button>
    <button class="nb-tt-btn" data-cmd="italic" onclick="nbTipTapCmd('${key}','italic')" title="Italic"><i>I</i></button>
    <button class="nb-tt-btn" data-cmd="underline" onclick="nbTipTapCmd('${key}','underline')" title="Underline"><u>U</u></button>
    <button class="nb-tt-btn" data-cmd="strike" onclick="nbTipTapCmd('${key}','strike')" title="Strikethrough"><s>S</s></button>
    <div class="nb-tt-sep"></div>
    <button class="nb-tt-btn" data-cmd="h1" onclick="nbTipTapCmd('${key}','h1')" title="Heading 1">H1</button>
    <button class="nb-tt-btn" data-cmd="h2" onclick="nbTipTapCmd('${key}','h2')" title="Heading 2">H2</button>
    <div class="nb-tt-sep"></div>
    <button class="nb-tt-btn" data-cmd="bulletList" onclick="nbTipTapCmd('${key}','bulletList')" title="Bullet list">≡</button>
    <button class="nb-tt-btn" data-cmd="orderedList" onclick="nbTipTapCmd('${key}','orderedList')" title="Numbered list">1.</button>
    <div class="nb-tt-sep"></div>
    <button class="nb-tt-btn" data-cmd="code" onclick="nbTipTapCmd('${key}','code')" title="Inline code">&lt;/&gt;</button>
  </div>`;
}

function nbTtInlineHTML(key) {
  return `<div id="tiptap-${key}" class="nb-tiptap nb-tiptap-inline" onclick="_nbEditors['${key}']?.commands.focus()"></div>`;
}

function nbTextCellHTML(c) {
  return `<div class="nb-cell nb-text-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill text-pill">Text</span></div>
    <div class="nb-cell-body">
      ${nbTtToolbarHTML(c.id)}
      <div id="tiptap-${c.id}" class="nb-tiptap" onclick="_nbEditors['${c.id}']?.commands.focus()"></div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbTipTapCmd(id, cmd) {
  const ed = _nbEditors[id];
  if (!ed) return;
  const chain = ed.chain().focus();
  if (cmd === 'bold')         chain.toggleBold().run();
  else if (cmd === 'italic')  chain.toggleItalic().run();
  else if (cmd === 'underline') chain.toggleUnderline().run();
  else if (cmd === 'strike')  chain.toggleStrike().run();
  else if (cmd === 'h1')      chain.toggleHeading({ level: 1 }).run();
  else if (cmd === 'h2')      chain.toggleHeading({ level: 2 }).run();
  else if (cmd === 'bulletList')   chain.toggleBulletList().run();
  else if (cmd === 'orderedList')  chain.toggleOrderedList().run();
  else if (cmd === 'code')    chain.toggleCode().run();
  nbTipTapUpdateToolbar(id);
}

function nbTipTapUpdateToolbar(id) {
  const ed = _nbEditors[id];
  const tb = document.getElementById('tttb-' + id);
  if (!ed || !tb) return;
  const checks = {
    bold: () => ed.isActive('bold'),
    italic: () => ed.isActive('italic'),
    underline: () => ed.isActive('underline'),
    strike: () => ed.isActive('strike'),
    h1: () => ed.isActive('heading', { level: 1 }),
    h2: () => ed.isActive('heading', { level: 2 }),
    bulletList: () => ed.isActive('bulletList'),
    orderedList: () => ed.isActive('orderedList'),
    code: () => ed.isActive('code'),
  };
  tb.querySelectorAll('.nb-tt-btn[data-cmd]').forEach(btn => {
    const check = checks[btn.dataset.cmd];
    btn.classList.toggle('nb-tt-btn-active', check ? check() : false);
  });
}

function nbTableCellHTML(c) {
  const rows = c.cells.length;
  const cols = c.cells[0]?.length ?? 0;
  let tbl = '<table class="nb-table">';
  c.cells.forEach((row, r) => {
    tbl += '<tr>';
    row.forEach((val, col) => {
      tbl += `<td>${nbTtInlineHTML(`${c.id}-t-${r}-${col}`)}</td>`;
    });
    tbl += '</tr>';
  });
  tbl += '</table>';
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill table-pill">Table</span></div>
    <div class="nb-cell-body">
      <div class="nb-table-controls">
        <button class="nb-ctrl-btn" onclick="nbAddRow('${c.id}')">+ Row</button>
        <button class="nb-ctrl-btn" onclick="nbDelRow('${c.id}')" ${rows <= 1 ? 'disabled' : ''}>− Row</button>
        <button class="nb-ctrl-btn" onclick="nbAddCol('${c.id}')" ${cols >= 10 ? 'disabled' : ''}>+ Col</button>
        <button class="nb-ctrl-btn" onclick="nbDelCol('${c.id}')" ${cols <= 1 ? 'disabled' : ''}>− Col</button>
      </div>
      <div class="nb-table-wrap">${tbl}</div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbCardCellHTML(c) {
  const hKey = `${c.id}-hdr`, cKey = `${c.id}-cnt`;
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill card-pill">Card</span></div>
    <div class="nb-cell-body">
      <div class="nb-tiptap-label">Header</div>
      <div id="tiptap-${hKey}" class="nb-tiptap nb-tiptap-inline nb-card-hdr-wrap" onclick="_nbEditors['${hKey}']?.commands.focus()"></div>
      ${nbTtToolbarHTML(cKey)}
      <div id="tiptap-${cKey}" class="nb-tiptap" onclick="_nbEditors['${cKey}']?.commands.focus()"></div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbCardSlideTabs(c, id, listKey) {
  const idx = c._slideIdx ?? 0;
  return c[listKey].map((card, i) => {
    const label = ttText(card.header).trim() || (i + 1);
    return `<button class="slide-tab${i === idx ? ' slide-tab-active' : ''}" onclick="nbSlideGoTo('${id}','${listKey}',${i})">${esc(String(label))}</button>`;
  }).join('');
}

function nbCardSlideCellHTML(c) {
  const idx = c._slideIdx ?? 0;
  const card = c.cards[idx];
  const total = c.cards.length;
  const tabs = nbCardSlideTabs(c, c.id, 'cards');
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill slide-pill">Slide</span></div>
    <div class="nb-cell-body">
      <div class="slide-tabs-row">${tabs}</div>
      <div class="nb-slide-edit-nav">
        <button class="cv-slide-btn" onclick="nbSlideNav('${c.id}','cards',-1)">‹</button>
        <span class="cv-slide-counter">${idx + 1} / ${total}</span>
        <button class="cv-slide-btn" onclick="nbSlideNav('${c.id}','cards',1)">›</button>
        <button class="nb-ctrl-btn nb-slide-del" style="margin-left:auto" onclick="nbDelSlideCard('${c.id}',${idx})" ${total <= 1 ? 'disabled' : ''}>− Remove</button>
        <button class="nb-ctrl-btn" onclick="nbAddSlideCard('${c.id}')">＋ Add</button>
      </div>
      <div class="nb-tiptap-label">Header</div>
      <div id="tiptap-${c.id}-${idx}-hdr" class="nb-tiptap nb-tiptap-inline nb-card-hdr-wrap" onclick="_nbEditors['${c.id}-${idx}-hdr']?.commands.focus()"></div>
      ${nbTtToolbarHTML(`${c.id}-${idx}-cnt`)}
      <div id="tiptap-${c.id}-${idx}-cnt" class="nb-tiptap" onclick="_nbEditors['${c.id}-${idx}-cnt']?.commands.focus()"></div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbQuestionCellHTML(c) {
  const optsHTML = c.options.map((opt, i) => `
    <div class="nb-q-option">
      <input type="radio" name="q-${c.id}-answer" ${c.answer === i ? 'checked' : ''}
        onchange="nbUpdateField('${c.id}','answer',${i});scheduleElementsSave()">
      ${nbTtInlineHTML(`${c.id}-opt-${i}`)}
      <button class="nb-ctrl-btn" onclick="nbDelOption('${c.id}',${i})" ${c.options.length <= 2 ? 'disabled' : ''}>−</button>
    </div>`).join('');
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill question-pill">Q</span></div>
    <div class="nb-cell-body">
      <div id="tiptap-${c.id}-q" class="nb-tiptap nb-tiptap-inline nb-q-stem-wrap" onclick="_nbEditors['${c.id}-q']?.commands.focus()"></div>
      <div class="nb-q-options">${optsHTML}</div>
      <button class="nb-ctrl-btn" onclick="nbAddOption('${c.id}')">＋ Add option</button>
      <div class="nb-q-hint">Select the correct answer with the radio button.</div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbQSlideCellHTML(c) {
  const idx = c._slideIdx ?? 0;
  const q = c.questions[idx];
  const total = c.questions.length;
  const optsHTML = q.options.map((opt, i) => `
    <div class="nb-q-option">
      <input type="radio" name="qs-${c.id}-${idx}-answer" ${q.answer === i ? 'checked' : ''}
        onchange="nbUpdateQSlideField('${c.id}',${idx},'answer',${i});scheduleElementsSave()">
      ${nbTtInlineHTML(`${c.id}-qs-${idx}-opt-${i}`)}
      <button class="nb-ctrl-btn" onclick="nbDelQSlideOption('${c.id}',${idx},${i})" ${q.options.length <= 2 ? 'disabled' : ''}>−</button>
    </div>`).join('');
  return `<div class="nb-cell" data-id="${c.id}">
    <div class="nb-cell-left"><span class="nb-type-pill qslide-pill">Q Slide</span></div>
    <div class="nb-cell-body">
      <div class="nb-slide-edit-nav">
        <button class="cv-slide-btn" onclick="nbSlideNav('${c.id}','questions',-1)">‹</button>
        <span class="cv-slide-counter">${idx + 1} / ${total}</span>
        <button class="cv-slide-btn" onclick="nbSlideNav('${c.id}','questions',1)">›</button>
        <button class="nb-ctrl-btn nb-slide-del" style="margin-left:auto" onclick="nbDelQSlideQuestion('${c.id}',${idx})" ${total <= 1 ? 'disabled' : ''}>− Remove</button>
        <button class="nb-ctrl-btn" onclick="nbAddQSlideQuestion('${c.id}')">＋ Add</button>
      </div>
      <div id="tiptap-${c.id}-qs-${idx}-q" class="nb-tiptap nb-tiptap-inline nb-q-stem-wrap" onclick="_nbEditors['${c.id}-qs-${idx}-q']?.commands.focus()"></div>
      <div class="nb-q-options">${optsHTML}</div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="nb-ctrl-btn" onclick="nbAddQSlideOption('${c.id}',${idx})">＋ Option</button>
      </div>
      <div class="nb-q-hint">Select the correct answer with the radio button.</div>
    </div>
    <div class="nb-cell-right">
      <button class="nb-del-btn" onclick="nbDeleteCell('${c.id}')" title="Delete">✕</button>
    </div>
  </div>`;
}

function nbUpdateQSlideField(id, qi, field, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c?.questions[qi]) c.questions[qi][field] = val;
}

function nbUpdateQSlideOption(id, qi, i, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c?.questions[qi]?.options[i] !== undefined) c.questions[qi].options[i] = val;
}

function nbAddQSlideOption(id, qi) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c?.questions[qi]) return;
  c.questions[qi].options.push(null);
  renderNotebook();
  scheduleElementsSave();
}

function nbDelQSlideOption(id, qi, i) {
  const c = S.notebookCells.find(c => c.id === id);
  const q = c?.questions[qi];
  if (!q || q.options.length <= 2) return;
  if (q.answer >= i && q.answer > 0) q.answer--;
  q.options.splice(i, 1);
  renderNotebook();
  scheduleElementsSave();
}

function nbAddQSlideQuestion(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  c.questions.push({ question: null, options: [null, null], answer: 0 });
  c._slideIdx = c.questions.length - 1;
  renderNotebook();
  scheduleElementsSave();
}

function nbDelQSlideQuestion(id, qi) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.questions.length <= 1) return;
  c.questions.splice(qi, 1);
  c._slideIdx = Math.min(c._slideIdx ?? 0, c.questions.length - 1);
  renderNotebook();
  scheduleElementsSave();
}

function nbSlideNav(id, listKey, dir) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  const len = c[listKey].length;
  c._slideIdx = ((c._slideIdx ?? 0) + dir + len) % len;
  renderNotebook();
}

function nbSlideGoTo(id, listKey, i) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  c._slideIdx = i;
  renderNotebook();
}

function nbUpdateField(id, field, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c) c[field] = val;
}

function nbUpdateSlideCard(id, i, field, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c?.cards[i]) c.cards[i][field] = val;
}

function nbAddSlideCard(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  c.cards.push({ header: null, content: null });
  c._slideIdx = c.cards.length - 1;
  renderNotebook();
  scheduleElementsSave();
}

function nbDelSlideCard(id, i) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.cards.length <= 1) return;
  c.cards.splice(i, 1);
  c._slideIdx = Math.min(c._slideIdx ?? 0, c.cards.length - 1);
  renderNotebook();
  scheduleElementsSave();
}

function nbUpdateOption(id, i, val) {
  const c = S.notebookCells.find(c => c.id === id);
  if (c?.options[i] !== undefined) c.options[i] = val;
}

function nbAddOption(id) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c) return;
  c.options.push(null);
  renderNotebook();
  scheduleElementsSave();
}

function nbDelOption(id, i) {
  const c = S.notebookCells.find(c => c.id === id);
  if (!c || c.options.length <= 2) return;
  if (c.answer >= i && c.answer > 0) c.answer--;
  c.options.splice(i, 1);
  renderNotebook();
  scheduleElementsSave();
}

function buildNotebookHTML() {
  if (!S.notebookCells.length) {
    return nbAddZoneHTML(0) +
      '<div class="nb-empty">No content yet — add a cell above.</div>';
  }
  return S.notebookCells.reduce((html, c, i) => {
    let cellHTML;
    if (c.type === 'table')     cellHTML = nbTableCellHTML(c);
    else if (c.type === 'card')      cellHTML = nbCardCellHTML(c);
    else if (c.type === 'cardSlide') cellHTML = nbCardSlideCellHTML(c);
    else if (c.type === 'question')       cellHTML = nbQuestionCellHTML(c);
    else if (c.type === 'questionSlide')  cellHTML = nbQSlideCellHTML(c);
    else                                  cellHTML = nbTextCellHTML(c);
    return html + cellHTML + nbAddZoneHTML(i + 1);
  }, nbAddZoneHTML(0));
}

function buildCourseViewHTML() {
  if (!S.notebookCells.length) return '<div class="nb-empty">No course content yet.</div>';
  return S.notebookCells.map(c => {
    if (c.type === 'table') {
      const tbl = c.cells.map(row =>
        '<tr>' + row.map(val => `<td>${ttHtml(val)}</td>`).join('') + '</tr>'
      ).join('');
      return `<table class="cv-table">${tbl}</table>`;
    }
    if (c.type === 'card') {
      const hdr = ttHtml(c.header);
      return `<div class="cv-card">
        ${hdr ? `<div class="cv-card-header">${hdr}</div>` : ''}
        <div class="cv-card-content">${ttHtml(c.content)}</div>
      </div>`;
    }
    if (c.type === 'cardSlide') {
      const id = c.id;
      const cards = c.cards;
      const cardsHTML = cards.map((card, i) => {
        const hdr = ttHtml(card.header);
        return `<div class="cv-slide-card${i === 0 ? ' active' : ''}" data-slide-i="${i}">
          ${hdr ? `<div class="cv-card-header">${hdr}</div>` : ''}
          <div class="cv-card-content">${ttHtml(card.content)}</div>
        </div>`;
      }).join('');
      const tabsHTML = cards.map((card, i) => {
        const label = ttText(card.header).trim() || (i + 1);
        return `<button class="slide-tab${i === 0 ? ' slide-tab-active' : ''}" data-slide-tab="${id}-${i}" onclick="cvSlideGoTo('${id}',${i})">${esc(String(label))}</button>`;
      }).join('');
      return `<div class="cv-slide" id="slide-${id}">
        <div class="slide-tabs-row" id="slide-tabs-${id}">${tabsHTML}</div>
        <div class="cv-slide-track">${cardsHTML}</div>
        <div class="cv-slide-nav">
          <button class="cv-slide-btn" id="slide-prev-${id}" onclick="cvSlideNav('${id}',-1)" ${cards.length <= 1 ? 'disabled' : ''}>‹</button>
          <span class="cv-slide-counter" id="slide-counter-${id}">1 / ${cards.length}</span>
          <button class="cv-slide-btn" id="slide-next-${id}" onclick="cvSlideNav('${id}',1)" ${cards.length <= 1 ? 'disabled' : ''}>›</button>
        </div>
      </div>`;
    }
    if (c.type === 'question') {
      const optsHTML = c.options.map((opt, i) =>
        `<label class="cv-q-option" data-opt="${i}">
          <input type="radio" name="cv-q-${c.id}" value="${i}" onchange="cvAnswerQuestion('${c.id}',${i},${c.answer})">
          <span>${ttHtml(opt)}</span>
        </label>`
      ).join('');
      return `<div class="cv-question" id="cvq-${c.id}">
        <div class="cv-q-stem">${ttHtml(c.question)}</div>
        <div class="cv-q-options">${optsHTML}</div>
        <div class="cv-q-feedback" id="cvqf-${c.id}"></div>
      </div>`;
    }
    if (c.type === 'questionSlide') {
      const id = c.id;
      const questionsHTML = c.questions.map((q, qi) => {
        const optsHTML = q.options.map((opt, i) =>
          `<label class="cv-q-option" data-opt="${i}">
            <input type="radio" name="cv-qs-${id}-${qi}" value="${i}" onchange="cvAnswerQSlide('${id}',${qi},${i},${q.answer})">
            <span>${ttHtml(opt)}</span>
          </label>`
        ).join('');
        return `<div class="cv-slide-card${qi === 0 ? ' active' : ''}" data-slide-i="${qi}" id="cvq-${id}-${qi}">
          <div class="cv-q-stem">${ttHtml(q.question)}</div>
          <div class="cv-q-options">${optsHTML}</div>
          <div class="cv-q-feedback" id="cvqf-${id}-${qi}"></div>
        </div>`;
      }).join('');
      return `<div class="cv-slide" id="slide-${id}">
        <div class="cv-slide-track">${questionsHTML}</div>
        <div class="cv-slide-nav">
          <button class="cv-slide-btn" id="slide-prev-${id}" onclick="cvSlideNav('${id}',-1)" ${c.questions.length <= 1 ? 'disabled' : ''}>‹</button>
          <span class="cv-slide-counter" id="slide-counter-${id}">1 / ${c.questions.length}</span>
          <button class="cv-slide-btn" id="slide-next-${id}" onclick="cvSlideNav('${id}',1)" ${c.questions.length <= 1 ? 'disabled' : ''}>›</button>
        </div>
      </div>`;
    }
    const html = c.content && window.TipTapGenerateHTML ? window.TipTapGenerateHTML(c.content) : '';
    return `<div class="cv-text">${html}</div>`;
  }).join('');
}

function cvAnswerQSlide(slideId, qi, chosen, correct) {
  const container = document.getElementById(`cvq-${slideId}-${qi}`);
  const fb = document.getElementById(`cvqf-${slideId}-${qi}`);
  if (!container || !fb) return;
  const isCorrect = chosen === correct;
  container.querySelectorAll('.cv-q-option').forEach((el, i) => {
    el.classList.remove('cv-q-correct', 'cv-q-wrong');
    if (isCorrect && i === correct) el.classList.add('cv-q-correct');
    else if (!isCorrect && i === chosen) el.classList.add('cv-q-wrong');
  });
  fb.textContent = isCorrect ? '✓ Correct!' : '✗ Incorrect — try again.';
  fb.className = 'cv-q-feedback ' + (isCorrect ? 'cv-q-fb-correct' : 'cv-q-fb-wrong');
}

function cvSlideNav(id, dir) {
  const el = document.getElementById('slide-' + id);
  if (!el) return;
  const cards = el.querySelectorAll('.cv-slide-card');
  const active = el.querySelector('.cv-slide-card.active');
  let idx = Array.from(cards).indexOf(active);
  idx = Math.max(0, Math.min(cards.length - 1, idx + dir));
  cvSlideActivate(id, el, cards, idx);
}

function cvSlideGoTo(id, idx) {
  const el = document.getElementById('slide-' + id);
  if (!el) return;
  const cards = el.querySelectorAll('.cv-slide-card');
  cvSlideActivate(id, el, cards, idx);
}

function cvSlideActivate(id, el, cards, idx) {
  cards.forEach(c => c.classList.remove('active'));
  cards[idx].classList.add('active');
  const counter = document.getElementById('slide-counter-' + id);
  if (counter) counter.textContent = `${idx + 1} / ${cards.length}`;
  const tabsEl = document.getElementById('slide-tabs-' + id);
  if (tabsEl) {
    tabsEl.querySelectorAll('.slide-tab').forEach((t, i) => t.classList.toggle('slide-tab-active', i === idx));
  }
  const prev = document.getElementById('slide-prev-' + id);
  const next = document.getElementById('slide-next-' + id);
  if (prev) prev.disabled = idx === 0;
  if (next) next.disabled = idx === cards.length - 1;
}

function cvAnswerQuestion(id, chosen, correct) {
  const fb = document.getElementById('cvqf-' + id);
  const container = document.getElementById('cvq-' + id);
  if (!fb || !container) return;
  const isCorrect = chosen === correct;
  container.querySelectorAll('.cv-q-option').forEach((el, i) => {
    el.classList.remove('cv-q-correct', 'cv-q-wrong');
    if (isCorrect && i === correct) el.classList.add('cv-q-correct');
    else if (!isCorrect && i === chosen) el.classList.add('cv-q-wrong');
  });
  fb.textContent = isCorrect ? '✓ Correct!' : '✗ Incorrect — try again.';
  fb.className = 'cv-q-feedback ' + (isCorrect ? 'cv-q-fb-correct' : 'cv-q-fb-wrong');
}

function renderNotebook() {
  const nb = document.getElementById('notebook');
  if (!nb) return;
  nbDestroyTipTapEditors();
  if (S.editMode) {
    nb.innerHTML = buildNotebookHTML();
    nb.querySelectorAll('.nb-textarea, .nb-cell-input').forEach(ta => autoResize(ta));
    nbMountTipTapEditors();
  } else {
    nb.innerHTML = buildCourseViewHTML();
  }
}
