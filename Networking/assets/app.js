// ── Course navigation config ──
const NAV_ITEMS = [
  { id: 'home',        title: 'Introduction' },
  { id: 'switching',   title: 'Circuit vs Packet Switching' },
  { id: 'routers',     title: 'Routers vs Switches' },
  { id: 'networks',    title: 'Network of Networks' },
  { id: 'layers',      title: 'Protocol Layers' },
  { id: 'performance', title: 'Performance Metrics' },
  { id: 'delay',       title: 'Delay & Packet Loss' },
  { id: 'applayer',    title: 'Application Layer' },
  { id: 'transport',   title: 'Transport Layer' },
  { id: 'journey',     title: 'Packet Journey' },
];

const currentSection = document.body.dataset.section || 'home';
const isRoot = !window.location.pathname.includes('/modules/');
const rootBase = isRoot ? '' : '../';

function sectionHref(id) {
  return id === 'home' ? rootBase + 'index.html' : rootBase + 'modules/' + id + '.html';
}

// ── Progress tracking via localStorage ──
function getVisited() {
  try { return new Set(JSON.parse(localStorage.getItem('net-visited') || '["home"]')); }
  catch { return new Set(['home']); }
}
function markVisited(id) {
  const v = getVisited(); v.add(id);
  try { localStorage.setItem('net-visited', JSON.stringify([...v])); } catch {}
}
markVisited(currentSection);

// ── Sidebar injection ──
(function buildSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const visited = getVisited();
  const pct = (visited.size / NAV_ITEMS.length) * 100;
  const items = NAV_ITEMS.map(item => {
    const active = item.id === currentSection;
    const done   = visited.has(item.id) && !active;
    return `<a class="nav-item${active ? ' active' : ''}${done ? ' done' : ''}" href="${sectionHref(item.id)}" data-sec="${item.id}">
      <div class="nav-dot"></div>${item.title}
    </a>`;
  }).join('');
  sidebar.innerHTML = `
    <div id="sidebar-header">
      <h2>Computer Networks</h2>
      <p>Interactive Study Guide</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="nav-section">Course Modules</div>
    ${items}
  `;
})();

// ── Quiz answers ──
const ANSWERS = {
  q1: { correct: 'b', feedback: {
    a: '✗ Circuit switching guarantees bandwidth, but wastes it during quiet periods — bursty streaming means lots of idle reservation.',
    b: '✓ Correct! Packet switching handles bursty traffic well because the link is only used when data is actually being sent, not reserved the whole time.',
    c: '✗ They perform very differently for bursty traffic. Circuit wastes capacity; packets share it efficiently.',
  }},
  q2: { correct: 'b', feedback: {
    a: '✗ Public IP addresses must be globally unique — but 192.168.x.x is a private IP range, not visible on the internet.',
    b: '✓ Correct! Private IPs (192.168.x.x) only need to be unique within their local network. Your router uses NAT to translate to a single public IP before sending to the internet.',
    c: '✗ The ISP doesn\'t affect private IP uniqueness rules — it\'s determined by the RFC-defined private address ranges.',
  }},
  q3: { correct: 'b', feedback: {
    a: '✗ The IP address never changes — it always points to the final destination. Changing it would break routing.',
    b: '✓ Correct! The destination IP (Google\'s IP) stays constant end-to-end. The destination MAC changes at every hop because MAC addresses only identify the next adjacent device.',
    c: '✗ The IP stays the same. Only the MAC changes at each hop.',
  }},
  qr1: { correct: 'c', feedback: {
    a: '✗ Switches never drop unknown frames — dropping would break the network.',
    b: '✗ Switches operate at Layer 2 (MAC addresses) and don\'t involve routers for local forwarding decisions.',
    c: '✓ Correct! Unknown destinations get flooded out all ports except the source. This lets the switch learn where that MAC lives when it replies.',
    d: '✗ Switches don\'t send errors. They flood to discover the destination.',
  }},
  q4: { correct: 'b', feedback: {
    a: '✗ Your 100 Mbps download link can\'t receive faster than the server can send — 5 Mbps is the constraint.',
    b: '✓ Correct! Throughput is determined by the slowest link — the bottleneck. The server\'s 5 Mbps upload link limits you regardless of your home connection speed.',
    c: '✗ Throughput isn\'t averaged — it\'s the minimum of all links in the path.',
  }},
  q5: { correct: 'b', feedback: {
    a: '✗ Transmission delay is tiny here (0.001 ms). You calculated it right — but propagation is 10ms, much larger.',
    b: '✓ Correct! Transmission delay = 1000/10⁶ = 0.001 ms. Propagation delay = 2,000,000m / 200,000,000 m/s = 0.01 s = 10 ms. Propagation dominates by 10,000×!',
    c: '✗ They\'re very different. Propagation (physical distance) dominates for long-haul links with small packets.',
  }},
  q6: { correct: 'b', feedback: {
    a: '✗ A single server works, but it\'s a single point of failure and the bottleneck. P2P scales better as more users join.',
    b: '✓ Correct! P2P is great here — but you need a way for peers to find each other. Most users being offline means you need a robust discovery mechanism (tracker, DHT, etc.).',
    c: '✗ P2P peers go offline all the time — that\'s one of its core challenges. You need address management.',
  }},
  q7: { correct: 'b', feedback: {
    a: '✗ TCP\'s retransmissions introduce unpredictable delays — catastrophic for real-time games. An old position is useless; you want the latest one, even if some are lost.',
    b: '✓ Correct! In real-time gaming, a packet delayed by TCP retransmission is worse than a dropped packet — the position update is already stale. UDP lets you send fresh updates at 60fps.',
    c: '✗ Protocol choice matters a lot here. The real-time constraint makes UDP the right choice.',
  }},
  q8: { correct: 'c', feedback: {
    a: '✗ MAC addresses are not the final destination — that\'s the IP address\'s job. MACs only identify the next immediate device.',
    b: '✗ The MAC address changes at EVERY hop, not just the first one. Each router replaces it with the next router\'s MAC.',
    c: '✓ Correct! The destination MAC changes at every single router hop. 5 routers = 5 MAC swaps.',
  }},
};

