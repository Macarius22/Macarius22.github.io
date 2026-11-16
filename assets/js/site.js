/* Macari Hanna — site interactions (no dependencies). */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- reveal on scroll (staggered within each parent) ---------- */
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  reveals.forEach(function (el) {
    var sibs = [].slice.call(el.parentElement.children).filter(function (c) { return c.classList.contains('reveal'); });
    el.style.setProperty('--d', (Math.min(sibs.indexOf(el), 6) * 0.08) + 's');
  });
  if ('IntersectionObserver' in window && !reduce) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- active section in the nav ---------- */
  var links = {};
  [].forEach.call(document.querySelectorAll('#sidebar nav a'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var sections = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  function setActive() {
    var y = window.innerHeight * 0.35, current = sections[0];
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= y) current = s; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) current = sections[sections.length - 1];
    Object.keys(links).forEach(function (id) { links[id].classList.toggle('active', current && current.id === id); });
    var nav = links[current.id];
    if (nav && nav.scrollIntoView && window.innerWidth <= 980) {
      var bar = nav.closest('nav');
      bar.scrollLeft = nav.offsetLeft - bar.clientWidth / 2 + nav.clientWidth / 2;
    }
  }

  /* ---------- scroll progress + timeline fill ---------- */
  var bar = document.querySelector('.scroll-progress span');
  var tl = document.querySelector('.timeline');
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      if (tl) {
        var r = tl.getBoundingClientRect();
        var p = (window.innerHeight * 0.75 - r.top) / r.height;
        tl.style.setProperty('--tl', Math.max(0, Math.min(1, p)).toFixed(3));
      }
      setActive();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- count-up numbers ---------- */
  var counts = [].slice.call(document.querySelectorAll('.count'));
  function fmt(v, dec) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(dec); }
  function run(el) {
    var to = parseFloat(el.dataset.to), dec = +el.dataset.dec, t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e, dec);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counts.forEach(function (el) { co.observe(el); });
  }

  /* ---------- pointer glow + 3D tilt on cards ---------- */
  if (finePointer && !reduce) {
    [].forEach.call(document.querySelectorAll('.tilt'), function (el) {
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (x * 100) + '%');
        el.style.setProperty('--my', (y * 100) + '%');
        el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 6).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 8).toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ======================================================================
     Hero: rutile TiO2 lattice, projected along c. The pointer is an excess
     electron: the nearest Ti becomes Ti3+, its O neighbours move outwards,
     and a d-orbital cloud forms on it (a small polaron). With no pointer,
     the polaron hops between neighbouring Ti sites by itself.
     ====================================================================== */
  var canvas = document.getElementById('lattice');
  var hero = document.getElementById('intro');
  var hint = document.getElementById('hint');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1, A = 110, U = 0.305;
  var atoms = [], tis = [], bonds = [], pol = -1, lastPointer = 0, nextHop = 0, visible = true, raf = 0;
  var ptr = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, inside: false };

  function build() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    A = W < 700 ? 78 : 112;
    atoms = []; tis = []; bonds = [];
    var nx = Math.ceil(W / A) + 2, ny = Math.ceil(H / A) + 2;
    function add(x, y, t, sgn) { atoms.push({ bx: x, by: y, x: x, y: y, vx: 0, vy: 0, t: t, w: 0, sgn: sgn, ph: Math.random() * 6.283 }); return atoms.length - 1; }
    for (var i = -1; i < nx; i++) for (var j = -1; j < ny; j++) {
      var cx = i * A, cy = j * A, mx = cx + A / 2, my = cy + A / 2;
      var t1 = add(cx, cy, 'Ti', 1), t2 = add(mx, my, 'Ti', -1);
      tis.push(t1, t2);
      // O: (u,u),(-u,-u) around corner Ti; (u,-u),(-u,u) around centre Ti
      add(cx + U * A, cy + U * A, 'O'); add(cx - U * A, cy - U * A, 'O');
      add(mx + U * A, my - U * A, 'O'); add(mx - U * A, my + U * A, 'O');
    }
    // Ti-O bonds: all O within 0.5 A of a Ti (apical + projected equatorial)
    tis.forEach(function (ti) {
      var T = atoms[ti]; T.nb = [];
      atoms.forEach(function (O, k) {
        if (O.t !== 'O') return;
        var d = Math.hypot(O.bx - T.bx, O.by - T.by);
        if (d < 0.52 * A) { T.nb.push(k); if (d < 0.5 * A) bonds.push([ti, k]); }
      });
    });
    pol = nearestTi(W * (W < 1100 ? 0.5 : 0.72), H * 0.42);
    atoms[pol].w = reduce ? 1 : 0;
  }

  function nearestTi(x, y) {
    var best = -1, bd = 1e12;
    tis.forEach(function (k) { var a = atoms[k], d = (a.bx - x) * (a.bx - x) + (a.by - y) * (a.by - y); if (d < bd) { bd = d; best = k; } });
    return best;
  }
  function neighbourTi(k) {
    var a = atoms[k], c = tis.filter(function (m) {
      var b = atoms[m], d = Math.hypot(b.bx - a.bx, b.by - a.by);
      return m !== k && d < 0.75 * A && b.bx > 40 && b.bx < W - 40 && b.by > 40 && b.by < H - 40;
    });
    return c.length ? c[(Math.random() * c.length) | 0] : k;
  }
  function fade(x) { // keep the text column readable on wide screens
    if (W < 1100) return 0.42;
    var a = (x - W * 0.3) / (W * 0.35);
    return 0.12 + 0.88 * Math.max(0, Math.min(1, a));
  }

  function frame(t) {
    raf = 0;
    if (!visible) return;
    var now = t || 0;

    // choose polaron site
    if (ptr.inside && now - lastPointer < 2500) {
      var n = nearestTi(ptr.x, ptr.y);
      var P = atoms[pol];
      if (n !== pol && Math.hypot(ptr.x - P.bx, ptr.y - P.by) > 0.42 * A) pol = n;
    } else if (now > nextHop) {
      pol = neighbourTi(pol);
      nextHop = now + 1800 + Math.random() * 1400;
    }
    ptr.sx += (ptr.x - ptr.sx) * 0.18; ptr.sy += (ptr.y - ptr.sy) * 0.18;

    // polaron weights ease in/out (lattice relaxes on a slower time scale than the electron)
    tis.forEach(function (k) { var a = atoms[k]; a.w += ((k === pol ? 1 : 0) - a.w) * (reduce ? 1 : 0.06); });

    // targets: O pushed away from Ti3+, Ti3+ breathing
    for (var i = 0; i < atoms.length; i++) { atoms[i].tx = atoms[i].bx; atoms[i].ty = atoms[i].by; }
    tis.forEach(function (k) {
      var T = atoms[k]; if (T.w < 0.01) return;
      T.nb.forEach(function (o) {
        var O = atoms[o], dx = O.bx - T.bx, dy = O.by - T.by, d = Math.hypot(dx, dy) || 1;
        O.tx += dx / d * 0.16 * A * T.w; O.ty += dy / d * 0.16 * A * T.w;
      });
    });
    // damped springs + thermal jiggle
    var tt = now * 0.001;
    for (i = 0; i < atoms.length; i++) {
      var a = atoms[i];
      var jx = reduce ? 0 : Math.sin(tt * 2.1 + a.ph) * 0.9, jy = reduce ? 0 : Math.cos(tt * 1.7 + a.ph * 1.3) * 0.9;
      if (reduce) { a.x = a.tx; a.y = a.ty; continue; }
      a.vx = (a.vx + (a.tx + jx - a.x) * 0.08) * 0.82;
      a.vy = (a.vy + (a.ty + jy - a.y) * 0.08) * 0.82;
      a.x += a.vx; a.y += a.vy;
    }

    ctx.clearRect(0, 0, W, H);

    // bonds
    ctx.lineWidth = 1.2;
    bonds.forEach(function (b) {
      var T = atoms[b[0]], O = atoms[b[1]], f = fade((T.x + O.x) / 2);
      if (f < 0.02) return;
      ctx.strokeStyle = 'rgba(140,200,255,' + (0.16 * f + 0.25 * T.w * f).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(O.x, O.y); ctx.stroke();
    });

    // polaron d-orbital clouds (orange, like the polaron band in the paper figure)
    tis.forEach(function (k) {
      var T = atoms[k]; if (T.w < 0.02) return;
      var f = Math.max(fade(T.x), 0.5), R = A * 0.36 * (0.9 + 0.08 * Math.sin(tt * 3));
      var rot = (T.sgn > 0 ? Math.PI / 4 : -Math.PI / 4) + tt * 0.25;
      for (var l = 0; l < 4; l++) {
        var ang = rot + l * Math.PI / 2, lx = T.x + Math.cos(ang) * R * 0.55, ly = T.y + Math.sin(ang) * R * 0.55;
        var g = ctx.createRadialGradient(lx, ly, 0, lx, ly, R * 0.62);
        g.addColorStop(0, 'rgba(255,165,70,' + (0.55 * T.w * f).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, R * 0.62, 0, 6.283); ctx.fill();
      }
      var halo = ctx.createRadialGradient(T.x, T.y, 0, T.x, T.y, A * 0.9);
      halo.addColorStop(0, 'rgba(255,155,61,' + (0.18 * T.w * f).toFixed(3) + ')');
      halo.addColorStop(1, 'rgba(255,155,61,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(T.x, T.y, A * 0.9, 0, 6.283); ctx.fill();
    });

    // atoms
    atoms.forEach(function (a) {
      var f = fade(a.x); if (f < 0.02) return;
      if (a.t === 'Ti') {
        var w = a.w, r = 5.2 + 2.2 * w;
        ctx.fillStyle = 'rgba(' + Math.round(110 + 145 * w) + ',' + Math.round(200 - 40 * w) + ',' + Math.round(255 - 190 * w) + ',' + (0.75 * f + 0.25 * w).toFixed(3) + ')';
        ctx.shadowColor = w > 0.3 ? 'rgba(255,155,61,0.9)' : 'rgba(76,222,255,0.6)'; ctx.shadowBlur = 8 + 10 * w;
        ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, 6.283); ctx.fill();
        ctx.shadowBlur = 0;
        if (w > 0.5) { // spin-up arrow on Ti3+
          var al = (w - 0.5) * 2 * Math.max(f, 0.6);
          ctx.strokeStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y + 3.5); ctx.lineTo(a.x, a.y - 4); ctx.moveTo(a.x - 2.6, a.y - 1.4); ctx.lineTo(a.x, a.y - 4); ctx.lineTo(a.x + 2.6, a.y - 1.4); ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(214,93,177,' + (0.55 * f).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(a.x, a.y, 3.4, 0, 6.283); ctx.fill();
      }
    });

    // the free electron at the pointer
    if (ptr.inside && now - lastPointer < 2500) {
      var eg = ctx.createRadialGradient(ptr.sx, ptr.sy, 0, ptr.sx, ptr.sy, 26);
      eg.addColorStop(0, 'rgba(163,239,255,0.55)'); eg.addColorStop(1, 'rgba(76,222,255,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ptr.sx, ptr.sy, 26, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#e9fbff'; ctx.beginPath(); ctx.arc(ptr.sx, ptr.sy, 2.4, 0, 6.283); ctx.fill();
    }

    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  hero.addEventListener('pointermove', function (ev) {
    var r = canvas.getBoundingClientRect();
    ptr.x = ev.clientX - r.left; ptr.y = ev.clientY - r.top;
    if (!ptr.inside) { ptr.sx = ptr.x; ptr.sy = ptr.y; }
    ptr.inside = true; lastPointer = performance.now();
    if (hint) hint.style.opacity = '0.35';
    if (reduce) kick();
  });
  hero.addEventListener('pointerleave', function () { ptr.inside = false; nextHop = performance.now() + 1200; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; kick(); });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); kick(); }, 150); });

  build();
  kick();
})();
