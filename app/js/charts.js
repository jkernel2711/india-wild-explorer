/* Tiny dependency-free SVG chart kit */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const fmt = v => v >= 100000 ? (v / 100000).toFixed(v >= 1000000 ? 1 : 2).replace(/\.?0+$/, '') + ' L' : v.toLocaleString('en-IN');
  const niceMax = (m) => {
    if (m <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(m)));
    for (const s of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (s * p >= m) return s * p;
    return 10 * p;
  };

  /**
   * lineChart(container, {
   *   series: [{ name, color, data: [{y, v, note}] }],
   *   x0, x1, height, yMin, yFmt, area, labels ('last'|'all'|'none'), unit, legend
   * })
   */
  function lineChart(box, o) {
    box.innerHTML = '';
    const W = Math.max(320, box.clientWidth || 600), H = o.height || 320;
    const m = { l: 56, r: o.labels === 'none' ? 18 : 56, t: 20, b: 34 };
    const all = o.series.flatMap(s => s.data);
    const x0 = o.x0 ?? Math.min(...all.map(d => d.y)), x1 = o.x1 ?? Math.max(...all.map(d => d.y));
    const vmax = Math.max(...all.map(d => d.v));
    const yMin = o.yMin ?? 0;
    const yMax = niceMax(vmax * 1.08 - yMin) + yMin;
    const X = y => m.l + (y - x0) / (x1 - x0 || 1) * (W - m.l - m.r);
    const Y = v => m.t + (1 - (v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
    const yF = o.yFmt || fmt;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img' }, box);
    const defs = el('defs', {}, svg);
    // grid + y axis
    const g = el('g', { class: 'grid' }, svg), ax = el('g', { class: 'axis' }, svg);
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = yMin + (yMax - yMin) * i / ticks, y = Y(v);
      if (i > 0) el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y }, g);
      const t = el('text', { x: m.l - 10, y: y + 4, 'text-anchor': 'end' }, ax); t.textContent = yF(Math.round(v));
    }
    el('line', { class: 'baseline', x1: m.l, x2: W - m.r, y1: Y(yMin), y2: Y(yMin) }, svg);
    // x axis
    const span = x1 - x0, step = span > 16 ? 4 : span > 8 ? 2 : 1;
    for (let yr = Math.ceil(x0 / step) * step; yr <= x1; yr += step) {
      const t = el('text', { x: X(yr), y: H - 10, 'text-anchor': 'middle' }, ax); t.textContent = yr;
    }
    // annotations (vertical dashed markers)
    (o.annotations || []).forEach(a => {
      el('line', { x1: X(a.x), x2: X(a.x), y1: m.t, y2: Y(yMin), stroke: 'rgba(255,255,255,.18)', 'stroke-dasharray': '4 4' }, svg);
      const t = el('text', { class: 'annot', x: X(a.x) + 6, y: m.t + 12 }, svg); t.textContent = a.text;
    });

    o.series.forEach((s, si) => {
      const d = [...s.data].sort((a, b) => a.y - b.y);
      if (o.area !== false && o.series.length === 1 && d.length > 1) {
        const gid = 'ga' + Math.random().toString(36).slice(2);
        const lg = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        el('stop', { offset: '0%', 'stop-color': s.color, 'stop-opacity': .35 }, lg);
        el('stop', { offset: '100%', 'stop-color': s.color, 'stop-opacity': 0 }, lg);
        const ap = `M${X(d[0].y)},${Y(yMin)} ` + d.map(p => `L${X(p.y)},${Y(p.v)}`).join(' ') + ` L${X(d[d.length - 1].y)},${Y(yMin)}Z`;
        const area = el('path', { d: ap, fill: `url(#${gid})`, opacity: 0 }, svg);
        area.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 500, fill: 'forwards' });
      }
      if (d.length > 1) {
        const lp = el('path', { class: 'line', d: d.map((p, i) => `${i ? 'L' : 'M'}${X(p.y)},${Y(p.v)}`).join(' '), stroke: s.color }, svg);
        const len = lp.getTotalLength();
        lp.style.strokeDasharray = len; lp.style.strokeDashoffset = len;
        lp.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1300, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards', delay: si * 120 });
      }
      d.forEach((p, i) => {
        const c = el('circle', { class: 'pt' + (p.note ? ' method' : ''), cx: X(p.y), cy: Y(p.v), r: 0, fill: s.color }, svg);
        c.animate([{ r: 0 }, { r: 5 }], { duration: 300, delay: 300 + i * 120, fill: 'forwards' });
        const showLbl = o.labels === 'all' || (o.labels !== 'none' && (i === d.length - 1 || (o.series.length === 1 && d.length <= 7)));
        if (showLbl && o.series.length === 1) {
          const t = el('text', { class: 'dlabel', x: X(p.y), y: Y(p.v) - 12, 'text-anchor': 'middle', opacity: 0 }, svg);
          t.textContent = yF(p.v);
          t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 600 + i * 120, fill: 'forwards' });
        } else if (showLbl && i === d.length - 1) {
          const t = el('text', { class: 'dlabel', x: X(p.y) + 9, y: Y(p.v) + 4 }, svg); t.textContent = s.name;
        }
      });
    });

    // legend for multi-series
    if (o.series.length > 1) {
      const lg = document.createElement('div');
      lg.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12.5px;color:var(--text2)';
      o.series.forEach(s => { lg.insertAdjacentHTML('beforeend', `<span style="display:flex;align-items:center;gap:6px"><i style="width:14px;height:3px;border-radius:2px;background:${s.color}"></i>${s.name}</span>`); });
      box.appendChild(lg);
    }

    // hover layer — crosshair snaps to nearest year with data
    const years = [...new Set(all.map(d => d.y))].sort((a, b) => a - b);
    const xh = el('line', { class: 'xhair', y1: m.t, y2: Y(yMin), opacity: 0 }, svg);
    const tip = document.createElement('div'); tip.className = 'tooltip'; box.appendChild(tip);
    const hit = el('rect', { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', e => {
      const r = svg.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width;
      let best = years[0];
      years.forEach(y => { if (Math.abs(X(y) - mx) < Math.abs(X(best) - mx)) best = y; });
      xh.setAttribute('x1', X(best)); xh.setAttribute('x2', X(best)); xh.setAttribute('opacity', 1);
      let html = `<b>${best}</b>`;
      o.series.forEach(s => {
        const p = s.data.find(d => d.y === best);
        if (p) html += `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span style="display:flex;gap:6px;align-items:center"><i style="width:8px;height:8px;border-radius:50%;background:${s.color}"></i>${o.series.length > 1 ? s.name : (o.unit || s.name)}</span><span class="tv" style="font-size:${o.series.length > 1 ? 14 : 18}px">${yF(p.v)}</span></div>${p.note ? `<div class="muted small">${p.note}</div>` : ''}`;
      });
      tip.innerHTML = html; tip.classList.add('show');
      const px = X(best) * r.width / W, left = px + 14 + tip.offsetWidth > r.width ? px - tip.offsetWidth - 14 : px + 14;
      tip.style.left = left + 'px'; tip.style.top = '10px';
    });
    hit.addEventListener('mouseleave', () => { xh.setAttribute('opacity', 0); tip.classList.remove('show'); });
  }

  /** horizontal bars: rows [{name, v, label}], color */
  function barList(box, rows, o = {}) {
    box.innerHTML = '';
    if (!rows.length) { box.innerHTML = `<div class="empty">${o.empty || 'No data'}</div>`; return; }
    const max = Math.max(...rows.map(r => r.v));
    rows.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.title = `${r.name}: ${r.label ?? r.v}`;
      row.innerHTML = `<span class="nm">${r.name}</span><span class="tr"><span class="b" style="background:${r.color || o.color}"></span></span><span class="val">${r.label ?? fmt(r.v)}</span>`;
      if (o.onClick) { row.style.cursor = 'pointer'; row.addEventListener('click', () => o.onClick(r)); }
      box.appendChild(row);
      requestAnimationFrame(() => setTimeout(() => { row.querySelector('.b').style.width = Math.max(1.5, r.v / max * 100) + '%'; }, 40 + i * 25));
    });
  }

  window.Charts = { lineChart, barList, fmt };
})();
