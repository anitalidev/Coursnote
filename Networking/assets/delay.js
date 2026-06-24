// ── Delay Calculator ──
function calcDelay() {
  const L = document.getElementById('calc-L').value !== '' ? parseFloat(document.getElementById('calc-L').value) : null;
  const R = document.getElementById('calc-R').value !== '' ? parseFloat(document.getElementById('calc-R').value) : null;
  const D = document.getElementById('calc-D').value !== '' ? parseFloat(document.getElementById('calc-D').value) : null;
  const V = document.getElementById('calc-V').value !== '' ? parseFloat(document.getElementById('calc-V').value) : null;
  const fmt = v => v < 0.001 ? (v * 1e6).toFixed(2) + ' µs' : v < 1 ? (v * 1000).toFixed(2) + ' ms' : v.toFixed(4) + ' s';
  const na = '<span>N/A</span>';
  const hasTrans = L !== null && R !== null && R !== 0;
  const hasProp  = D !== null && V !== null && V !== 0;
  document.getElementById('calc-trans').innerHTML = hasTrans ? fmt(L / R) : na;
  document.getElementById('calc-prop').innerHTML  = hasProp  ? fmt(D / V) : na;
  document.getElementById('calc-total').innerHTML = (hasTrans && hasProp) ? fmt(L / R + D / V) : na;
}
window.calcDelay = calcDelay;

