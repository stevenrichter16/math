import { setupCanvas, VIZ_FNS, vizDeriv, slopeColor } from '../shared/vizShared.js';

export function bootVelocityGhostViz() {
  var c = setupCanvas('ghostCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W = c.width, H = c.height;
  var f = VIZ_FNS.pow2;

  var running = false;
  var t = -3.5;
  var ghosts = [];
  var ghostEvery = 18;
  var frameCount = 0;

  var btn = document.getElementById('ghostBtn');
  var btns = {
    pow2: document.getElementById('ghostFnPow2'),
    sin: document.getElementById('ghostFnSin'),
    pow3: document.getElementById('ghostFnPow3')
  };

  if (!btn || !btns.pow2 || !btns.sin || !btns.pow3) {
    return;
  }

  var xRange = 8;
  var yRange = 14;
  var cx = W * 0.5;
  var cy = H * 0.68;
  var sx = W / xRange;
  var sy = H / yRange;

  function toC(x, y) { return [cx + x * sx, cy - y * sy]; }

  function setFn(name) {
    f = VIZ_FNS[name];
    Object.keys(btns).forEach(function(k) { btns[k].classList.remove('active'); });
    btns[name].classList.add('active');
    t = -3.5;
    ghosts = [];
  }

  Object.keys(btns).forEach(function(k) {
    btns[k].addEventListener('click', function() { setFn(k); });
  });
  btns.pow2.classList.add('active');

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();

    ctx.strokeStyle = '#7c6af7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var px = 0; px < W; px++) {
      var xv = (px - cx) / sx;
      var pt = toC(xv, f(xv));
      px === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1]);
    }
    ctx.stroke();

    for (var i = 0; i < ghosts.length; i++) {
      var g = ghosts[i];
      var age = (ghosts.length - i) / Math.max(ghosts.length, 1);
      var alpha = (1 - age) * 0.85;
      var gpt = toC(g.x, g.y);
      var col = slopeColor(g.d);

      var rawDx = sx;
      var rawDy = -sy * g.d;
      var mag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      var scale = Math.min(Math.abs(g.d) * 8 + 10, 44);
      var adx = (rawDx / mag) * scale;
      var ady = (rawDy / mag) * scale;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gpt[0], gpt[1]);
      ctx.lineTo(gpt[0] + adx, gpt[1] + ady);
      ctx.stroke();

      var hLen = 6;
      var ang = Math.atan2(ady, adx);
      ctx.beginPath();
      ctx.moveTo(gpt[0] + adx, gpt[1] + ady);
      ctx.lineTo(gpt[0] + adx - hLen * Math.cos(ang - 0.4), gpt[1] + ady - hLen * Math.sin(ang - 0.4));
      ctx.moveTo(gpt[0] + adx, gpt[1] + ady);
      ctx.lineTo(gpt[0] + adx - hLen * Math.cos(ang + 0.4), gpt[1] + ady - hLen * Math.sin(ang + 0.4));
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(gpt[0], gpt[1], 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    var lx = t;
    var ly = f(t);
    var ld = vizDeriv(f, t);
    var lpt = toC(lx, ly);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(lpt[0], lpt[1], 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('x=' + lx.toFixed(2) + "  f'=" + ld.toFixed(2), 12, 20);
  }

  function tick() {
    t += 0.035;
    frameCount++;

    if (frameCount % ghostEvery === 0) {
      var gx = t;
      var gy = f(t);
      var gd = vizDeriv(f, t);
      ghosts.push({ x: gx, y: gy, d: gd });
      if (ghosts.length > 30) ghosts.shift();
    }

    drawFrame();

    if (t < 3.5) {
      requestAnimationFrame(tick);
    } else {
      running = false;
      btn.disabled = false;
      btn.textContent = '▶ Launch again';
    }
  }

  btn.addEventListener('click', function() {
    if (running) return;
    running = true;
    t = -3.5;
    ghosts = [];
    frameCount = 0;
    btn.disabled = true;
    btn.textContent = 'running...';
    requestAnimationFrame(tick);
  });

  drawFrame();
}