function quiz(el, choice, qid) {
  const parent = el.parentElement;
  if (parent.querySelector('.correct') || parent.querySelector('.wrong')) return;
  const q = ANSWERS[qid];
  if (!q) return;
  const feedback = document.getElementById(qid + '-feedback');
  if (choice === q.correct) {
    el.classList.add('correct');
    if (feedback) { feedback.textContent = q.feedback[choice]; feedback.className = 'quiz-feedback show ok'; }
  } else {
    el.classList.add('wrong');
    if (feedback) { feedback.textContent = q.feedback[choice]; feedback.className = 'quiz-feedback show bad'; }
    parent.querySelectorAll('.quiz-opt').forEach(o => {
      if (o.dataset.choice === q.correct) o.classList.add('correct');
    });
  }
}
window.quiz = quiz;

// ── TCP/UDP toggle ──
function showProto(mode) {
  const tcpBtn = document.getElementById('tcp-btn');
  const udpBtn = document.getElementById('udp-btn');
  const tcpD = document.getElementById('tcp-detail');
  const udpD = document.getElementById('udp-detail');
  if (!tcpBtn) return;
  if (!mode) { tcpD.classList.remove('visible'); udpD.classList.remove('visible'); tcpBtn.className = 'proto-btn'; udpBtn.className = 'proto-btn'; return; }
  if (mode === 'tcp') {
    tcpBtn.className = 'proto-btn selected-tcp'; udpBtn.className = 'proto-btn';
    tcpD.classList.add('visible'); udpD.classList.remove('visible');
  } else {
    udpBtn.className = 'proto-btn selected-udp'; tcpBtn.className = 'proto-btn';
    udpD.classList.add('visible'); tcpD.classList.remove('visible');
  }
}
window.showProto = showProto;

// ── Layer toggle ──
function toggleLayer(id) {
  const el = document.getElementById(id);
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.layer-detail').forEach(d => d.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}
window.toggleLayer = toggleLayer;

// ══════════════════════════════════════════════════════════════
//  C — HTML component helpers
//  Use these in module pages to build content without copy-pasting
//  verbose HTML. All return HTML strings; call el.innerHTML = ...
//
//  Example:
//    document.getElementById('my-cards').innerHTML =
//      C.cardGrid(
//        C.card('Title A', '<p>Body A</p>', 'accent'),
//        C.card('Title B', '<p>Body B</p>', 'green'),
//      );
// ══════════════════════════════════════════════════════════════
const C = {
  // Single card. accent can be: 'accent' | 'green' | 'orange' | 'pink' | ''
  card(title, body, accent = '') {
    return `<div class="card${accent ? ' card-' + accent : ''}">${title ? `<h3>${title}</h3>` : ''}${body}</div>`;
  },

  // Two-column grid of cards
  cardGrid(...cards) {
    return `<div class="card-grid">${cards.join('')}</div>`;
  },

  // Blue "Why?" callout box
  why(label, body) {
    return `<div class="why"><div class="why-label">${label}</div><p>${body}</p></div>`;
  },

  // Monospace formula box
  formula(text) {
    return `<div class="formula">${text}</div>`;
  },

  // Full quiz block.
  // options: array of { choice: 'a'|'b'|'c', label: 'text' }
  // Correct answer + feedbacks must be registered in ANSWERS above.
  quiz(id, question, options) {
    const opts = options.map(o =>
      `<div class="quiz-opt" data-choice="${o.choice}" onclick="quiz(this,'${o.choice}','${id}')">${o.choice.toUpperCase()}) ${o.label}</div>`
    ).join('');
    return `<div class="quiz-block">
      <h3>✦ Check Your Understanding</h3>
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">${question}</p>
      <div class="quiz-options">${opts}</div>
      <div class="quiz-feedback" id="${id}-feedback"></div>
    </div>`;
  },

  // Previous / Next navigation footer. Use module ids ('home', 'switching', etc.)
  navButtons(prevId, nextId, nextLabel = 'Next →', prevLabel = '← Back') {
    const prev = prevId
      ? `<a href="${sectionHref(prevId)}" class="btn btn-ghost">${prevLabel}</a>`
      : '<div></div>';
    const next = nextId
      ? `<a href="${sectionHref(nextId)}" class="btn btn-primary">${nextLabel}</a>`
      : '<div></div>';
    return `<div class="section-nav">${prev}${next}</div>`;
  },

  // Compare/data table. headers: string[], rows: string[][]
  table(headers, rows) {
    const ths = headers.map(h => `<th>${h}</th>`).join('');
    const trs = rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<table class="compare"><tr>${ths}</tr>${trs}</table>`;
  },
};
window.C = C;
