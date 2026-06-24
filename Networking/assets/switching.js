// ── Circuit vs Packet Switching demo ──
let switchAnim = null, switchMode = null, switchT = 0;

function startSwitchDemo(mode) {
  stopSwitchDemo();
  switchMode = mode;
  switchT = 0;

  const canvas = document.getElementById('switch-canvas');
  const ctx = canvas.getContext('2d');
  const label = document.getElementById('switch-label');
  const W = canvas.width, H = canvas.height;

  const ALL_COLORS = ['#6c8ef7', '#34d399', '#fb923c', '#f472b6'];
  const R = 16;
  const UX = 52, SX = W - 52, NLX = 235, NRX = W - 235, NMID = H / 2;

  const lerp = (a, b, t) => a + (b - a) * t;

  function seg(x1, y1, x2, y2, color, width, dash) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
  }

  function dot(x, y, color, r, lbl) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    if (lbl) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lbl, x, y);
    }
  }

  function drawNetBox(title) {
    ctx.fillStyle = '#1a1e30'; ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(NLX, 6, NRX - NLX, H - 12, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#374060'; ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, (NLX + NRX) / 2, H - 11);
  }

  function drawNode(x, y, color, lbl, shape) {
    if (shape === 'rect') {
      const sw = 17, sh = 14;
      ctx.fillStyle = color + '28'; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x - sw, y - sh, sw * 2, sh * 2, 4); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = color + '28'; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = color; ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lbl, x, y);
  }

  function colLabels(N, NYS, COLORS) {
    ctx.fillStyle = '#475569'; ctx.font = '9px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('USERS', UX, H - 4);
    ctx.fillText('SERVERS', SX, H - 4);
    for (let i = 0; i < N; i++) {
      drawNode(UX, NYS[i], COLORS[i], 'U' + (i + 1), 'circle');
      drawNode(SX, NYS[i], COLORS[i], 'S' + (i + 1), 'rect');
    }
  }

  if (mode === 'circuit') {
    const N = 2;
    const COLORS = ALL_COLORS.slice(0, N);
    const NYS = [H * 0.3, H * 0.7];
    const SETUP_START = [0, 30];
    const FWD_FRAMES = 60, ACK_FRAMES = 25;
    const cState = ['idle', 'idle'], cProg = [0, 0];

    function drawBWBar() {
      const bx = NRX - 20, by = 16, bh = H - 32, bw = 11;
      ctx.fillStyle = '#12162a'; ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#374060'; ctx.font = '7px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('BW', bx + bw / 2, by - 2);
      for (let i = 0; i < N; i++) {
        const fh = bh / N, fy = by + i * fh;
        const alpha = cState[i] === 'idle' ? '18' : cState[i] === 'active' ? 'cc' : '55';
        ctx.fillStyle = COLORS[i] + alpha;
        ctx.beginPath(); ctx.roundRect(bx + 1, fy + 1, bw - 2, fh - 2, 2); ctx.fill();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#151827'; ctx.fillRect(0, 0, W, H);
      drawNetBox('CIRCUIT SWITCH');
      drawBWBar();

      let setupDone = true;
      for (let i = 0; i < N; i++) {
        const y = NYS[i], c = COLORS[i];
        if (cState[i] === 'idle' && switchT >= SETUP_START[i]) { cState[i] = 'fwd'; cProg[i] = 0; }
        if (cState[i] === 'fwd') {
          cProg[i] = Math.min(1, cProg[i] + 1 / FWD_FRAMES);
          if (cProg[i] >= 1) { cState[i] = 'ack'; cProg[i] = 0; }
        } else if (cState[i] === 'ack') {
          cProg[i] = Math.min(1, cProg[i] + 1 / ACK_FRAMES);
          if (cProg[i] >= 1) { cState[i] = 'active'; cProg[i] = 0; }
        }
        if (cState[i] !== 'active') setupDone = false;

        if (cState[i] === 'idle') {
          seg(UX + R, y, SX - R, y, c + '18', 1.5, [5, 5]);
        } else if (cState[i] === 'fwd') {
          const litX = lerp(UX + R, SX - R, cProg[i]);
          seg(UX + R, y, SX - R, y, c + '18', 1.5, [5, 5]);
          seg(UX + R, y, litX, y, c + '80', 3.5);
          dot(litX, y, c, 7);
          ctx.fillStyle = c + 'bb'; ctx.font = 'bold 8px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText('connecting…', lerp(UX + R, SX - R, Math.min(cProg[i] + 0.15, 1)), y - 9);
        } else if (cState[i] === 'ack') {
          seg(UX + R, y, SX - R, y, c + '70', 3.5);
          const ackX = lerp(SX - R, UX + R, cProg[i]);
          dot(ackX, y, '#e2e8f0', 5);
          ctx.fillStyle = c; ctx.font = 'bold 8px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText('connected!', (NLX + NRX) / 2, y - 9);
        } else {
          seg(UX + R, y, SX - R, y, c + '40', 3.5);
          const T = switchT, PERIOD = 105, TRAVEL = 62;
          const rq = (T * 0.85 + i * 28) % PERIOD;
          if (rq < TRAVEL) dot(lerp(UX + R, SX - R, rq / TRAVEL), y, c, 6.5);
          else if ((rq - TRAVEL) / (PERIOD - TRAVEL) < 0.45) {
            ctx.fillStyle = c + '60'; ctx.font = '8px system-ui';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('idle', (NLX + NRX) / 2, y);
          }
          const rs = (T * 0.85 + i * 28 + 52) % PERIOD;
          if (rs < TRAVEL) dot(lerp(SX - R, UX + R, rs / TRAVEL), y, c + 'bb', 5.5);
        }
      }

      colLabels(N, NYS, COLORS);
      switchT++;
      label.textContent = !setupDone
        ? 'Reserving a dedicated circuit end-to-end — the switch allocates bandwidth before any data flows'
        : 'Both circuits active: bandwidth split between 2 lanes, always reserved — even during the idle gaps';
    }
    switchAnim = setInterval(draw, 33);
    return;
  }

  // Packet mode
  const N = 4;
  const COLORS = ALL_COLORS;
  const NYS = [H * 0.13, H * 0.38, H * 0.62, H * 0.87];
  let queue = [], inFlight = null;
  const PHASE_SPEED = 1 / 60, ARRIVE_EVERY = 32;
  let nextUser = 0;
  const QX = NLX - 98, QY = NMID - 38, QW = 85, QH = 76;

  function drawQueueBox() {
    ctx.fillStyle = '#12162a'; ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(QX, QY, QW, QH, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#374060'; ctx.font = '8px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('QUEUE', QX + QW / 2, QY - 3);
    const shown = queue.slice(0, 4);
    const sw = 16, sh = 16, gap = 3;
    const totalW = shown.length * (sw + gap) - (shown.length ? gap : 0);
    const ox = QX + (QW - totalW) / 2;
    shown.forEach((uid, qi) => {
      const sx = ox + qi * (sw + gap), sy = QY + (QH - sh) / 2;
      ctx.fillStyle = COLORS[uid] + 'dd'; ctx.strokeStyle = COLORS[uid]; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('U' + (uid + 1), sx + sw / 2, sy + sh / 2);
    });
    if (queue.length > 4) {
      ctx.fillStyle = '#64748b'; ctx.font = '8px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('+' + (queue.length - 4) + ' more', QX + QW / 2, QY + QH - 4);
    }
    seg(QX + QW, NMID, NLX, NMID, '#2e3352', 1.5);
    ctx.beginPath();
    ctx.moveTo(NLX - 6, NMID - 4); ctx.lineTo(NLX, NMID); ctx.lineTo(NLX - 6, NMID + 4);
    ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#151827'; ctx.fillRect(0, 0, W, H);
    drawNetBox('PACKET SWITCH');
    if (switchT > 0 && switchT % ARRIVE_EVERY === 0) {
      if (queue.length < 8) queue.push(nextUser);
      nextUser = (nextUser + 1) % N;
    }
    if (!inFlight && queue.length > 0) inFlight = { owner: queue.shift(), phase: 0 };
    if (inFlight) { inFlight.phase += PHASE_SPEED; if (inFlight.phase >= 4) inFlight = null; }
    for (let i = 0; i < N; i++) {
      seg(UX + R, NYS[i], QX, NMID, '#1e2540', 1.2, [3, 4]);
      seg(NRX, NMID, SX - R, NYS[i], '#1e2540', 1.2, [3, 4]);
    }
    seg(NLX, NMID, NRX, NMID, '#2e3352', 2);
    ctx.fillStyle = '#2e3352'; ctx.font = '8px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('shared link', (NLX + NRX) / 2, NMID - 11);
    drawQueueBox();
    if (inFlight) {
      const { owner, phase } = inFlight;
      const c = COLORS[owner], uy = NYS[owner], lbl = 'U' + (owner + 1);
      if (phase < 1) {
        seg(QX + QW, NMID, NLX, NMID, c + '60', 4);
        dot(lerp(QX + QW, NLX, phase), NMID, c, 9, lbl);
      } else if (phase < 2) {
        seg(NLX, NMID, NRX, NMID, c + '70', 4);
        dot(lerp(NLX, NRX, phase - 1), NMID, c, 9, lbl);
      } else if (phase < 3) {
        const f = phase - 2;
        seg(NRX, NMID, SX - R, uy, c + '60', 4);
        dot(lerp(NRX, SX - R, f), lerp(NMID, uy, f), c, 9, lbl);
      } else {
        const f = phase - 3;
        if (f < 1 / 3) {
          const sf = f * 3;
          seg(SX - R, uy, NRX, NMID, c + '40', 2.5);
          dot(lerp(SX - R, NRX, sf), lerp(uy, NMID, sf), c, 7, lbl);
        } else if (f < 2 / 3) {
          const sf = (f - 1 / 3) * 3;
          seg(NRX, NMID, NLX, NMID, c + '40', 2.5);
          dot(lerp(NRX, NLX, sf), NMID, c, 7, lbl);
        } else {
          const sf = (f - 2 / 3) * 3;
          seg(NLX, NMID, UX + R, uy, c + '40', 2.5);
          dot(lerp(NLX, UX + R, sf), lerp(NMID, uy, sf), c, 7, lbl);
        }
      }
    }
    colLabels(N, NYS, COLORS);
    switchT++;
    label.textContent = queue.length > 2
      ? `Packets queuing up: ${queue.length} waiting — this waiting time IS the queuing delay`
      : 'Each packet queues, travels the shared link, and the response returns — one at a time';
  }
  switchAnim = setInterval(draw, 33);
}

function stopSwitchDemo() {
  if (switchAnim) { clearInterval(switchAnim); switchAnim = null; }
  const canvas = document.getElementById('switch-canvas');
  if (!canvas) return;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  const lbl = document.getElementById('switch-label');
  if (lbl) lbl.textContent = '';
}

window.startSwitchDemo = startSwitchDemo;
window.stopSwitchDemo  = stopSwitchDemo;
