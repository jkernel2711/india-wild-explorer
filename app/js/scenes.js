/* Procedural landscape art — layered ridges, forests, mist, sun and birds, all generated as SVG */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917)) >>> 0) / 4294967296; }
  const hash = str => [...String(str)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

  // midpoint displacement ridge -> array of [x,y]
  function ridge(R, W, base, amp, rough, n = 7) {
    let pts = [[0, base + (R() - .5) * amp], [W, base + (R() - .5) * amp]];
    let a = amp;
    for (let k = 0; k < n; k++) {
      const next = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        next.push(pts[i], [(x1 + x2) / 2, (y1 + y2) / 2 + (R() - .5) * a]);
      }
      next.push(pts[pts.length - 1]); pts = next; a *= rough;
    }
    return pts;
  }
  const toPath = (pts, W, H) => 'M0,' + H + ' L' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L') + ` L${W},${H} Z`;
  const yAt = (pts, x) => { for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [x1, y1] = pts[i - 1], [x2, y2] = pts[i]; return y1 + (y2 - y1) * (x - x1) / (x2 - x1 || 1); } return pts[pts.length - 1][1]; };

  function trees(R, pts, W, kind, size, density) {
    let d = '';
    for (let x = -10; x < W + 10; x += size * density * (0.55 + R() * 0.9)) {
      const y = yAt(pts, Math.max(0, Math.min(W, x))) + size * 0.25, h = size * (0.7 + R() * 0.7);
      if (kind === 'pine') {
        const w = h * 0.34;
        d += `M${x - w},${y} L${x},${y - h} L${x + w},${y} Z`;
        d += `M${x - w * 0.8},${y - h * 0.35} L${x},${y - h * 1.12} L${x + w * 0.8},${y - h * 0.35} Z`;
      } else if (kind === 'palm') {
        const t = y - h * 1.3;
        d += `M${x - 1.2},${y} L${x - 0.5},${t} L${x + 0.5},${t} L${x + 1.2},${y} Z`;
        for (let k = 0; k < 5; k++) { const ang = -Math.PI + k * Math.PI / 4; d += `M${x},${t} Q${x + Math.cos(ang) * h * .35},${t - h * .25} ${x + Math.cos(ang) * h * .6},${t + Math.abs(Math.sin(ang)) * h * .1 + h * .12} L${x},${t + 2} Z`; }
      } else if (kind === 'acacia') {
        const t = y - h * 0.8, w = h * 0.9;
        d += `M${x - 1.5},${y} L${x - .6},${t} L${x + .6},${t} L${x + 1.5},${y} Z`;
        d += `M${x - w},${t + 3} Q${x},${t - h * 0.45} ${x + w},${t + 3} Q${x},${t - h * 0.05} ${x - w},${t + 3} Z`;
      } else if (kind === 'grass') {
        for (let k = 0; k < 3; k++) { const gx = x + (R() - .5) * size; d += `M${gx - 1.5},${y} Q${gx + (R() - .5) * 6},${y - h * .9} ${gx + (R() - .5) * 8},${y - h} Q${gx},${y - h * .4} ${gx + 1.5},${y} Z`; }
      } else if (kind === 'mangrove') {
        const t = y - h * 0.7, w = h * 0.55;
        d += `M${x - w},${t} Q${x - w},${t - h * 0.55} ${x},${t - h * 0.6} Q${x + w},${t - h * 0.55} ${x + w},${t} Z`;
        for (let k = -2; k <= 2; k++) d += `M${x + k * w * .3},${t} Q${x + k * w * .5},${y - h * .2} ${x + k * w * .6 + 1},${y + 2} L${x + k * w * .6 - 1},${y + 2} Q${x + k * w * .45},${y - h * .2} ${x + k * w * .3 - 1.5},${t} Z`;
      } else { // round canopy
        const r = h * 0.42;
        d += `M${x - 1.5},${y} L${x - 1},${y - h * 0.5} L${x + 1},${y - h * 0.5} L${x + 1.5},${y} Z`;
        d += `M${x - r},${y - h * 0.55} a${r},${r * 0.9} 0 1,1 ${r * 2},0 a${r},${r * 0.9} 0 1,1 ${-r * 2},0 Z`;
        d += `M${x - r * 1.2},${y - h * 0.4} a${r * 0.7},${r * 0.6} 0 1,1 ${r * 1.4},0 a${r * 0.7},${r * 0.6} 0 1,1 ${-r * 1.4},0 Z`;
      }
    }
    return d;
  }

  const THEMES = {
    hero: { sky: ['#0b1a3a', '#3b3170', '#c2567a', '#f7a14a'], sun: '#ffd89a', sunY: .52, sunX: .66,
      layers: [
        { c: '#6a7aa6', base: .44, amp: .34, rough: .56, snow: true },
        { c: '#465f8a', base: .53, amp: .22, rough: .53, snow: true },
        { c: '#34546e', base: .60, amp: .12, rough: .5, tree: 'pine', ts: 14, td: .7 },
        { c: '#1d3a3b', base: .69, amp: .09, rough: .5, tree: 'pine', ts: 22, td: .6 },
        { c: '#0f2622', base: .78, amp: .07, rough: .5, tree: 'round', ts: 34, td: .55 },
        { c: '#07140f', base: .88, amp: .05, rough: .5, tree: 'pine', ts: 60, td: .7 }
      ], mist: true, birds: true, stars: true },
    jungle: { sky: ['#0d2b1f', '#2d5a3b', '#d49a4a', '#f2c46d'], sun: '#ffe2a0', sunY: .55, sunX: .3,
      layers: [ { c: '#5b7f5a', base: .52, amp: .14, rough: .5, tree: 'round', ts: 16, td: .6 }, { c: '#355c3c', base: .64, amp: .1, rough: .5, tree: 'round', ts: 26, td: .5 }, { c: '#1c3a26', base: .76, amp: .08, rough: .5, tree: 'round', ts: 40, td: .45 }, { c: '#0b1d12', base: .9, amp: .05, rough: .5, tree: 'grass', ts: 30, td: .5 } ], mist: true },
    rainforest: { sky: ['#0a2a2c', '#1e5850', '#6fb49a', '#c8e3c0'], sun: '#f4ffe8', sunY: .45, sunX: .72,
      layers: [ { c: '#4f8a78', base: .45, amp: .26, rough: .55, tree: 'round', ts: 12, td: .5 }, { c: '#2f6a58', base: .58, amp: .16, rough: .5, tree: 'round', ts: 22, td: .45 }, { c: '#1a4a3a', base: .7, amp: .1, rough: .5, tree: 'palm', ts: 30, td: .7 }, { c: '#0a2419', base: .86, amp: .06, rough: .5, tree: 'round', ts: 48, td: .45 } ], mist: true },
    savanna: { sky: ['#3a1d0e', '#9a4a1c', '#e98f3a', '#fbd38d'], sun: '#fff1c1', sunY: .6, sunX: .5,
      layers: [ { c: '#a8663a', base: .62, amp: .08, rough: .5 }, { c: '#7a4a28', base: .7, amp: .06, rough: .5, tree: 'acacia', ts: 22, td: 3.2 }, { c: '#4a2c17', base: .8, amp: .05, rough: .5, tree: 'acacia', ts: 44, td: 3.5 }, { c: '#23150b', base: .9, amp: .03, rough: .5, tree: 'grass', ts: 22, td: .5 } ], birds: true },
    grassland: { sky: ['#11304a', '#3f7aa0', '#a3cfd9', '#f1e6b8'], sun: '#fffbe0', sunY: .5, sunX: .25,
      layers: [ { c: '#6f8fa3', base: .5, amp: .16, rough: .55, snow: false }, { c: '#577a4a', base: .66, amp: .05, rough: .5, tree: 'round', ts: 14, td: 1.4 }, { c: '#36592e', base: .76, amp: .04, rough: .5, tree: 'grass', ts: 26, td: .35 }, { c: '#1a3317', base: .88, amp: .03, rough: .5, tree: 'grass', ts: 38, td: .35 } ], mist: true, birds: true },
    dryforest: { sky: ['#2b1a12', '#7a3f22', '#d97c3a', '#f7c07a'], sun: '#ffe6b0', sunY: .5, sunX: .7,
      layers: [ { c: '#8a5a3a', base: .55, amp: .18, rough: .55 }, { c: '#5f4028', base: .65, amp: .1, rough: .5, tree: 'round', ts: 16, td: 1.1 }, { c: '#3a2a18', base: .77, amp: .07, rough: .5, tree: 'round', ts: 30, td: .9 }, { c: '#1a130a', base: .89, amp: .04, rough: .5, tree: 'grass', ts: 26, td: .5 } ], birds: true },
    snow: { sky: ['#0b1d3a', '#2a4a7a', '#8fb4d8', '#e2eefa'], sun: '#ffffff', sunY: .3, sunX: .8,
      layers: [ { c: '#c7d6ea', base: .4, amp: .38, rough: .56, snow: true }, { c: '#8aa4c4', base: .52, amp: .26, rough: .54, snow: true }, { c: '#4f6d8e', base: .66, amp: .14, rough: .5, tree: 'pine', ts: 14, td: .8 }, { c: '#223a52', base: .8, amp: .08, rough: .5, tree: 'pine', ts: 30, td: .7 }, { c: '#0e1c2a', base: .92, amp: .04, rough: .5 } ], mist: true, stars: true },
    mangrove: { sky: ['#0f2338', '#2d5a78', '#e6906a', '#fbd0a0'], sun: '#ffe0c0', sunY: .58, sunX: .4,
      layers: [ { c: '#3f6a6a', base: .6, amp: .04, rough: .5, tree: 'mangrove', ts: 16, td: .8 }, { c: '#244a48', base: .68, amp: .03, rough: .5, tree: 'mangrove', ts: 26, td: .7 } ], water: true, birds: true }
  };

  function draw(svg, theme, opts = {}) {
    const T = THEMES[theme] || THEMES.jungle;
    const vb = svg.viewBox.baseVal, W = vb.width || 1200, H = vb.height || 400;
    const R = rng(hash(opts.seed ?? theme));
    const uid = 's' + Math.random().toString(36).slice(2, 8);
    let s = `<defs><linearGradient id="${uid}sky" x1="0" y1="0" x2="0" y2="1">` +
      T.sky.map((c, i) => `<stop offset="${(i / (T.sky.length - 1)) * 100}%" stop-color="${c}"/>`).join('') + `</linearGradient>` +
      `<radialGradient id="${uid}sun"><stop offset="0%" stop-color="${T.sun}" stop-opacity="1"/><stop offset="18%" stop-color="${T.sun}" stop-opacity=".9"/><stop offset="45%" stop-color="${T.sun}" stop-opacity=".18"/><stop offset="100%" stop-color="${T.sun}" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="${uid}mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity="0"/><stop offset="50%" stop-color="#fff" stop-opacity=".16"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="${uid}snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity=".95"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${uid}sky)"/>`;
    if (T.stars) { let st = ''; for (let i = 0; i < 90; i++) st += `<circle cx="${(R() * W).toFixed(0)}" cy="${(R() * H * .35).toFixed(0)}" r="${(R() * 1.3 + .2).toFixed(2)}" fill="#fff" opacity="${(R() * .6 + .2).toFixed(2)}"/>`; s += `<g class="layer" data-depth="0.2">${st}</g>`; }
    const sr = Math.min(W, H) * .5;
    s += `<g class="layer" data-depth="0.3"><circle cx="${W * T.sunX}" cy="${H * T.sunY}" r="${sr}" fill="url(#${uid}sun)"/><circle cx="${W * T.sunX}" cy="${H * T.sunY}" r="${sr * .09}" fill="${T.sun}"/></g>`;
    T.layers.forEach((L, i) => {
      const pts = ridge(R, W, H * L.base, H * L.amp, L.rough);
      const depth = ((i + 1) / T.layers.length).toFixed(2);
      let g = `<path d="${toPath(pts, W, H + 60)}" fill="${L.c}"/>`;
      if (L.snow) {
        // snow caps: clip the upper band of the ridge
        const cap = pts.map(p => [p[0], p[1]]);
        const minY = Math.min(...cap.map(p => p[1])), line = minY + H * L.amp * .45;
        g += `<clipPath id="${uid}c${i}"><rect x="0" y="0" width="${W}" height="${line}"/></clipPath><path d="${toPath(pts, W, H)}" fill="url(#${uid}snow)" clip-path="url(#${uid}c${i})" opacity=".6"/>`;
      }
      if (L.tree) g += `<path d="${trees(R, pts, W, L.tree, L.ts * (W / 1600) * 1.6, L.td)}" fill="${L.c}"/>`;
      s += `<g class="layer" data-depth="${depth}">${g}</g>`;
      if (T.mist && i < T.layers.length - 1 && i % 2 === 1) s += `<rect class="mist" x="-200" y="${H * L.base - H * .05}" width="${W + 400}" height="${H * .14}" fill="url(#${uid}mist)"><animate attributeName="x" values="-200;-20;-200" dur="${24 + i * 6}s" repeatCount="indefinite"/></rect>`;
    });
    if (T.water) {
      s += `<rect x="0" y="${H * .74}" width="${W}" height="${H * .26}" fill="#16324a"/>`;
      let w = ''; for (let i = 0; i < 40; i++) { const y = H * (.76 + R() * .22), x = R() * W; w += `<rect x="${x}" y="${y}" width="${30 + R() * 90}" height="1.5" fill="#f7c9a0" opacity="${.15 + R() * .3}"/>`; }
      s += `<g>${w}</g>`;
    }
    if (T.birds) {
      let b = '';
      for (let i = 0; i < 7; i++) {
        const x = W * (.1 + R() * .5), y = H * (.12 + R() * .25), k = 4 + R() * 6, dur = 30 + R() * 30;
        b += `<path d="M${-k},0 Q${-k / 2},${-k / 2} 0,0 Q${k / 2},${-k / 2} ${k},0" fill="none" stroke="#1a1410" stroke-width="1.6" stroke-linecap="round" transform="translate(${x},${y})"><animateTransform attributeName="transform" type="translate" values="${x - W * .3},${y};${x + W * .6},${y - H * .08}" dur="${dur}s" repeatCount="indefinite"/></path>`;
      }
      s += `<g>${b}</g>`;
    }
    svg.innerHTML = s;
  }

  // floating fireflies / pollen on a canvas
  function fireflies(canvas, count = 70) {
    const ctx = canvas.getContext('2d');
    let W, H, P = [];
    const resize = () => { const r = canvas.getBoundingClientRect(); W = canvas.width = r.width * devicePixelRatio; H = canvas.height = r.height * devicePixelRatio; };
    resize(); addEventListener('resize', resize);
    for (let i = 0; i < count; i++) P.push({ x: Math.random(), y: .45 + Math.random() * .55, a: Math.random() * 6.28, s: .0002 + Math.random() * .0006, r: .8 + Math.random() * 2, p: Math.random() * 6.28 });
    let visible = true;
    new IntersectionObserver(e => visible = e[0].isIntersecting).observe(canvas);
    (function tick(t) {
      if (visible) {
        ctx.clearRect(0, 0, W, H);
        P.forEach(f => {
          f.a += (Math.random() - .5) * .2; f.x += Math.cos(f.a) * f.s; f.y += Math.sin(f.a) * f.s * .6;
          if (f.x < 0) f.x = 1; if (f.x > 1) f.x = 0; if (f.y < .35) f.y = 1; if (f.y > 1) f.y = .4;
          const glow = (Math.sin(t / 600 + f.p) + 1) / 2;
          const x = f.x * W, y = f.y * H, r = f.r * devicePixelRatio;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
          g.addColorStop(0, `rgba(255, 236, 150, ${.9 * glow})`); g.addColorStop(1, 'rgba(255, 220, 120, 0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 6, 0, 6.29); ctx.fill();
        });
      }
      requestAnimationFrame(tick);
    })(0);
  }

  window.Scenes = { draw, fireflies, rng, hash };
})();