// ── Queue Traffic Intensity Demo ──
function updateQueueDemo() {
  const slider = document.getElementById('intensity-slider');
  if (!slider) return;
  const intensity = slider.value / 100;
  document.getElementById('intensity-val').textContent = intensity.toFixed(2);
  const canvas = document.getElementById('queue-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const queueDelay = intensity >= 0.99 ? 999 : intensity < 0.01 ? 0 : (intensity * intensity) / (1 - intensity) * 20;
  const barW = Math.min((queueDelay / 100) * (W - 200), W - 220);
  const barColor = intensity < 0.5 ? '#34d399' : intensity < 0.8 ? '#fbbf24' : '#f87171';
  ctx.fillStyle = '#22263a'; ctx.roundRect(20, 30, W - 40, 40, 6); ctx.fill();
  if (barW > 0) { ctx.fillStyle = barColor; ctx.roundRect(20, 30, barW + 40, 40, 6); ctx.fill(); }
  ctx.fillStyle = '#e2e8f0'; ctx.font = '13px system-ui'; ctx.fillText('Queue Delay:', 30, 56);
  ctx.fillStyle = barColor; ctx.font = 'bold 13px system-ui';
  ctx.fillText(intensity >= 0.99 ? '∞ (queue overflows!)' : queueDelay.toFixed(1) + ' ms (relative)', 140, 56);
  ctx.fillStyle = '#64748b'; ctx.font = '11px system-ui';
  const msg = intensity < 0.5 ? 'Network lightly loaded — minimal delay'
    : intensity < 0.8 ? 'Moderate congestion — delays increasing'
    : intensity < 0.99 ? 'High congestion — delays rising rapidly'
    : '⚠ Queue overflows — packets dropped!';
  ctx.fillText(msg, 30, 88);
}
window.updateQueueDemo = updateQueueDemo;

// ── Delay Animation ──
(function() {
  const REAL = { proc: 0.08, queue: 5, trans: 0.4, prop: 10 };
  const ANIM = { proc: 3500, queuePerPkt: 1500, trans: 2500, prop: 5000 };
  let raf = null, playing = false, startedAt = null;
  let elapsed = 0, paused = 0, pausedAt = 0;

  const cvEl     = () => document.getElementById('delay-anim-canvas');
  const queueLen = () => parseInt(document.getElementById('delay-queue-len')?.value ?? 2);

  function phaseDurations() { return [ANIM.proc, queueLen() * ANIM.queuePerPkt, ANIM.trans, ANIM.prop]; }
  function totalDur()       { return phaseDurations().reduce((a, b) => a + b, 0); }
  function ease(t)          { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  function draw(elapsed) {
    const cv = cvEl(); if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const durations = phaseDurations();
    const ql = queueLen();
    const senderW = 36, senderH = 50, senderX = 4, senderY = H/2 - senderH/2;
    const routerX = Math.round(W/2 - 65), routerW = 130, routerH = 110, routerY = H/2 - routerH/2;
    const entryZoneW = 42, queueZoneX = routerX + entryZoneW + 4;
    const destW = 40, destH = 50, destX = W - destW - 4, destY = H/2 - destH/2;
    const wireY = H/2, wireLeft = routerX + routerW, wireRight = destX;
    const pktW = 22, pktH = 14;

    let cumul = 0;
    const phaseStarts = durations.map(d => { const s = cumul; cumul += d; return s; });
    let curPhase = 4, phaseElapsed = 0;
    for (let i = 0; i < 4; i++) {
      const end = i < 3 ? phaseStarts[i+1] : totalDur();
      if (elapsed >= phaseStarts[i] && elapsed < end) { curPhase = i; phaseElapsed = elapsed - phaseStarts[i]; break; }
    }
    if (elapsed === 0) { curPhase = -1; phaseElapsed = 0; }
    const pct = p => Math.min(1, phaseElapsed / durations[p]);

    ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(senderX+senderW, wireY); ctx.lineTo(routerX, wireY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wireLeft, wireY); ctx.lineTo(wireRight, wireY); ctx.stroke();

    ctx.fillStyle = '#1e2235'; ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 1.5;
    rr(ctx, senderX, senderY, senderW, senderH, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('SRC', senderX+senderW/2, senderY+senderH/2+3);

    const transInSub  = curPhase === 0 && pct(0) <= 0.50;
    const procActive  = curPhase === 0 && !transInSub;
    const queueActive = curPhase === 1;
    const idleState   = curPhase === -1;
    ctx.fillStyle   = procActive ? 'rgba(244,114,182,0.07)' : queueActive ? 'rgba(251,191,36,0.06)' : (idleState||transInSub) ? 'rgba(108,142,247,0.07)' : '#1e2235';
    ctx.strokeStyle = procActive ? '#f472b6' : queueActive ? '#fbbf24' : (idleState||transInSub) ? '#6c8ef7' : '#2e3352';
    ctx.lineWidth   = (procActive||queueActive||idleState||transInSub) ? 2 : 1.5;
    rr(ctx, routerX, routerY, routerW, routerH, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('ROUTER/SWITCH', routerX+routerW/2, routerY+11);

    ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(routerX+entryZoneW, routerY+16); ctx.lineTo(routerX+entryZoneW, routerY+routerH-6); ctx.stroke();

    const maxSlots = 6, slotH = 13, slotW = routerW - entryZoneW - 12;
    const slotX = queueZoneX, slotAreaH = maxSlots*slotH+(maxSlots-1)*2;
    const slotAreaY = routerY + (routerH-slotAreaH)/2;
    for (let i = 0; i < maxSlots; i++) {
      const sy = slotAreaY + i*(slotH+2);
      ctx.fillStyle = '#22263a'; ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 1;
      rr(ctx, slotX, sy, slotW, slotH, 3); ctx.fill(); ctx.stroke();
    }
    function drawSlotPkt(slotF, fillColor, label) {
      const sy = slotAreaY + slotF*(slotH+2);
      if (sy+slotH < slotAreaY || sy > slotAreaY+slotAreaH) return;
      ctx.fillStyle = fillColor; rr(ctx, slotX, sy, slotW, slotH, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '7px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(label, slotX+slotW/2, sy+slotH/2+2.5);
    }
    if (curPhase === 0) {
      for (let i = 0; i < Math.min(ql, maxSlots); i++) drawSlotPkt(i, 'rgba(251,191,36,0.45)', 'PKT');
    } else if (curPhase === 1) {
      const rawDrain = pct(1)*ql, slideF = ease(rawDrain%1);
      for (let i = 0; i < ql; i++) {
        const slotF = i - rawDrain;
        if (slotF < -1) continue;
        drawSlotPkt(slotF, `rgba(251,191,36,${slotF<0?Math.max(0,1+slotF*3):0.45})`, 'PKT');
      }
    }

    const inWireStart = senderX+senderW, inWireEnd = routerX;
    const entryLandX = routerX+6, entryLandY = routerY+routerH/2-pktH/2;
    const inBarMaxW = (inWireEnd-inWireStart)*0.5;

    if (curPhase === 0) {
      if (pct(0) <= 0.50) {
        const propT = Math.min(pct(0)/0.50,1), barW = inBarMaxW*(1-ease(propT)), leftX = inWireEnd-barW, by = wireY-pktH/2;
        if (barW > 0) {
          ctx.fillStyle = '#6c8ef728'; rr(ctx,leftX,by,barW,pktH,3); ctx.fill();
          ctx.strokeStyle = '#6c8ef7'; ctx.lineWidth = 1.5; rr(ctx,leftX,by,barW,pktH,3); ctx.stroke();
          ctx.shadowColor = '#6c8ef7'; ctx.shadowBlur = 8; ctx.strokeStyle = '#6c8ef7'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(leftX,by); ctx.lineTo(leftX,by+pktH); ctx.stroke(); ctx.shadowBlur = 0;
          if (barW > 28) { ctx.fillStyle = '#6c8ef7'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PKT',leftX+barW/2,wireY+3); }
        }
      }
      if (pct(0) > 0.50) {
        const cx = routerX+entryZoneW/2, cy = routerY+routerH*0.62, spinR = 11;
        const spinAngle = (phaseElapsed/500)*Math.PI*2;
        ctx.strokeStyle = '#2e3352'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx,cy,spinR,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx,cy,spinR,spinAngle,spinAngle+Math.PI*1.3); ctx.stroke();
        ctx.fillStyle = '#f472b6'; ctx.font = 'bold 6px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('Processing',cx,cy+spinR+9);
      }
    }

    if (curPhase === 1) {
      const rawDrain = pct(1)*ql, ourSlotF = ql-rawDrain;
      const dX = slotX+(slotW-pktW)/2, dY = slotAreaY+ourSlotF*(slotH+2)+(slotH-pktH)/2;
      const joinFrac = Math.min(pct(1)/0.12,1);
      const pkX = entryLandX+(dX-entryLandX)*ease(joinFrac), pkY = entryLandY+(dY-entryLandY)*ease(joinFrac);
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 5; ctx.fillStyle = '#fbbf24';
      rr(ctx,pkX,pkY,pktW,pktH,3); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('PKT',pkX+pktW/2,pkY+pktH/2+2.5);
    }

    const isDone = elapsed >= totalDur();
    ctx.fillStyle   = isDone ? 'rgba(52,211,153,0.1)' : '#1e2235';
    ctx.strokeStyle = isDone ? '#34d399' : '#2e3352'; ctx.lineWidth = isDone ? 2 : 1.5;
    rr(ctx,destX,destY,destW,destH,6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isDone ? '#34d399' : '#64748b'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('DEST',destX+destW/2,destY+destH/2-3);
    if (isDone) { ctx.font = 'bold 12px system-ui'; ctx.fillText('✓',destX+destW/2,destY+destH/2+11); }

    const wireLen = wireRight-wireLeft;
    if (curPhase === 2 || curPhase >= 3) {
      const barFrac = curPhase === 2 ? pct(2)*0.5 : 0.5, barW = wireLen*barFrac;
      let bx = wireLeft;
      if (curPhase === 3) bx = wireLeft+(wireRight-wireLeft-barW)*ease(pct(3));
      else if (curPhase === 4) bx = wireRight-barW;
      const by = wireY-pktH/2, col = curPhase === 2 ? '#6c8ef7' : '#34d399';
      ctx.fillStyle = col+'28'; rr(ctx,bx,by,barW,pktH,3); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; rr(ctx,bx,by,barW,pktH,3); ctx.stroke();
      ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx+barW,by); ctx.lineTo(bx+barW,by+pktH); ctx.stroke(); ctx.shadowBlur = 0;
      if (curPhase === 2 || curPhase >= 3) {
        ctx.shadowColor = '#34d399'; ctx.shadowBlur = 10; ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.arc(bx+barW,wireY,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
      }
      if (barW > 30) { ctx.fillStyle = col; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PKT',bx+barW/2,wireY+3); }
    }

    if (curPhase === -1) {
      const bx = inWireEnd-inBarMaxW, by = wireY-pktH/2;
      ctx.fillStyle = '#6c8ef728'; rr(ctx,bx,by,inBarMaxW,pktH,3); ctx.fill();
      ctx.strokeStyle = '#6c8ef7'; ctx.lineWidth = 1.5; rr(ctx,bx,by,inBarMaxW,pktH,3); ctx.stroke();
      ctx.fillStyle = '#6c8ef7'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('PKT',bx+inBarMaxW/2,wireY+3);
    }

    const inPropSub = curPhase === 0 && pct(0) <= 0.50;
    const phaseLabels  = [inPropSub ? 'Transmission (in)…' : 'Processing…', 'Queuing…', 'Transmission (out)…', 'Propagating (out)…', 'Delivered!'];
    const phaseColors2 = [inPropSub ? '#6c8ef7' : '#f472b6', '#fbbf24', '#6c8ef7', '#34d399', '#34d399'];
    if (curPhase >= 0 && curPhase <= 4) {
      ctx.fillStyle = phaseColors2[curPhase]; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(phaseLabels[curPhase], W/2, H/2-routerH/2-10);
    }

    const realMs = [REAL.proc, ql*REAL.queue, REAL.trans, REAL.prop];
    const ids    = ['proc','queue','trans','prop'];
    const colors = ['#f472b6','#fbbf24','#6c8ef7','#34d399'];
    ids.forEach((id, i) => {
      const card = document.getElementById('dph-'+id);
      const tEl  = document.getElementById('dph-'+id+'-t');
      if (!card || !tEl) return;
      let active, done2;
      if (i === 2) {
        active = inPropSub || curPhase === 2;
        done2  = !active && ((curPhase===0&&!inPropSub)||curPhase>=1);
      } else if (i === 3) {
        active = curPhase === 2 || curPhase === 3;
        done2  = curPhase > 3 || isDone;
      } else if (i === 0) {
        active = curPhase === 0 && !inPropSub;
        done2  = (curPhase===0&&!inPropSub&&pct(0)>=1)||curPhase>0||isDone;
      } else {
        active = curPhase === i;
        done2  = curPhase > i || isDone;
      }
      card.style.borderColor = active ? colors[i] : done2 ? colors[i]+'55' : 'var(--border)';
      card.style.background  = active ? colors[i]+'18' : 'var(--bg3)';
      if (active) {
        tEl.style.color = colors[i];
        if (i===2&&inPropSub) tEl.textContent = (REAL.trans*Math.min(pct(0)/0.5,1)).toFixed(2)+' ms';
        else if (i===2&&curPhase===2) tEl.textContent = (REAL.trans+REAL.trans*pct(2)).toFixed(2)+' ms';
        else if (i===3) { const pt=ANIM.trans+ANIM.prop, pe=curPhase===2?pct(2)*ANIM.trans:ANIM.trans+pct(3)*ANIM.prop; tEl.textContent=(REAL.prop*pe/pt).toFixed(2)+' ms'; }
        else if (i===0&&!inPropSub&&curPhase===0) tEl.textContent=(REAL.proc*Math.min((pct(0)-0.5)/0.5,1)).toFixed(2)+' ms';
        else tEl.textContent=(realMs[i]*pct(i)).toFixed(2)+' ms';
      } else if (done2) {
        tEl.style.color = colors[i]+'99';
        const transDoneVal = i===2?((curPhase>2||isDone)?2*REAL.trans:REAL.trans):realMs[i];
        tEl.textContent = transDoneVal.toFixed(2)+' ms';
      } else { tEl.style.color='var(--text3)'; tEl.textContent='—'; }
    });

    const totalEl = document.getElementById('dph-total-t');
    if (totalEl) {
      if (isDone) totalEl.textContent = realMs.reduce((a,b)=>a+b,0).toFixed(2)+' ms (this hop)';
      else if (curPhase >= 0) { const acc=realMs.slice(0,curPhase).reduce((a,b)=>a+b,0)+realMs[curPhase]*pct(curPhase); totalEl.textContent=acc.toFixed(2)+' ms…'; }
      else totalEl.textContent = '—';
    }
  }

  function tick(ts) {
    if (!startedAt) startedAt = ts;
    elapsed = ts - startedAt - paused;
    if (elapsed >= totalDur()) {
      elapsed = totalDur(); draw(elapsed); playing = false;
      document.getElementById('delay-anim-btn').textContent = '▶ Replay';
      return;
    }
    draw(elapsed);
    if (playing) raf = requestAnimationFrame(tick);
  }

  window.delayAnimToggle = function() {
    const btn = document.getElementById('delay-anim-btn');
    if (!playing) {
      if (elapsed >= totalDur()) { window.delayAnimReset(); return; }
      if (pausedAt) { paused += performance.now()-pausedAt; pausedAt = 0; }
      playing = true; btn.textContent = '⏸ Pause';
      raf = requestAnimationFrame(tick);
    } else {
      playing = false; pausedAt = performance.now(); btn.textContent = '▶ Resume';
    }
  };

  window.delayAnimReset = function() {
    if (raf) cancelAnimationFrame(raf);
    playing = false; startedAt = null; elapsed = 0; paused = 0; pausedAt = 0;
    document.getElementById('delay-anim-btn').textContent = '▶ Play';
    draw(0);
  };

  setTimeout(() => draw(0), 50);
})();

calcDelay();
setTimeout(updateQueueDemo, 100);
