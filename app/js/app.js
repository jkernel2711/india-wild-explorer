(function () {
  const D = window.DATA, G = window.GEO, { lineChart, barList, fmt } = window.Charts;
  const $ = s => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const num = v => v.toLocaleString('en-IN');

  // categorical palette (dark-mode steps, fixed order)
  const CAT = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

  const EMOJI = [
    [/snow leopard/, '🐈'], [/clouded leopard|fishing cat/, '🐈'], [/tiger/, '🐅'], [/elephant/, '🐘'], [/lion-tailed|macaque|langur|gibbon/, '🐒'], [/lion/, '🦁'], [/rhino/, '🦏'],
    [/leopard|cheetah/, '🐆'], [/buffalo|gaur/, '🐃'], [/deer|barasingha|sambar|hangul|sangai|chinkara|nilgai/, '🦌'], [/bear/, '🐻'],
    [/dog|wolf|hyena/, '🐺'], [/fox/, '🦊'], [/croc|mugger|gharial/, '🐊'], [/python/, '🐍'], [/bustard|tragopan|bird/, '🦚'],
    [/otter/, '🦦'], [/hare/, '🐇'], [/hog/, '🐗'], [/tahr|bharal|urial|sheep/, '🐐']
  ];
  const emojiFor = n => (EMOJI.find(([r]) => r.test(n.toLowerCase())) || [, '🐾'])[1];
  const topSpecies = p => Object.entries(p.counts).sort((a, b) => b[1] - a[1])[0][0];

  const nav = $('#nav');
  addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
  const links = [...document.querySelectorAll('.nav-links a')];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('header, section').forEach(s => io.observe(s));
  const revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } }), { threshold: .12 });
  const reveal = n => { n.classList.add('reveal'); revealIO.observe(n); };

  const heroArt = $('#heroArt');
  Scenes.draw(heroArt, 'hero', { seed: 7 });
  Scenes.fireflies($('#fireflies'));
  const heroLayers = [...heroArt.querySelectorAll('.layer')];
  $('#home').addEventListener('mousemove', e => {
    const dx = e.clientX / innerWidth - .5, dy = e.clientY / innerHeight - .5;
    heroLayers.forEach(l => { const d = +l.dataset.depth; l.style.transform = `translate(${-dx * d * 40}px, ${-dy * d * 16}px)`; });
  });
  addEventListener('scroll', () => { if (scrollY < innerHeight) heroArt.style.transform = `translateY(${scrollY * .3}px)`; }, { passive: true });

  const heroStats = [
    { k: 'Forest cover (km²)', v: D.national.forestCover, e: '🌳' },
    { k: 'Wild tigers', v: D.species.tiger.count, e: '🐅' },
    { k: 'Wild elephants', v: D.species.elephant.count, e: '🐘' },
    { k: 'Asiatic lions', v: D.species.lion.count, e: '🦁' },
    { k: 'Tiger reserves', v: D.national.pas.tr, e: '🛡️' }
  ];
  $('#heroStats').innerHTML = heroStats.map(s => `<div class="hstat"><div class="v" data-count="${s.v}">0</div><div class="k">${s.e} ${s.k}</div></div>`).join('');
  const countUp = (node) => {
    const to = +node.dataset.count, t0 = performance.now(), dur = 1800;
    (function f(t) { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4); node.textContent = num(Math.round(to * e)); if (p < 1) requestAnimationFrame(f); })(t0);
  };
  setTimeout(() => document.querySelectorAll('#heroStats [data-count]').forEach(countUp), 300);

  const LAYERS = [
    { id: 'pct', name: 'Forest cover %', ico: '🌳', get: s => s.pct, hue: [150, 70], fmt: v => v.toFixed(1) + '%', legend: 'Forest cover, % of state area', max: 90, lin: true },
    { id: 'fc', name: 'Forest area', ico: '🗺️', get: s => s.fc, hue: [160, 65], fmt: v => num(v) + ' km²', legend: 'Forest area (km²)' },
    { id: 'tiger22', name: 'Tigers', ico: '🐅', sp: 'tiger', get: s => s.tiger22, hue: [36, 95], fmt: v => num(v) + ' tigers', legend: 'Tigers, 2022 census' },
    { id: 'elephant17', name: 'Elephants', ico: '🐘', sp: 'elephant', get: s => s.elephant17, hue: [205, 60], fmt: v => num(v) + ' elephants', legend: 'Elephants, 2017 state census' },
    { id: 'leopard22', name: 'Leopards', ico: '🐆', sp: 'leopard', get: s => s.leopard22, hue: [22, 90], fmt: v => num(v) + ' leopards', legend: 'Leopards, 2022 estimate' },
    { id: 'lion', name: 'Lions', ico: '🦁', sp: 'lion', get: s => s.lion, hue: [48, 95], fmt: v => num(v) + ' lions', legend: 'Asiatic lions, 2025' },
    { id: 'rhino', name: 'Rhinos', ico: '🦏', sp: 'rhino', get: s => s.rhino, hue: [280, 45], fmt: v => '~' + num(v) + ' rhinos', legend: 'One-horned rhinos, 2022 (approx.)' },
    { id: 'snowleopard', name: 'Snow leopards', ico: '❄️', sp: 'snowleopard', get: s => s.snowleopard, hue: [195, 70], fmt: v => num(v) + ' snow leopards', legend: 'Snow leopards, 2024 (SPAI)' }
  ];
  let layer = LAYERS[0];
  const svg = $('#indiaMap');
  svg.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
  svg.innerHTML = `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>`;
  const gWorld = document.createElementNS(NS, 'g'); svg.appendChild(gWorld);
  const gGlow = document.createElementNS(NS, 'g'); gWorld.appendChild(gGlow);
  const gStates = document.createElementNS(NS, 'g'); gWorld.appendChild(gStates);
  const gBubbles = document.createElementNS(NS, 'g'); gWorld.appendChild(gBubbles);
  const gPins = document.createElementNS(NS, 'g'); gPins.setAttribute('class', 'pins'); gWorld.appendChild(gPins);
  const statePaths = {};
  G.states.forEach(s => {
    const glow = document.createElementNS(NS, 'path'); glow.setAttribute('d', s.d); glow.setAttribute('class', 'st-outline'); gGlow.appendChild(glow);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', s.d); p.setAttribute('class', 'st'); p.dataset.name = s.name;
    gStates.appendChild(p); statePaths[s.name] = p;
  });

  // Mercator projection shared with the geo build
  const PR = G.proj, K = G.W / ((PR.LON1 - PR.LON0) * Math.PI / 180);
  const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const proj = (lon, lat) => [(lon - PR.LON0) * Math.PI / 180 * K, (merc(PR.LAT1) - merc(lat)) * K];

  // colour scale: dark → bright within one hue
  const scale = (t, [h, sat]) => `hsl(${h} ${sat * (0.35 + 0.65 * t)}% ${14 + t * 50}%)`;
  const NODATA = '#18261f';

  function paintLayer() {
    const vals = Object.values(D.states).map(layer.get).filter(v => v > 0);
    const max = layer.max || Math.max(...vals);
    G.states.forEach(s => {
      const st = D.states[s.name], v = st ? layer.get(st) : null;
      const t = v > 0 ? (layer.lin ? v / max : Math.sqrt(v / max)) : -1;
      statePaths[s.name].style.fill = t < 0 ? NODATA : scale(Math.min(1, t), layer.hue);
    });
    // bubbles for species layers
    gBubbles.innerHTML = '';
    if (layer.sp) {
      G.states.forEach(s => {
        const st = D.states[s.name], v = st && layer.get(st);
        if (!v) return;
        const r = 4 + Math.sqrt(v / max) * 34;
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', s.c[0]); c.setAttribute('cy', s.c[1]); c.setAttribute('r', 0); c.setAttribute('class', 'bubble');
        c.style.fill = `hsl(${layer.hue[0]} 95% 60% / .22)`; c.style.stroke = `hsl(${layer.hue[0]} 95% 65%)`;
        gBubbles.appendChild(c);
        requestAnimationFrame(() => c.setAttribute('r', r));
        if (v >= max * .06) {
          const t = document.createElementNS(NS, 'text'); t.setAttribute('x', s.c[0]); t.setAttribute('cy0', s.c[1]); t.setAttribute('y', s.c[1] + 4); t.setAttribute('class', 'bubble-lbl'); t.textContent = num(v);
          gBubbles.appendChild(t);
        }
      });
    }
    applyView();
    const stops = [0, .25, .5, .75, 1].map(t => scale(t, layer.hue)).join(',');
    $('#mapLegend').innerHTML = `<div class="ttl">${layer.legend}</div><div class="ramp" style="background:linear-gradient(90deg,${stops})"></div>
      <div class="ticks"><span>${layer.lin ? '0%' : 'low'}</span><span>${layer.lin ? max + '%' : layer.fmt(max).replace(/ .*/, '') + '+'}</span></div>
      <div class="pinkey"><i></i> National park / tiger reserve — click to explore</div>
      <div class="pinkey"><i style="background:${NODATA};box-shadow:none;border:1px solid #2c4034;border-radius:3px"></i> No population recorded</div>`;
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.toggle('on', b.dataset.id === layer.id));
    if (selected) showState(selected, false);
  }

  $('#layerList').innerHTML = LAYERS.map(l => {
    const tot = l.sp ? D.species[l.sp].count : null;
    return `<button class="layer-btn" data-id="${l.id}"><span class="ico">${l.ico}</span>${l.name}${tot ? `<span class="tot">${num(tot)}</span>` : ''}</button>`;
  }).join('');
  $('#layerList').addEventListener('click', e => { const b = e.target.closest('.layer-btn'); if (b) { layer = LAYERS.find(l => l.id === b.dataset.id); paintLayer(); } });

  D.parks.forEach(p => {
    const [x, y] = proj(p.lon, p.lat); p.x = x; p.y = y;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'pin'); g.dataset.id = p.id;
    g.innerHTML = `<circle class="ring" r="7"/><circle class="dot" r="5"/>`;
    gPins.appendChild(g); p.node = g;
  });

  const home = { x: -20, y: -10, w: G.W + 40, h: G.H + 20 };
  let view = { ...home };
  const mapBox = $('#atlasMap');
  function applyView() {
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    const u = Math.max(view.w / (svg.clientWidth || 1), view.h / (svg.clientHeight || 1)); // svg units per screen px
    D.parks.forEach(p => p.node.setAttribute('transform', `translate(${p.x},${p.y}) scale(${u * 1.05})`));
    gBubbles.querySelectorAll('text').forEach(t => { t.style.fontSize = (12 * u) + 'px'; t.setAttribute('y', +t.getAttribute('cy0') + 4 * u); });
  }
  function fitAspect(v) {
    const r = mapBox.clientWidth / mapBox.clientHeight || 1;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    let w = v.w, h = v.h; if (w / h > r) h = w / r; else w = h * r;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }
  let anim;
  function animateTo(target, dur = 650) {
    cancelAnimationFrame(anim);
    const from = { ...view }, to = fitAspect(target), t0 = performance.now();
    (function f(t) {
      const p = Math.min(1, (t - t0) / dur), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      for (const k in view) view[k] = from[k] + (to[k] - from[k]) * e;
      applyView(); if (p < 1) anim = requestAnimationFrame(f);
    })(t0);
  }
  function zoomAt(f, cx, cy) {
    const nw = Math.min(home.w * 1.3, Math.max(40, view.w * f)), s = nw / view.w;
    view = { x: cx - (cx - view.x) * s, y: cy - (cy - view.y) * s, w: view.w * s, h: view.h * s }; applyView();
  }
  const toSvg = (e) => { const r = svg.getBoundingClientRect(); return [view.x + (e.clientX - r.left) / r.width * view.w, view.y + (e.clientY - r.top) / r.height * view.h]; };
  svg.addEventListener('wheel', e => { e.preventDefault(); cancelAnimationFrame(anim); const [x, y] = toSvg(e); zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
  let drag = null, moved = false;
  svg.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, v: { ...view } }; moved = false; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const r = svg.getBoundingClientRect(), dx = (e.clientX - drag.x) / r.width * view.w, dy = (e.clientY - drag.y) / r.height * view.h;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) { moved = true; mapBox.classList.add('drag'); hideTip(); }
    if (moved) { view.x = drag.v.x - dx; view.y = drag.v.y - dy; applyView(); }
  });
  addEventListener('pointerup', () => { drag = null; mapBox.classList.remove('drag'); });
  const zoomCenter = f => zoomAt(f, view.x + view.w / 2, view.y + view.h / 2);
  $('#zoomIn').onclick = () => zoomCenter(1 / 1.4);
  $('#zoomOut').onclick = () => zoomCenter(1.4);
  $('#zoomReset').onclick = () => { animateTo(home); clearSel(); };
  $('#togglePins').onclick = e => { gPins.classList.toggle('hidden'); e.currentTarget.classList.toggle('off'); };
  addEventListener('resize', () => { view = fitAspect(view); applyView(); });

  const tip = $('#tooltip');
  function showTip(e, html) {
    tip.innerHTML = html; tip.classList.add('show');
    const r = mapBox.getBoundingClientRect();
    let x = e.clientX - r.left + 16, y = e.clientY - r.top + 16;
    if (x + tip.offsetWidth > r.width - 10) x = e.clientX - r.left - tip.offsetWidth - 16;
    if (y + tip.offsetHeight > r.height - 10) y = e.clientY - r.top - tip.offsetHeight - 16;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const hideTip = () => tip.classList.remove('show');
  svg.addEventListener('mousemove', e => {
    if (drag && moved) return;
    const pin = e.target.closest('.pin');
    if (pin) {
      const p = D.parks.find(q => q.id === pin.dataset.id), sp = topSpecies(p), c = p.counts[sp];
      return showTip(e, `<b>${p.name}</b><span class="muted small">${p.state} · ${p.badge}</span><div style="margin-top:6px">${emojiFor(sp)} <span class="tv">${c ? num(c) : 'Present'}</span> <span class="muted small">${sp}</span></div><div class="muted small" style="margin-top:4px">Click to explore →</div>`);
    }
    const st = e.target.closest('.st');
    if (st) {
      const d = D.states[st.dataset.name], v = d && layer.get(d);
      return showTip(e, `<b>${st.dataset.name}</b><span class="tv">${v ? layer.fmt(v) : '—'}</span><div class="muted small">${layer.legend}</div>`);
    }
    hideTip();
  });
  svg.addEventListener('mouseleave', hideTip);
  svg.addEventListener('click', e => {
    if (moved) return;
    const pin = e.target.closest('.pin');
    if (pin) return openPark(pin.dataset.id);
    const st = e.target.closest('.st');
    if (st) { showState(st.dataset.name, true); }
  });

  let selected = null;
  const info = $('#atlasInfo');
  function clearSel() { selected = null; Object.values(statePaths).forEach(p => p.classList.remove('sel')); showNational(); }
  function showNational() {
    const n = D.national;
    info.innerHTML = `<div class="info-kicker">All of India</div><h3 class="info-title">🌏 India</h3>
      <p class="info-note">India is one of 17 "mega-diverse" countries, with about 8% of all recorded species on just 2.4% of the world's land — including 4 of the world's 36 biodiversity hotspots.</p>
      <div class="meter"><div class="row"><span>Forest cover</span><b>${n.forestPct}%</b></div><div class="track"><div class="fill" style="width:${n.forestPct / 0.9}%"></div></div></div>
      <div class="kv">
        <div><div class="k">🌳 Forest</div><div class="v">${num(n.forestCover)} <small>km²</small></div></div>
        <div><div class="k">🌱 Forest + trees</div><div class="v">${n.totalGreenPct}%</div></div>
        <div><div class="k">🐅 Tigers</div><div class="v">${num(D.species.tiger.count)}</div></div>
        <div><div class="k">🐘 Elephants</div><div class="v">${num(D.species.elephant.count)}</div></div>
        <div><div class="k">🦁 Lions</div><div class="v">${num(D.species.lion.count)}</div></div>
        <div><div class="k">🦏 Rhinos</div><div class="v">~4,000</div></div>
      </div>
      <div class="info-empty" style="padding:18px 0 0"><div class="big">👆</div>Click any state on the map, or a glowing pin to open a national park.</div>`;
  }
  function showState(name, zoom) {
    selected = name;
    Object.values(statePaths).forEach(p => p.classList.toggle('sel', p.dataset.name === name));
    const p = statePaths[name]; p.parentNode.appendChild(p); // bring to front
    const d = D.states[name] || { fc: 0, pct: 0, note: '', type: '' };
    if (zoom) { const b = p.getBBox(), pad = Math.max(b.width, b.height) * .35 + 20; animateTo({ x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 }); }
    const parks = D.parks.filter(q => q.state === name);
    const sp = [['🐅', 'Tigers (2022)', d.tiger22, d.tiger18 ? `<small>${d.tiger22 >= d.tiger18 ? '▲' : '▼'} from ${d.tiger18}</small>` : ''], ['🐘', 'Elephants (2017)', d.elephant17], ['🐆', 'Leopards (2022)', d.leopard22], ['🦁', 'Lions (2025)', d.lion], ['🦏', 'Rhinos (2022)', d.rhino], ['❄️', 'Snow leopards', d.snowleopard], ['🐆', 'Cheetahs (2025)', d.cheetah]].filter(x => x[2]);
    const rank = Object.entries(D.states).sort((a, b) => b[1].fc - a[1].fc).findIndex(x => x[0] === name) + 1;
    info.innerHTML = `<div class="info-kicker">State / Union Territory</div><h3 class="info-title">${name}</h3>
      <p class="muted small" style="margin:0">${d.type}</p>
      <p class="info-note">${d.note}</p>
      <div class="meter"><div class="row"><span>Forest cover</span><b>${d.pct.toFixed(1)}%</b></div><div class="track"><div class="fill"></div></div></div>
      <div class="kv"><div><div class="k">🌳 Forest area</div><div class="v">${num(d.fc)} <small>km²</small></div></div><div><div class="k">🏆 Rank by area</div><div class="v">#${rank} <small>of 36</small></div></div></div>
      ${sp.length ? `<div class="info-h">Big animals</div><div class="kv">${sp.map(x => `<div><div class="k">${x[0]} ${x[1]}</div><div class="v">${num(x[2])} ${x[3] || ''}</div></div>`).join('')}</div>` : ''}
      <div class="info-h">Managed by</div><p class="muted small" style="margin:0">${name} Forest Department — headed by the PCCF (Head of Forest Force), with the Chief Wildlife Warden in charge of protected areas, under the state's Forest Minister.</p>
      ${parks.length ? `<div class="info-h">National parks here</div><div class="mini-parks">${parks.map(q => `<button class="mini-park" data-park="${q.id}"><span style="font-size:20px">${emojiFor(topSpecies(q))}</span><span><div style="font-weight:600;font-size:13.5px">${q.name}</div><div class="muted small">${q.badge}</div></span><span class="go">→</span></button>`).join('')}</div>` : ''}`;
    requestAnimationFrame(() => setTimeout(() => { const f = info.querySelector('.fill'); if (f) f.style.width = Math.min(100, d.pct) + '%'; }, 30));
  }
  info.addEventListener('click', e => { const b = e.target.closest('[data-park]'); if (b) openPark(b.dataset.park); });

  function renderParkList(q = '') {
    q = q.trim().toLowerCase();
    const list = D.parks.filter(p => !q || (p.name + ' ' + p.state + ' ' + Object.keys(p.counts).join(' ') + ' ' + p.badge).toLowerCase().includes(q));
    $('#parkList').innerHTML = list.map(p => `<button class="park-item" data-park="${p.id}"><span class="e">${emojiFor(topSpecies(p))}</span><span><div class="n">${p.name}</div><div class="s">${p.state}</div></span></button>`).join('') || '<p class="muted small">No match.</p>';
  }
  renderParkList();
  $('#parkSearch').addEventListener('input', e => renderParkList(e.target.value));
  $('#parkList').addEventListener('click', e => { const b = e.target.closest('[data-park]'); if (b) openPark(b.dataset.park); });
  $('#parkList').addEventListener('mouseover', e => { const b = e.target.closest('[data-park]'); D.parks.forEach(p => p.node.classList.toggle('hi', b && p.id === b.dataset.park)); });

  paintLayer(); showNational();
  requestAnimationFrame(() => { view = fitAspect(home); applyView(); });

  const modal = $('#parkModal');
  let spreadRAF = null, current = null;
  function openPark(id) {
    const p = D.parks.find(q => q.id === id); current = p;
    Scenes.draw($('#pmArt'), p.biome, { seed: p.id });
    $('#pmType').textContent = p.type;
    $('#pmTitle').textContent = p.name;
    $('#pmState').textContent = `📍 ${p.state} · ${p.lat.toFixed(2)}°N, ${p.lon.toFixed(2)}°E`;
    $('#pmDesc').textContent = p.desc;
    $('#pmFacts').innerHTML = [['Established', p.est], ['Area', num(p.area) + ' km²'], ['Managed by', p.mgmt], ['Best time to visit', p.best], ['Famous for', p.badge], ['Status', p.type.split('·')[0]]]
      .map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
    const entries = Object.entries(p.counts);
    entries.forEach(([k], i) => { p.colors = p.colors || {}; p.colors[k] = CAT[i % CAT.length]; });
    $('#pmCounts').innerHTML = entries.map(([k, v]) => `<div class="pm-count" data-sp="${k}" style="--c:${p.colors[k]}"><span class="e">${emojiFor(k)}</span><span><div class="v ${v ? '' : 'p'}">${v ? '~' + num(v) : 'Present'}</div><div class="k">${k}</div></span></div>`).join('');
    const tw = $('#pmTrendWrap');
    if (p.trend) {
      tw.hidden = false;
      $('#pmTrendTitle').textContent = `${p.trend.label || p.trend.sp[0].toUpperCase() + p.trend.sp.slice(1) + ' count'} over time`;
    } else tw.hidden = true;
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      if (p.trend) lineChart($('#pmTrend'), { series: [{ name: p.trend.sp, color: (D.species[p.trend.sp] || {}).color || '#34d399', data: p.trend.d }], height: 210, x0: 1999, x1: 2025, unit: p.trend.sp });
      startSpread(p);
    });
  }
  function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; cancelAnimationFrame(spreadRAF); }
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function startSpread(p) {
    cancelAnimationFrame(spreadRAF);
    const cv = $('#spread'), ctx = cv.getContext('2d'), dpr = devicePixelRatio || 1;
    const r = cv.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr;
    const W = r.width, H = r.height; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = Scenes.rng(Scenes.hash(p.id));
    // park boundary blob
    const N = 90, cx = W / 2, cy = H / 2, ph = [R() * 6, R() * 6, R() * 6];
    const poly = []; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; const rr = 1 + .13 * Math.sin(a * 2 + ph[0]) + .08 * Math.sin(a * 3 + ph[1]) + .05 * Math.sin(a * 5 + ph[2]); poly.push([cx + Math.cos(a) * W * .43 * rr, cy + Math.sin(a) * H * .41 * rr]); }
    const inside = (x, y) => { let c = false; for (let i = 0, j = N - 1; i < N; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    // pre-render terrain to an offscreen canvas
    const bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; const b = bg.getContext('2d'); b.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pal = { jungle: ['#123822', '#1d4d2e', '#2b6a3c'], rainforest: ['#0f3a2e', '#155240', '#1f6b52'], savanna: ['#4a3a1a', '#6b5424', '#8a6d30'], grassland: ['#2e4a1e', '#3f6127', '#587d34'], dryforest: ['#3d3319', '#544522', '#6b5a2c'], snow: ['#5d6f82', '#8494a6', '#c3cfdc'], mangrove: ['#123a36', '#1b4f48', '#2a6a5c'] }[p.biome] || ['#123822', '#1d4d2e', '#2b6a3c'];
    b.fillStyle = '#081510'; b.fillRect(0, 0, W, H);
    b.save(); b.beginPath(); poly.forEach(([x, y], i) => i ? b.lineTo(x, y) : b.moveTo(x, y)); b.closePath(); b.fillStyle = pal[0]; b.fill(); b.clip();
    for (let i = 0; i < 1400; i++) { const x = R() * W, y = R() * H, s = 2 + R() * 7; b.fillStyle = pal[1 + (R() > .6 ? 1 : 0)]; b.globalAlpha = .35 + R() * .5; b.beginPath(); b.arc(x, y, s, 0, 7); b.fill(); }
    b.globalAlpha = 1;
    const rivers = p.biome === 'mangrove' ? 5 : 1 + (R() > .5 ? 1 : 0);
    for (let k = 0; k < rivers; k++) {
      b.strokeStyle = p.biome === 'snow' ? '#dfe9f5' : '#2f6f8f'; b.lineWidth = p.biome === 'mangrove' ? 5 + R() * 6 : 4 + R() * 3; b.lineCap = 'round'; b.globalAlpha = .8;
      b.beginPath(); let x = R() * W * .3, y = -10; b.moveTo(x, y);
      for (let s = 0; s < 6; s++) { const nx = x + (R() - .3) * W * .3, ny = y + H * .22; b.quadraticCurveTo(x + (R() - .5) * 120, (y + ny) / 2, nx, ny); x = nx; y = ny; }
      b.stroke();
    }
    b.globalAlpha = 1; b.restore();
    b.strokeStyle = 'rgba(251,191,36,.7)'; b.lineWidth = 2; b.setLineDash([6, 5]); b.beginPath(); poly.forEach(([x, y], i) => i ? b.lineTo(x, y) : b.moveTo(x, y)); b.closePath(); b.stroke(); b.setLineDash([]);
    b.fillStyle = 'rgba(251,191,36,.9)'; b.font = '600 11px Inter, Segoe UI, sans-serif'; b.fillText('PARK BOUNDARY', poly[Math.floor(N * .72)][0] - 40, poly[Math.floor(N * .72)][1] - 8);
    b.fillStyle = 'rgba(255,255,255,.7)'; b.font = '700 12px Inter, Segoe UI, sans-serif'; b.fillText('N ↑', W - 38, 22);

    const entries = Object.entries(p.counts);
    const total = entries.reduce((s, [, v]) => s + (v || 0), 0);
    const per = Math.max(1, Math.ceil(total / 450));
    const agents = [];
    entries.forEach(([sp, v]) => {
      const n = v ? Math.max(3, Math.round(v / per)) : 8;
      const clusters = []; for (let c = 0; c < 2 + Math.floor(R() * 4); c++) { let x, y; do { x = W * (.12 + R() * .76); y = H * (.12 + R() * .76); } while (!inside(x, y)); clusters.push([x, y]); }
      const big = /tiger|lion|leopard|cheetah|rhino|elephant/.test(sp);
      for (let i = 0; i < n; i++) {
        const [kx, ky] = clusters[i % clusters.length]; let x, y, tries = 0;
        do { x = kx + (R() + R() + R() - 1.5) * W * .16; y = ky + (R() + R() + R() - 1.5) * H * .16; } while (!inside(x, y) && ++tries < 30);
        if (!inside(x, y)) { x = kx; y = ky; }
        agents.push({ sp, x, y, a: R() * 6.28, v: big ? .12 + R() * .1 : .18 + R() * .15, r: /elephant|rhino/.test(sp) ? 3.6 : big ? 3.1 : 2.4, c: p.colors[sp] });
      }
    });
    $('#spreadNote').textContent = per > 1 ? `1 dot ≈ ${per} animals` : '1 dot = 1 animal';
    const hidden = new Set();
    $('#spreadLegend').innerHTML = entries.map(([sp, v]) => `<button class="sl" data-sp="${sp}"><i style="background:${p.colors[sp]}"></i>${emojiFor(sp)} ${sp} <b>${v ? num(v) : 'present'}</b></button>`).join('');
    $('#spreadLegend').onclick = e => { const bt = e.target.closest('.sl'); if (!bt) return; const s = bt.dataset.sp; hidden.has(s) ? hidden.delete(s) : hidden.add(s); bt.classList.toggle('off', hidden.has(s)); };
    let hover = null, hi = null;
    const stip = $('#spreadTip');
    cv.onmousemove = e => {
      const rr = cv.getBoundingClientRect(), mx = e.clientX - rr.left, my = e.clientY - rr.top;
      let best = null, bd = 144; agents.forEach(a => { if (hidden.has(a.sp)) return; const d = (a.x - mx) ** 2 + (a.y - my) ** 2; if (d < bd) { bd = d; best = a; } });
      hover = best;
      if (best) { const v = p.counts[best.sp]; stip.innerHTML = `<b>${emojiFor(best.sp)} ${best.sp[0].toUpperCase() + best.sp.slice(1)}</b>${v ? `~${num(v)} in park` : 'Present (not counted)'}`; stip.classList.add('show'); stip.style.left = Math.min(mx + 14, rr.width - 170) + 'px'; stip.style.top = (my + 14) + 'px'; }
      else stip.classList.remove('show');
    };
    cv.onmouseleave = () => { hover = null; stip.classList.remove('show'); };
    document.querySelectorAll('#pmCounts .pm-count').forEach(c => { c.onmouseenter = () => hi = c.dataset.sp; c.onmouseleave = () => hi = null; });
    // spot the highlighted species from the legend too
    $('#spreadLegend').onmouseover = e => { const bt = e.target.closest('.sl'); hi = bt ? bt.dataset.sp : null; };
    $('#spreadLegend').onmouseleave = () => hi = null;

    (function tick(t) {
      ctx.clearRect(0, 0, W, H); ctx.drawImage(bg, 0, 0, W, H);
      agents.forEach(a => {
        if (hidden.has(a.sp)) return;
        a.a += (Math.random() - .5) * .35;
        const nx = a.x + Math.cos(a.a) * a.v, ny = a.y + Math.sin(a.a) * a.v;
        if (inside(nx, ny)) { a.x = nx; a.y = ny; } else a.a += Math.PI;
        const dim = hi && hi !== a.sp;
        ctx.globalAlpha = dim ? .15 : 1;
        if (!dim && (hi === a.sp)) { ctx.fillStyle = a.c; ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.fillStyle = a.c; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(a.x, a.y, a === hover ? a.r * 2 : a.r, 0, 7); ctx.fill(); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      if (hover && !hidden.has(hover.sp)) { ctx.font = '22px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(emojiFor(hover.sp), hover.x, hover.y - 10); }
      spreadRAF = requestAnimationFrame(tick);
    })();
  }

  const SPK = Object.keys(D.species);
  let curSp = 'tiger';
  $('#speciesTabs').innerHTML = SPK.map(k => { const s = D.species[k]; return `<button class="sp-tab" data-sp="${k}" style="--sp:${s.color}"><span class="e">${s.emoji}</span><span><div class="t">${s.name.replace(' (reintroduced)', '')}</div><div class="c">${num(s.count)} · ${s.year}</div></span></button>`; }).join('');
  $('#speciesTabs').addEventListener('click', e => { const b = e.target.closest('.sp-tab'); if (b) { curSp = b.dataset.sp; renderSpecies(); } });
  const stateKey = { tiger22: 'tiger22', elephant17: 'elephant17', leopard22: 'leopard22', lion: 'lion', rhino: 'rhino', snowleopard: 'snowleopard', cheetah: 'cheetah' };
  function renderSpecies() {
    const s = D.species[curSp];
    document.querySelectorAll('.sp-tab').forEach(b => b.classList.toggle('on', b.dataset.sp === curSp));
    $('#speciesCard').innerHTML = `<div class="art"><svg viewBox="0 0 840 460" preserveAspectRatio="xMidYMid slice"></svg><div class="animal">${s.emoji}</div></div>
      <div class="body"><h3>${s.name}</h3><div class="sci">${s.sci}</div>
      <div class="count"><b data-count="${s.count}">0</b><span>in the wild · ${s.year}</span></div>
      <div class="range">${s.range}</div>
      <span class="status">${s.status}</span>
      <p class="fact">${s.fact}</p></div>`;
    Scenes.draw($('#speciesCard svg'), s.scene, { seed: curSp });
    countUp($('#speciesCard [data-count]'));
    $('#trendTitle').textContent = `${s.name} population, 1999 – 2025`;
    $('#trendSub').textContent = s.trend.length > 1 ? 'Official national estimates. Dashed-ring points mark a change in counting method — hover for details.' : 'Only one national estimate exists so far.';
    const annotations = curSp === 'tiger' ? [{ x: 2006, text: 'Camera-trap era begins' }] : curSp === 'elephant' ? [{ x: 2025, text: 'DNA method' }] : [];
    lineChart($('#trendChart'), { series: [{ name: s.name, color: s.color, data: s.trend }], x0: 1999, x1: 2025, height: 340, annotations, unit: 'Count' });
    $('#trendTable').innerHTML = `<table><tr><th>Year</th><th>Count</th><th>Note</th></tr>${s.trend.map(d => `<tr><td>${d.y}</td><td>${num(d.v)}</td><td class="muted">${d.note || ''}</td></tr>`).join('')}</table>`;
    const key = stateKey[s.byState];
    const rows = Object.entries(D.states).filter(([, d]) => d[key]).map(([n, d]) => ({ name: n, v: d[key] })).sort((a, b) => b.v - a.v);
    $('#stateBarsTitle').textContent = `Where ${s.name.toLowerCase().replace(' (reintroduced)', '')}s live`;
    $('#stateBarsSub').textContent = { tiger22: 'Tigers by state, 2022 census', elephant17: 'Elephants by state, 2017 synchronised census', leopard22: 'Leopards by state, 2022 (tiger landscapes)', lion: 'Asiatic lions, 2025', rhino: 'Approximate, 2022', snowleopard: 'SPAI 2024', cheetah: 'Kuno NP and Gandhi Sagar, approx.' }[key];
    barList($('#stateBars'), rows.slice(0, 14), { color: s.color, onClick: r => { document.getElementById('map').scrollIntoView(); layer = LAYERS.find(l => l.sp === curSp) || layer; paintLayer(); setTimeout(() => showState(r.name, true), 500); } });
  }
  $('#trendTableBtn').onclick = e => { const t = $('#trendTable'); t.hidden = !t.hidden; e.currentTarget.textContent = t.hidden ? 'Show table' : 'Hide table'; };
  renderSpecies();

  function renderIndex() {
    const pick = ['tiger', 'elephant', 'lion', 'rhino', 'leopard'];
    const series = pick.map((k, i) => {
      const s = D.species[k], tr = k === 'tiger' ? s.trend.filter(d => d.y >= 2006) : s.trend, b = tr[0].v;
      return { name: s.name, color: CAT[i], data: tr.map(d => ({ y: d.y, v: Math.round(d.v / b * 100) })) };
    });
    lineChart($('#indexChart'), { series, x0: 1999, x1: 2025, height: 300, labels: 'none', area: false, yFmt: v => v });
  }
  renderIndex();

  const n = D.national;
  $('#forestStats').innerHTML = [
    ['🌳', 'Forest cover', num(n.forestCover), 'km² · ' + n.forestPct + '% of India (ISFR 2023)'],
    ['🌱', 'Forest + tree cover', n.totalGreenPct + '%', num(n.forestCover + n.treeCover) + ' km² — target is 33%'],
    ['🌊', 'Mangroves', num(n.mangroves), 'km² · Sundarbans holds ~42%'],
    ['🪵', 'Carbon stock', num(n.carbonStock), 'million tonnes locked in forests']
  ].map(([e, k, v, d]) => `<div class="stat-tile" data-emoji="${e}"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('');
  lineChart($('#forestChart'), { series: [{ name: 'Forest cover', color: '#34d399', data: D.forestTrend }], x0: 1999, x1: 2025, height: 300, yMin: 600000, yFmt: v => (v / 100000).toFixed(2) + ' L', unit: 'km²', labels: 'last', annotations: [{ x: 2001, text: 'Better satellites' }] });
  const DC = ['#0f7a4a', '#2fb574', '#8fd9a8', '#8a7a4a'];
  const totD = n.density.reduce((s, d) => s + d.v, 0);
  $('#densityViz').innerHTML = `<div class="density"><div class="canopy"><svg viewBox="0 0 600 110" preserveAspectRatio="none" width="100%" height="110" id="canopySvg"></svg></div>
    <div class="dens-bar">${n.density.map((d, i) => `<div style="flex:${d.v};background:${DC[i]}" title="${d.k}: ${num(d.v)} km²"></div>`).join('')}</div>
    <div class="dens-rows">${n.density.map((d, i) => `<div class="dens-row"><i style="background:${DC[i]}"></i><div><div class="t">${d.k}</div><div class="v">${num(d.v)} <span class="muted small">km² · ${d.pct}%</span></div><div class="n">${d.note}</div></div></div>`).join('')}</div></div>`;
  (function canopy() {
    const c = $('#canopySvg'), R = Scenes.rng(3); let s = '';
    let x = 0;
    n.density.forEach((d, i) => {
      const w = d.v / totD * 600, dens = [0.9, 0.6, 0.3, 0.08][i];
      for (let k = 0; k < w * dens / 6; k++) { const tx = x + R() * w, h = 30 + R() * 55 * (1 - i * .15); s += `<ellipse cx="${tx}" cy="${110 - h}" rx="${8 + R() * 8}" ry="${7 + R() * 6}" fill="${DC[i]}" opacity="${.6 + R() * .4}"/><rect x="${tx - 1}" y="${110 - h}" width="2" height="${h}" fill="#1a2a1f"/>`; }
      x += w;
    });
    c.innerHTML = s;
  })();
  let rankKey = 'pct';
  function renderRank() {
    const rows = Object.entries(D.states).filter(([nm, d]) => rankKey === 'fc' || d.fc > 1000).map(([nm, d]) => ({ name: nm, v: d[rankKey], label: rankKey === 'pct' ? d.pct.toFixed(1) + '%' : num(d.fc) })).sort((a, b) => b.v - a.v).slice(0, 12);
    barList($('#rankBars'), rows, { color: '#10b981', onClick: r => { document.getElementById('map').scrollIntoView(); layer = LAYERS[rankKey === 'pct' ? 0 : 1]; paintLayer(); setTimeout(() => showState(r.name, true), 500); } });
  }
  $('#rankSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; rankKey = b.dataset.k; $('#rankSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderRank(); });
  renderRank();
  $('#forestTypes').innerHTML = D.forestTypes.map(t => `<div class="type-row"><div class="top"><span>${t.k}</span><b>${t.pct}%</b></div><div class="w">${t.where}</div><div class="tr"><div class="b" data-w="${t.pct / 42 * 100}"></div></div></div>`).join('');
  const typesIO = new IntersectionObserver(es => { if (es[0].isIntersecting) { document.querySelectorAll('#forestTypes .b').forEach(b => b.style.width = b.dataset.w + '%'); typesIO.disconnect(); } });
  typesIO.observe($('#forestTypes'));
  const landScene = ['snow', 'rainforest', 'jungle', 'grassland', 'mangrove', 'savanna'];
  $('#landscapes').innerHTML = D.landscapes.map((l, i) => `<div class="land"><svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice"></svg><div class="body"><h4>${l.icon} ${l.name}</h4><p>${l.text}</p></div></div>`).join('');
  document.querySelectorAll('#landscapes svg').forEach((s, i) => Scenes.draw(s, landScene[i], { seed: 'land' + i }));

  const tiers = ['Top leadership', 'Union ministry', '', 'National bodies', 'States', '', ''];
  const byLvl = {}; D.governance.forEach(g => (byLvl[g.lvl] = byLvl[g.lvl] || []).push(g));
  $('#org').innerHTML = Object.keys(byLvl).map(l => `${tiers[l] ? `<div class="org-tier">${tiers[l]}</div>` : ''}<div class="org-row">${byLvl[l].map(g => `<button class="org-node l${g.lvl}" data-id="${g.id}"><div class="t">${g.t}</div><div class="n">${g.n}</div></button>`).join('')}</div>`).join('');
  function showOrg(id) {
    const g = D.governance.find(x => x.id === id);
    document.querySelectorAll('.org-node').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    $('#orgDetail').innerHTML = `<div class="eyebrow">${g.lvl <= 2 ? 'Government of India' : g.lvl === 3 ? 'Under MoEFCC' : 'State & ground level'}</div><h3>${g.t}</h3><div class="who">${g.n}</div><p>${g.d}</p><p class="muted small">Office holders shown as of 2025.</p>`;
  }
  $('#org').addEventListener('click', e => { const b = e.target.closest('.org-node'); if (b) showOrg(b.dataset.id); });
  showOrg('min');
  const pa = n.pas;
  $('#paStrip').innerHTML = [[pa.np, 'National Parks'], [pa.ws, 'Wildlife Sanctuaries'], [pa.tr, 'Tiger Reserves'], [pa.er, 'Elephant Reserves'], [pa.br, 'Biosphere Reserves'], [pa.cr, 'Conservation Reserves'], [pa.comr, 'Community Reserves'], [pa.ramsar, 'Ramsar Wetlands']]
    .map(([v, k]) => `<div class="pa"><div class="v" data-count="${v}">${v}</div><div class="k">${k}</div></div>`).join('');
  $('#timeline').innerHTML = D.laws.map(l => `<div class="tl"><div class="y">${l.y}</div><div class="t">${l.t}</div><div class="d">${l.d}</div></div>`).join('');
  const paIO = new IntersectionObserver(es => { if (es[0].isIntersecting) { document.querySelectorAll('#paStrip [data-count]').forEach(countUp); paIO.disconnect(); } });
  paIO.observe($('#paStrip'));

  document.querySelectorAll('.section-head, .chart-card, .stat-tile, .land, .gov-wrap, .pa-strip, .species-stage, .atlas').forEach(reveal);

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { renderSpecies(); renderIndex(); lineChart($('#forestChart'), { series: [{ name: 'Forest cover', color: '#34d399', data: D.forestTrend }], x0: 1999, x1: 2025, height: 300, yMin: 600000, yFmt: v => (v / 100000).toFixed(2) + ' L', unit: 'km²', labels: 'last', annotations: [{ x: 2001, text: 'Better satellites' }] }); }, 250); });
})();
