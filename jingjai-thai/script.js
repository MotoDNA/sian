/* 찡짜이 타이푸드 — 메뉴 3D 띠 인터랙션 + 모바일 메뉴 */
(function () {
  /* ---------- 모바일 메뉴 ---------- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); }
    });
  }

  /* 지금 보는 구역을 메뉴에 밑줄로 표시 */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id); if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'true'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['menu', 'reviews', 'story', 'visit'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- 메뉴 3D 띠 ---------- */
  var stage = document.getElementById('stage');
  var track = document.getElementById('track');
  if (!stage || !track) return;
  var dishes = Array.prototype.slice.call(track.querySelectorAll('.dish'));
  var n = dishes.length;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var ZOOM = 1.2;            // 확대 비율 (20%)
  var startEl = track.querySelector('[data-start]');
  var active = startEl ? dishes.indexOf(startEl) : Math.floor((n - 1) / 2);
  var hovering = false;      // 마우스가 메뉴 띠 위에 있는지
  var touched = !canHover;   // 터치 기기에서는 가운데 메뉴를 늘 확대
  var focused = false;
  var curX = null;

  var st = dishes.map(function (d) {
    return { el: d, img: d.querySelector('img'), top: parseFloat(getComputedStyle(d).getPropertyValue('--top')) || 0.3, s: 1, v: 0, w: 0, wv: 0, named: false };
  });

  function centerOf(i) { var d = dishes[i]; return d.offsetLeft + d.offsetWidth / 2; }
  function targetX() { return stage.clientWidth / 2 - centerOf(active); }

  function setActive(i) {
    i = Math.max(0, Math.min(n - 1, i));
    if (i === active) return;
    active = i;
    st[i].wv += 0.05;  // 새로 선택된 접시에 살짝 '출렁' 힘을 줌
  }

  /* 마우스: 띠 위에서 좌우 위치 → 해당 메뉴를 가운데로 */
  stage.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    hovering = true;
    var r = stage.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    // 양 끝 8%는 여유를 두고 나머지를 메뉴 개수로 나눔
    var t = (x - 0.08) / 0.84;
    setActive(Math.floor(Math.max(0, Math.min(0.9999, t)) * n));
  });
  stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hovering = false; });

  /* 터치: 옆으로 밀면 한 칸씩 이동, 탭하면 그 메뉴로 */
  var startX = null, startActive = 0, moved = false;
  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    touched = true; startX = e.clientX; startActive = active; moved = false;
  });
  stage.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' || startX === null) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 8) moved = true;
    var step = dishes[0].offsetWidth * 0.6;
    setActive(startActive - Math.round(dx / step));
  });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    stage.addEventListener(t, function () { startX = null; });
  });
  dishes.forEach(function (d, i) {
    var a = d.querySelector('a');
    a.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; return; }
      if (i !== active) { e.preventDefault(); setActive(i); } // 옆 메뉴를 누르면 먼저 가운데로
    });
    a.addEventListener('focus', function () { focused = true; setActive(i); });
    a.addEventListener('blur', function () { focused = false; });
  });

  /* 키보드 ← → */
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      var ni = active + (e.key === 'ArrowRight' ? 1 : -1);
      ni = Math.max(0, Math.min(n - 1, ni));
      dishes[ni].querySelector('a').focus();
    }
  });

  /* ---------- 매 프레임: 띠 이동 + 말랑한 확대 ---------- */
  var last = performance.now(), acc = 0;
  function frame(now) {
    var dt = Math.min(3, (now - last) / 16.67); last = now;
    acc += dt; var steps = Math.floor(acc); acc -= steps;  // 화면 주사율(60/120/144Hz)과 관계없이 같은 속도
    var tx = targetX();
    if (curX === null || reduce) curX = tx;
    curX += (tx - curX) * (1 - Math.pow(1 - 0.085, dt));
    track.style.transform = 'translate3d(' + curX.toFixed(2) + 'px,0,0)';

    var engaged = hovering || touched || focused;
    for (var i = 0; i < n; i++) {
      var o = st[i];
      var target = (engaged && i === active) ? ZOOM : 1;
      if (reduce) { o.s = target; o.v = 0; o.w = 0; o.wv = 0; }
      else {
        // 크기 스프링 (살짝 넘쳤다 돌아오는 탄성)
        for (var k = 0; k < steps; k++) {
          o.v += (target - o.s) * 0.13;
          o.v *= 0.76;
          o.s += o.v;
          // 젤리 출렁임: 커지는 속도만큼 세로로 늘었다가 좌우로 퍼지며 진정
          o.wv += (o.v * 2.4 - o.w) * 0.22;
          o.wv *= 0.80;
          o.w += o.wv;
        }
      }
      var sy = o.s * (1 + o.w);
      var sx = o.s * (1 - o.w * 0.85);
      o.img.style.setProperty('--sx', sx.toFixed(4));
      o.img.style.setProperty('--sy', sy.toFixed(4));
      // 메뉴명은 접시가 커진 만큼 위로 올림
      o.el.style.setProperty('--lift', ((sy - 1) * (0.96 - o.top) * o.img.offsetHeight).toFixed(1) + 'px');

      var shouldName = target === ZOOM && o.s > ZOOM - 0.04;
      if (shouldName !== o.named) { o.named = shouldName; o.el.classList.toggle('named', shouldName); }
      o.el.classList.toggle('on', i === active && engaged);
    }
    requestAnimationFrame(frame);
  }
  stage.setAttribute('tabindex', '-1');
  requestAnimationFrame(frame);
  window.addEventListener('resize', function () { curX = targetX(); });
})();
