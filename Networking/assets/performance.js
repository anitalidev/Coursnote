// ── Bandwidth / Throughput / Goodput pipe diagram ──
const pipeScenes = {
  ideal: {
    bw: '100 Mbps', tp: '100 Mbps', gp: '100 Mbps',
    overheadFrac: 0, rocks: [],
    explainer: '<strong>Ideal world:</strong> The pipe is your <strong>bandwidth</strong> — the maximum capacity of the link (100 Mbps). With zero protocol overhead and zero errors, all water (data) is useful. <strong>Throughput = Goodput = Bandwidth.</strong> This never happens in practice — every real protocol adds headers.'
  },
  overhead: {
    bw: '100 Mbps', tp: '100 Mbps', gp: '~72 Mbps',
    overheadFrac: 0.28, rocks: [],
    explainer: '<strong>Real world:</strong> Pipe capacity (bandwidth) is still 100 Mbps, so <strong>throughput</strong> — total bits sent — is 100 Mbps. But ~28% is TCP/IP/Ethernet headers and ACKs (orange). Only <strong>~72 Mbps reaches the application</strong> as useful payload — that\'s <strong>goodput</strong>.'
  },
  lossy: {
    bw: '100 Mbps', tp: '100 Mbps', gp: '~45 Mbps',
    overheadFrac: 0.27, rocks: [{x:200,y:80},{x:350,y:65},{x:480,y:90}],
    explainer: '<strong>Lossy link:</strong> Rocks represent packet loss or congestion. TCP retransmits dropped packets — those retransmits burn bandwidth but deliver no new data. Combined with protocol overhead, <strong>goodput crashes to ~45 Mbps</strong> even though the pipe is full of water.'
  }
};

function drawPipeSVG(scene) {
  const svg = document.getElementById('perf-pipe-svg');
  if (!svg) return;
  const s = pipeScenes[scene];
  const pTop = 40, pBot = 140, pL = 30, pR = 670, pH = pBot - pTop;
  const lossExtra = s.rocks.length > 0 ? 0.27 : 0;
  const goodH = pH * (1 - s.overheadFrac - lossExtra);
  const overH = pH * s.overheadFrac;
  svg.innerHTML = `
    <rect x="${pL}" y="${pTop}" width="${pR-pL}" height="${pH}" rx="10" fill="#3b82f6"/>
    ${overH > 0 ? `<rect x="${pL}" y="${pTop}" width="${pR-pL}" height="${overH}" rx="10" fill="#f97316"/>` : ''}
    <rect x="${pL}" y="${pBot-goodH}" width="${pR-pL}" height="${goodH}" rx="0" fill="#22c55e"/>
    <rect x="${pL}" y="${pTop}" width="${pR-pL}" height="${pH}" rx="10" fill="none" stroke="#64748b" stroke-width="3"/>
    <rect x="${pL}" y="${pTop}" width="14" height="${pH}" rx="4" fill="#334155" stroke="#475569" stroke-width="1.5"/>
    <rect x="${pR-14}" y="${pTop}" width="14" height="${pH}" rx="4" fill="#334155" stroke="#475569" stroke-width="1.5"/>
    ${overH > 14 ? `<text x="${(pL+pR)/2}" y="${pTop+overH/2+4}" text-anchor="middle" font-size="11" font-weight="700" fill="white" font-family="system-ui">HEADERS / OVERHEAD</text>` : ''}
    ${goodH > 14 ? `<text x="${(pL+pR)/2}" y="${pBot-goodH/2+4}" text-anchor="middle" font-size="11" font-weight="700" fill="white" font-family="system-ui">USEFUL DATA (GOODPUT)</text>` : ''}
    ${s.rocks.map((r, i) => `<circle cx="${r.x}" cy="${r.y}" r="${13+i*2}" fill="#94a3b8" stroke="#475569" stroke-width="1.5" opacity="0.92"/><circle cx="${r.x-3}" cy="${r.y-4}" r="${7+i}" fill="#cbd5e1" opacity="0.4"/>`).join('')}
    <line x1="${pL}" y1="22" x2="${pR}" y2="22" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,3"/>
    <text x="${(pL+pR)/2}" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="#60a5fa" font-family="system-ui">BANDWIDTH = 100 Mbps (pipe size)</text>
    <polygon points="${pL-2},90 ${pL+18},80 ${pL+18},100" fill="#64748b"/>
    <text x="${pL+7}" y="162" text-anchor="middle" font-size="10" fill="#64748b" font-family="system-ui">Sender</text>
    <polygon points="${pR+2},90 ${pR-18},80 ${pR-18},100" fill="#64748b"/>
    <text x="${pR-7}" y="162" text-anchor="middle" font-size="10" fill="#64748b" font-family="system-ui">Receiver</text>
  `;
  document.getElementById('perf-pipe-cards').innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:4px">Bandwidth</div>
      <div style="font-size:20px;font-weight:700;color:#60a5fa">${s.bw}</div>
      <div style="font-size:11.5px;color:var(--text2);margin-top:3px">Pipe <strong>capacity</strong> — max bits/sec the link can carry</div>
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:4px">Throughput</div>
      <div style="font-size:20px;font-weight:700;color:#818cf8">${s.tp}</div>
      <div style="font-size:11.5px;color:var(--text2);margin-top:3px"><strong>All</strong> bits transferred (data + headers + retransmits)</div>
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:4px">Goodput</div>
      <div style="font-size:20px;font-weight:700;color:#4ade80">${s.gp}</div>
      <div style="font-size:11.5px;color:var(--text2);margin-top:3px"><strong>Useful</strong> payload delivered to the application</div>
    </div>
  `;
  document.getElementById('perf-pipe-explainer').innerHTML = s.explainer;
}

function showPipeScene(scene, btn) {
  document.querySelectorAll('#perf-btns .btn').forEach(b => {
    b.className = b === btn ? 'btn btn-primary' : 'btn btn-ghost';
    b.style.cssText = 'font-size:12px;padding:6px 14px;';
  });
  drawPipeSVG(scene);
}

window.showPipeScene = showPipeScene;
drawPipeSVG('ideal');
