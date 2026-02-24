document.addEventListener('DOMContentLoaded', function() {

  document.querySelectorAll('.math-inline').forEach(function(el) {
    katex.render(el.dataset.tex, el, {throwOnError: false, displayMode: false});
  });
  document.querySelectorAll('.math-display').forEach(function(el) {
    katex.render(el.dataset.tex, el, {throwOnError: false, displayMode: true});
  });

  var elt = document.getElementById('desmos-container');
  var calculator = Desmos.GraphingCalculator(elt, {
    expressions: false,
    settingsMenu: false,
    zoomButtons: false,
    border: false,
    backgroundColor: '#12141e',
  });

  var currentFn = 'x^2';
  var currentX = 1.0;

  function numericalDerivative(fn, x) {
    var h = 1e-7;
    return (evalFn(fn, x + h) - evalFn(fn, x - h)) / (2 * h);
  }

  function evalFn(fn, x) {
    var expr = fn
      .replace(/\\sin/g, 'Math.sin')
      .replace(/\\ln/g, 'Math.log')
      .replace(/e\^x/g, 'Math.exp(x)')
      .replace(/\^/g, '**');
    try {
      return Function('x', '"use strict"; return ' + expr)(x);
    } catch(e) { return NaN; }
  }

  function updateGraph() {
    var x = currentX;
    var fn = currentFn;
    var slope = numericalDerivative(fn, x);
    var fx = evalFn(fn, x);
    var tangentColor = isNaN(slope) ? '#f97316' : slopeColor(slope);
    var b = fx - slope * x;
    var bStr = b >= 0 ? '+ ' + b.toFixed(3) : '- ' + Math.abs(b).toFixed(3);
    var tangentExpr = slope.toFixed(4) + ' * x ' + bStr;

    calculator.setExpressions([
      { id: 'fn',      latex: 'f(x) = ' + fn,      color: '#7c6af7', lineWidth: 2.5 },
      { id: 'tangent', latex: 'y = ' + tangentExpr, color: tangentColor, lineWidth: 2,
        lineStyle: Desmos.Styles.DASHED },
      { id: 'point',   latex: '(' + x + ', ' + fx.toFixed(6) + ')',
        color: tangentColor, pointSize: 12 },
    ]);

    document.getElementById('slopeVal').textContent =
      isNaN(slope) ? 'undefined' : slope.toFixed(4);
    document.getElementById('fxVal').textContent =
      isNaN(fx) ? 'undefined' : fx.toFixed(4);
  }

  var slider = document.getElementById('xSlider');
  var xValEl = document.getElementById('xVal');
  slider.addEventListener('input', function() {
    currentX = parseFloat(slider.value);
    xValEl.textContent = currentX.toFixed(1);
    updateGraph();
  });

  document.querySelectorAll('.func-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.func-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      currentFn = btn.dataset.fn;
      if (currentFn === '\\ln(x)' && currentX <= 0) {
        currentX = 1;
        slider.value = 1;
        xValEl.textContent = '1.0';
      }
      updateGraph();
    });
  });

  updateGraph();

  var canvas = document.getElementById('secantCanvas');
  var ctx = canvas.getContext('2d');
  canvas.width = Math.min(640, window.innerWidth - 64);
  canvas.height = 260;

  var W = canvas.width, H = canvas.height;
  var cx = W * 0.5, cy = H * 0.6;
  var scaleX = W / 10, scaleY = H / 14;
  var fx0 = 1.5;

  function toCanvas(x, y) {
    return [cx + x * scaleX, cy - y * scaleY];
  }

  function drawScene(h) {
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.stroke();

    ctx.strokeStyle = '#7c6af7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var px = 0; px < W; px++) {
      var xv = (px - cx) / scaleX;
      var yv = xv * xv;
      var pt = toCanvas(xv, yv);
      if (px === 0) ctx.moveTo(pt[0], pt[1]);
      else ctx.lineTo(pt[0], pt[1]);
    }
    ctx.stroke();

    var x1 = fx0, y1 = x1 * x1;
    var x2 = fx0 + h, y2 = x2 * x2;
    var slope = h < 0.001 ? 2 * fx0 : (y2 - y1) / (x2 - x1);

    ctx.strokeStyle = h < 0.001 ? '#a78bfa' : '#f97316';
    ctx.lineWidth = 2;
    ctx.setLineDash(h < 0.001 ? [] : [6, 4]);
    ctx.beginPath();
    var s1 = toCanvas(-3, y1 + slope * (-3 - x1));
    var s2 = toCanvas( 5, y1 + slope * ( 5 - x1));
    ctx.moveTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    var p1 = toCanvas(x1, y1);
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.arc(p1[0], p1[1], 5, 0, Math.PI * 2); ctx.fill();

    if (h > 0.01) {
      var p2 = toCanvas(x2, y2);
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(p2[0], p2[1], 5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.font = Math.round(W * 0.022) + "px 'Courier New', monospace";
    ctx.fillStyle = h < 0.01 ? '#a78bfa' : '#f97316';
    var label = h < 0.001
      ? 'tangent slope = ' + slope.toFixed(2)
      : 'secant slope = ' + slope.toFixed(2) + '  (h = ' + h.toFixed(2) + ')';
    ctx.fillText(label, 14, 22);
  }

  drawScene(2.5);

  var animating = false;
  var animH = 2.5;
  var animBtn = document.getElementById('animBtn');

  animBtn.addEventListener('click', function() {
    if (animating) return;
    animating = true;
    animH = 2.5;
    animBtn.disabled = true;
    animBtn.textContent = 'animating...';

    function step() {
      animH *= 0.92;
      drawScene(animH);
      if (animH > 0.001) {
        requestAnimationFrame(step);
      } else {
        drawScene(0);
        animating = false;
        animBtn.disabled = false;
        animBtn.textContent = 'Animate again';
      }
    }
    requestAnimationFrame(step);
  });

  // ── Shared viz utilities ─────────────────────────────────────────────────

  var VIZ_FNS = {
    pow2: function(x) { return x * x; },
    pow3: function(x) { return x * x * x; },
    sin:  function(x) { return Math.sin(x); },
    exp:  function(x) { return Math.exp(x); }
  };

  function vizDeriv(f, x) {
    var h = 1e-7;
    return (f(x + h) - f(x - h)) / (2 * h);
  }

  // Returns a CSS color string for a derivative value
  // orange (rising) <-> grey (flat) <-> blue (falling)
  function slopeColor(d) {
    var t = Math.max(-1, Math.min(1, d / 4));
    if (t >= 0) {
      var r = Math.round(249 * t + 148 * (1 - t));
      var g = Math.round(115 * t + 163 * (1 - t));
      var b = Math.round(22  * t + 184 * (1 - t));
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    } else {
      t = -t;
      var r2 = Math.round(96  * t + 148 * (1 - t));
      var g2 = Math.round(165 * t + 163 * (1 - t));
      var b2 = Math.round(250 * t + 184 * (1 - t));
      return 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')';
    }
  }

  function setupCanvas(id) {
    var c = document.getElementById(id);
    if (!c) return null;
    c.width  = c.offsetWidth  || 680;
    c.height = c.offsetHeight || 240;
    return c;
  }

  // ── 1. Twin Curves ───────────────────────────────────────────────────────
  // Shows the secant line through two points on f(x). As h→0, it becomes
  // the tangent. The y-axis autoscales so the picture is always readable.

  (function() {
    var c = setupCanvas('twinCanvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;
    var f = VIZ_FNS.pow2;
    var twinH = 2.0, twinX = 1.0;

    var hSlider = document.getElementById('twinHSlider');
    var xSlider = document.getElementById('twinXSlider');
    var hVal    = document.getElementById('twinHVal');
    var xVal    = document.getElementById('twinXVal');
    var info    = document.getElementById('twinInfo');

    var xRange = 8;   // x from -4 to 4
    var cx = W * 0.5;
    var sx = W / xRange;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Autoscale y to fit the curve in the visible x range
      var yVals = [];
      for (var px = 0; px < W; px++) {
        var xv = (px - cx) / sx;
        var yv = f(xv);
        if (isFinite(yv)) yVals.push(yv);
      }
      var yMin = Math.min.apply(null, yVals);
      var yMax = Math.max.apply(null, yVals);
      var yPad = Math.max((yMax - yMin) * 0.25, 1);
      yMin -= yPad; yMax += yPad;
      var yRange = yMax - yMin;
      var cy = H - H * (-yMin / yRange);   // where y=0 lands in canvas pixels
      var sy = H / yRange;

      function toC(x, y) { return [cx + x * sx, H - (y - yMin) / yRange * H]; }

      // axes
      ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H - (-yMin / yRange) * H); ctx.lineTo(W, H - (-yMin / yRange) * H);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
      ctx.stroke();

      // f(x) curve in purple
      ctx.strokeStyle = '#7c6af7'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      var started = false;
      for (var px2 = 0; px2 < W; px2++) {
        var xv2 = (px2 - cx) / sx;
        var yv2 = f(xv2);
        if (!isFinite(yv2)) { started = false; continue; }
        var pt = toC(xv2, yv2);
        if (!started) { ctx.moveTo(pt[0], pt[1]); started = true; }
        else ctx.lineTo(pt[0], pt[1]);
      }
      ctx.stroke();

      // The two points on the curve: A = (twinX, f(twinX)), B = (twinX+h, f(twinX+h))
      var ax = twinX,        ay = f(twinX);
      var bx = twinX + twinH, by = f(twinX + twinH);
      var pA = toC(ax, ay), pB = toC(bx, by);

      // Secant (or tangent) line extended across the canvas
      var secantSlope = Math.abs(twinH) < 0.005
        ? vizDeriv(f, twinX)
        : (by - ay) / (bx - ax);
      var isTangent = Math.abs(twinH) < 0.005;

      var leftX  = (0 - cx) / sx;
      var rightX = (W - cx) / sx;
      var sL = toC(leftX,  ay + secantSlope * (leftX  - ax));
      var sR = toC(rightX, ay + secantSlope * (rightX - ax));

      var secantColor = slopeColor(secantSlope);
      ctx.strokeStyle = isTangent ? '#a78bfa' : secantColor;
      ctx.lineWidth = 2;
      ctx.setLineDash(isTangent ? [] : [7, 5]);
      ctx.beginPath(); ctx.moveTo(sL[0], sL[1]); ctx.lineTo(sR[0], sR[1]); ctx.stroke();
      ctx.setLineDash([]);

      // Rise annotation (vertical green dashed line between A-height and B-height at x=A)
      if (!isTangent) {
        var riseTop = toC(ax, by), riseBot = toC(ax, ay);
        ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(riseTop[0], riseTop[1]); ctx.lineTo(riseBot[0], riseBot[1]); ctx.stroke();

        // Run annotation (horizontal line at y=f(a) from A to B)
        var runLeft = toC(ax, ay), runRight = toC(bx, ay);
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(runLeft[0], runLeft[1]); ctx.lineTo(runRight[0], runRight[1]); ctx.stroke();
        ctx.setLineDash([]);

        // Labels
        ctx.font = "11px 'Courier New', monospace";
        ctx.fillStyle = '#34d399';
        ctx.fillText('rise', riseTop[0] + 5, (riseTop[1] + riseBot[1]) / 2);
        ctx.fillStyle = '#f97316';
        ctx.fillText('run = h', (runLeft[0] + runRight[0]) / 2 - 20, runLeft[1] + 14);
      }

      // Point A (purple)
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath(); ctx.arc(pA[0], pA[1], 5, 0, Math.PI*2); ctx.fill();

      // Point B (orange) — only visible when h is large enough
      if (!isTangent) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath(); ctx.arc(pB[0], pB[1], 5, 0, Math.PI*2); ctx.fill();
      }

      // Info bar
      var exact = vizDeriv(f, twinX);
      if (isTangent) {
        info.textContent = 'h \u2192 0: tangent slope = ' + exact.toFixed(4) + '  \u2713 this IS the derivative';
      } else {
        info.textContent = 'secant slope = ' + secantSlope.toFixed(4)
          + '  |  true derivative = ' + exact.toFixed(4)
          + '  |  error = ' + Math.abs(secantSlope - exact).toFixed(4);
      }
    }

    hSlider.addEventListener('input', function() {
      twinH = parseFloat(hSlider.value);
      hVal.textContent = twinH.toFixed(2);
      draw();
    });
    xSlider.addEventListener('input', function() {
      twinX = parseFloat(xSlider.value);
      xVal.textContent = twinX.toFixed(1);
      draw();
    });

    draw();
  }());

  // ── 2. Velocity Ghost ───────────────────────────────────────────────────

  (function() {
    var c = setupCanvas('ghostCanvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;
    var f = VIZ_FNS.pow2;

    var running = false, animId = null;
    var t = -3.5;
    var ghosts = [];
    var ghostEvery = 18, frameCount = 0;

    var btn = document.getElementById('ghostBtn');
    var btns = {
      pow2: document.getElementById('ghostFnPow2'),
      sin:  document.getElementById('ghostFnSin'),
      pow3: document.getElementById('ghostFnPow3')
    };

    var xRange = 8, yRange = 14;
    var cx = W * 0.5, cy = H * 0.68;
    var sx = W / xRange, sy = H / yRange;

    function toC(x, y) { return [cx + x * sx, cy - y * sy]; }

    function setFn(name) {
      f = VIZ_FNS[name];
      Object.keys(btns).forEach(function(k) { btns[k].classList.remove('active'); });
      btns[name].classList.add('active');
      t = -3.5; ghosts = [];
    }

    Object.keys(btns).forEach(function(k) {
      btns[k].addEventListener('click', function() { setFn(k); });
    });
    btns.pow2.classList.add('active');

    function drawFrame() {
      ctx.clearRect(0, 0, W, H);

      // axes
      ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(W, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
      ctx.stroke();

      // curve
      ctx.strokeStyle = '#7c6af7'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (var px = 0; px < W; px++) {
        var xv = (px - cx) / sx;
        var pt = toC(xv, f(xv));
        px === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1]);
      }
      ctx.stroke();

      // ghosts
      for (var i = 0; i < ghosts.length; i++) {
        var g = ghosts[i];
        var age = (ghosts.length - i) / Math.max(ghosts.length, 1);
        var alpha = (1 - age) * 0.85;
        var gpt = toC(g.x, g.y);
        var col = slopeColor(g.d);

        // True tangent direction in canvas space:
        // math tangent vector: (1, d) → canvas: (sx, -sy*d), then normalize & scale
        var rawDx = sx, rawDy = -sy * g.d;
        var mag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
        var scale = Math.min(Math.abs(g.d) * 8 + 10, 44);
        var adx = (rawDx / mag) * scale;
        var ady = (rawDy / mag) * scale;

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gpt[0], gpt[1]);
        ctx.lineTo(gpt[0] + adx, gpt[1] + ady);
        ctx.stroke();

        // arrowhead
        var hLen = 6;
        var ang = Math.atan2(ady, adx);
        ctx.beginPath();
        ctx.moveTo(gpt[0] + adx, gpt[1] + ady);
        ctx.lineTo(gpt[0] + adx - hLen * Math.cos(ang - 0.4), gpt[1] + ady - hLen * Math.sin(ang - 0.4));
        ctx.moveTo(gpt[0] + adx, gpt[1] + ady);
        ctx.lineTo(gpt[0] + adx - hLen * Math.cos(ang + 0.4), gpt[1] + ady - hLen * Math.sin(ang + 0.4));
        ctx.stroke();

        // dot
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(gpt[0], gpt[1], 3, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // live point
      var lx = t, ly = f(t), ld = vizDeriv(f, t);
      var lpt = toC(lx, ly);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(lpt[0], lpt[1], 6, 0, Math.PI*2); ctx.fill();

      // label
      ctx.font = "13px 'Courier New', monospace";
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText("x=" + lx.toFixed(2) + "  f'=" + ld.toFixed(2), 12, 20);
    }

    function tick() {
      t += 0.035;
      frameCount++;

      if (frameCount % ghostEvery === 0) {
        var gx = t, gy = f(t), gd = vizDeriv(f, t);
        ghosts.push({ x: gx, y: gy, d: gd });
        if (ghosts.length > 30) ghosts.shift();
      }

      drawFrame();

      if (t < 3.5) {
        animId = requestAnimationFrame(tick);
      } else {
        running = false;
        btn.disabled = false;
        btn.textContent = '\u25B6 Launch again';
      }
    }

    btn.addEventListener('click', function() {
      if (running) return;
      running = true; t = -3.5; ghosts = []; frameCount = 0;
      btn.disabled = true; btn.textContent = 'running...';
      animId = requestAnimationFrame(tick);
    });

    drawFrame();
  }());

  // ── 3. Temperature Map ─────────────────────────────────────────────────
  // Top panel: f(x) painted by f'(x) color.
  // Bottom panel: f'(x) painted by its own local slope color (≈ f''(x)).
  // Both panels autoscale so every function stays visible.

  (function() {
    var c = setupCanvas('tempCanvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;
    var f = VIZ_FNS.sin;

    // exp removed — its derivative grows so fast the colors are meaningless
    var btnMap = {
      sin:  document.getElementById('tempFnSin'),
      pow2: document.getElementById('tempFnPow2'),
      pow3: document.getElementById('tempFnPow3'),
      exp:  document.getElementById('tempFnExp')
    };

    function setFn(name) {
      f = VIZ_FNS[name];
      Object.keys(btnMap).forEach(function(k) { btnMap[k].classList.remove('active'); });
      btnMap[name].classList.add('active');
      draw();
    }

    Object.keys(btnMap).forEach(function(k) {
      btnMap[k].addEventListener('click', function() { setFn(k); });
    });
    btnMap.sin.classList.add('active');

    var xRange = 8;  // x from -4 to 4
    var cx = W * 0.5;
    var sx = W / xRange;

    function xvAt(px) { return (px - cx) / sx; }

    // Collect y-values and derivative values across all pixels
    function scanFn(fn) {
      var fVals = [], dVals = [];
      for (var px = 0; px < W; px++) {
        var xv = xvAt(px);
        var fv = fn(xv), dv = vizDeriv(fn, xv);
        if (isFinite(fv)) fVals.push(fv);
        if (isFinite(dv)) dVals.push(dv);
      }
      return { fVals: fVals, dVals: dVals };
    }

    function padRange(arr, pct) {
      var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr);
      var pad = Math.max((mx - mn) * pct, 0.5);
      return [mn - pad, mx + pad];
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      var scan = scanFn(f);
      var fRange = padRange(scan.fVals, 0.15);
      var dRange = padRange(scan.dVals, 0.15);

      var topH = Math.round(H * 0.55);
      var botH = H - topH;

      // Helper: map value in [lo,hi] to a y-pixel within [yTop, yBot]
      function mapY(v, lo, hi, yTop, yBot) {
        return yTop + (1 - (v - lo) / (hi - lo)) * (yBot - yTop);
      }

      // ── Top panel: f(x) ──────────────────────────────────────────────
      var fLo = fRange[0], fHi = fRange[1];
      // zero axis for f
      var fAxisY = mapY(0, fLo, fHi, 0, topH);
      ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, fAxisY); ctx.lineTo(W, fAxisY);
      ctx.moveTo(cx, 0);     ctx.lineTo(cx, topH);
      ctx.stroke();

      ctx.font = "11px system-ui, sans-serif";
      ctx.fillStyle = '#8892a4';
      ctx.fillText('f(x)', 6, 14);

      ctx.lineWidth = 3;
      for (var px = 1; px < W; px++) {
        var xv0 = xvAt(px - 1), xv1 = xvAt(px);
        var fv0 = f(xv0), fv1 = f(xv1);
        if (!isFinite(fv0) || !isFinite(fv1)) continue;
        var d1 = vizDeriv(f, xv1);
        var y0 = mapY(fv0, fLo, fHi, 0, topH);
        var y1 = mapY(fv1, fLo, fHi, 0, topH);
        ctx.strokeStyle = slopeColor(d1);
        ctx.beginPath(); ctx.moveTo(px - 1, y0); ctx.lineTo(px, y1); ctx.stroke();
      }

      // ── Bottom panel: f'(x) ──────────────────────────────────────────
      var dLo = dRange[0], dHi = dRange[1];
      var dAxisY = topH + mapY(0, dLo, dHi, 0, botH);

      // separator + axes
      ctx.strokeStyle = '#2a2d3a'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, topH); ctx.lineTo(W, topH);
      ctx.moveTo(0, dAxisY); ctx.lineTo(W, dAxisY);
      ctx.moveTo(cx, topH); ctx.lineTo(cx, H);
      ctx.stroke();

      ctx.fillText("f'(x)", 6, topH + 14);

      ctx.lineWidth = 2.5;
      for (var px2 = 1; px2 < W; px2++) {
        var xv20 = xvAt(px2 - 1), xv21 = xvAt(px2);
        var d20 = vizDeriv(f, xv20), d21 = vizDeriv(f, xv21);
        if (!isFinite(d20) || !isFinite(d21)) continue;
        var segDx = xv21 - xv20;
        var slopeOfDerivative = segDx !== 0 ? (d21 - d20) / segDx : 0;
        var dy0 = topH + mapY(d20, dLo, dHi, 0, botH);
        var dy1 = topH + mapY(d21, dLo, dHi, 0, botH);
        ctx.strokeStyle = slopeColor(slopeOfDerivative);
        ctx.beginPath(); ctx.moveTo(px2 - 1, dy0); ctx.lineTo(px2, dy1); ctx.stroke();
      }

      // Color legend
      var lgX = W - 130, lgY = 8, lgW = 120, lgH2 = 10;
      var grad = ctx.createLinearGradient(lgX, 0, lgX + lgW, 0);
      grad.addColorStop(0,   'rgb(96,165,250)');
      grad.addColorStop(0.5, 'rgb(148,163,184)');
      grad.addColorStop(1,   'rgb(249,115,22)');
      ctx.fillStyle = grad;
      ctx.fillRect(lgX, lgY, lgW, lgH2);
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = '#8892a4';
      ctx.fillText('falling', lgX, lgY + lgH2 + 11);
      ctx.fillText('rising',  lgX + lgW - 32, lgY + lgH2 + 11);
    }

    draw();
  }());

  // ── 4. Music of Slope ──────────────────────────────────────────────────

  (function() {
    var c = setupCanvas('musicCanvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    c.height = 120;
    var W = c.width, H = 120;
    var f = VIZ_FNS.sin;

    var audioCtx = null, osc = null, gainNode = null;
    var playing = false;

    var xSlider  = document.getElementById('musicXSlider');
    var xValEl   = document.getElementById('musicXVal');
    var info     = document.getElementById('musicInfo');
    var playBtn  = document.getElementById('musicBtn');

    var btnMap = {
      sin:  document.getElementById('musicFnSin'),
      pow2: document.getElementById('musicFnPow2'),
      pow3: document.getElementById('musicFnPow3')
    };

    function setFn(name) {
      f = VIZ_FNS[name];
      Object.keys(btnMap).forEach(function(k) { btnMap[k].classList.remove('active'); });
      btnMap[name].classList.add('active');
      updateMusic();
      drawWave();
    }

    Object.keys(btnMap).forEach(function(k) {
      btnMap[k].addEventListener('click', function() { setFn(k); });
    });
    btnMap.sin.classList.add('active');

    function slopeToFreq(d) {
      // slope 0 => 261.63 Hz (middle C)
      // each 4 units of slope => +/- 1 octave
      // Clamped to [65, 1047] Hz so extreme derivatives (x^3 at x=4) stay audible
      var raw = 261.63 * Math.pow(2, d / 4);
      return Math.max(65, Math.min(1047, raw));
    }

    function updateMusic() {
      var x = parseFloat(xSlider.value);
      var d = vizDeriv(f, x);
      var freq = slopeToFreq(d);
      info.textContent = "slope = " + d.toFixed(3) + "   |   freq = " + freq.toFixed(1) + " Hz";
      if (playing && osc) {
        osc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
      }
      drawWave(d);
    }

    function drawWave(d) {
      ctx.clearRect(0, 0, W, H);
      var cy = H / 2;

      // background
      ctx.fillStyle = '#12141e';
      ctx.fillRect(0, 0, W, H);

      if (!playing) {
        ctx.font = "13px 'Courier New', monospace";
        ctx.fillStyle = '#8892a4';
        ctx.textAlign = 'center';
        ctx.fillText('Press Play to hear the slope', W/2, cy + 5);
        ctx.textAlign = 'left';
        return;
      }

      // animated sine wave whose frequency reflects the slope
      var x = parseFloat(xSlider.value);
      var slope = (d !== undefined) ? d : vizDeriv(f, x);
      var freq = slopeToFreq(slope);
      var cycles = freq / 80;
      var col = slopeColor(slope);

      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (var px = 0; px < W; px++) {
        var angle = (px / W) * Math.PI * 2 * cycles;
        var y = cy - Math.sin(angle) * (cy * 0.7);
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();

      // label
      ctx.font = "12px 'Courier New', monospace";
      ctx.fillStyle = col;
      ctx.fillText(freq.toFixed(0) + ' Hz', 10, 18);
    }

    playBtn.addEventListener('click', function() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.18;
        gainNode.connect(audioCtx.destination);
      }

      if (playing) {
        osc.stop();
        osc = null;
        playing = false;
        playBtn.textContent = '\u25B6 Play';
        drawWave();
        return;
      }

      var x = parseFloat(xSlider.value);
      var d = vizDeriv(f, x);
      osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = slopeToFreq(d);
      osc.connect(gainNode);
      osc.start();
      playing = true;
      playBtn.textContent = '\u23F9 Stop';
      drawWave(d);
    });

    xSlider.addEventListener('input', function() {
      xValEl.textContent = parseFloat(xSlider.value).toFixed(1);
      updateMusic();
    });

    drawWave();
  }());

  // ── 5. Ask AI (section + sentence) ─────────────────────────────────────

  (function() {
    var QA_STORAGE_KEY = 'page-ai-qa-v2';
    var PROVIDERS = {
      chatgpt: {
        label: 'ChatGPT',
        keyStorageKey: 'viz-qa-openai-key-v1',
        model: 'gpt-4.1-mini'
      },
      claude: {
        label: 'Claude',
        keyStorageKey: 'viz-qa-claude-key-v1',
        model: 'claude-3-5-sonnet-latest'
      }
    };
    var QUICK_INTENTS = [
      { id: 'simple', label: 'Explain Simply', instruction: 'Explain in plain language for a beginner.' },
      { id: 'example', label: 'Give Example', instruction: 'Include one concrete numeric or visual example.' },
      { id: 'why', label: 'Why Is This True?', instruction: 'Focus on intuition for why this is true.' },
      { id: 'graph', label: 'Relate To Graph', instruction: 'Tie the answer directly to the graph or visualization.' }
    ];

    function readStorage(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }

    function writeStorage(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // no-op when storage is unavailable
      }
    }

    function removeStorage(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // no-op when storage is unavailable
      }
    }

    function providerConfig(provider) {
      return PROVIDERS[provider] || PROVIDERS.chatgpt;
    }

    function providerLabel(provider) {
      return providerConfig(provider).label;
    }

    function normalizeText(value) {
      return (value || '').replace(/\s+/g, ' ').trim();
    }

    function truncateText(value, maxLen) {
      if (!value) return '';
      return value.length > maxLen ? value.slice(0, maxLen - 3) + '...' : value;
    }

    function hashText(value) {
      var str = String(value || '');
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        hash = ((hash * 31) + str.charCodeAt(i)) >>> 0;
      }
      return hash.toString(36);
    }

    function slugify(value) {
      var text = normalizeText(value).toLowerCase();
      return text
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    function ensureElementId(el, prefix) {
      if (!el) return prefix + '-' + Math.random().toString(36).slice(2, 8);
      if (el.id) return el.id;
      var base = slugify(el.textContent || '') || prefix;
      var candidate = base;
      var idx = 2;
      while (document.getElementById(candidate)) {
        candidate = base + '-' + idx;
        idx++;
      }
      el.id = candidate;
      return el.id;
    }

    function loadState() {
      var raw = readStorage(QA_STORAGE_KEY);
      if (!raw) return { contexts: {}, contextMeta: {} };
      try {
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { contexts: {}, contextMeta: {} };
        if (!parsed.contexts || typeof parsed.contexts !== 'object') parsed.contexts = {};
        if (!parsed.contextMeta || typeof parsed.contextMeta !== 'object') parsed.contextMeta = {};
        return parsed;
      } catch (e) {
        return { contexts: {}, contextMeta: {} };
      }
    }

    var qaState = loadState();

    function saveState() {
      writeStorage(QA_STORAGE_KEY, JSON.stringify(qaState));
    }

    function getContextHistory(contextKey) {
      if (!Array.isArray(qaState.contexts[contextKey])) {
        qaState.contexts[contextKey] = [];
      }
      return qaState.contexts[contextKey];
    }

    function getContextMeta(contextKey) {
      var existing = qaState.contextMeta[contextKey];
      if (!existing || typeof existing !== 'object') {
        existing = {};
        qaState.contextMeta[contextKey] = existing;
      }
      return existing;
    }

    function upsertContextMeta(context) {
      if (!context || !context.key) return;
      var meta = getContextMeta(context.key);
      meta.type = context.type;
      meta.label = context.label;
      meta.excerpt = context.excerpt;
      meta.anchorId = context.anchorId;
      meta.quoteSnippet = context.quoteSnippet || '';
      if (context.quoteHash) meta.quoteHash = context.quoteHash;
      qaState.contextMeta[context.key] = meta;
    }

    function removeContextIfEmpty(contextKey) {
      var history = getContextHistory(contextKey);
      if (history.length) return;
      delete qaState.contexts[contextKey];
      delete qaState.contextMeta[contextKey];
    }

    function getApiKey(provider) {
      var key = readStorage(providerConfig(provider).keyStorageKey);
      return key ? key.trim() : '';
    }

    function setApiKey(provider, key) {
      var clean = (key || '').trim();
      var storageKey = providerConfig(provider).keyStorageKey;
      if (!clean) {
        removeStorage(storageKey);
        return '';
      }
      writeStorage(storageKey, clean);
      return clean;
    }

    function promptForApiKey(provider) {
      var label = providerLabel(provider);
      var current = getApiKey(provider);
      var entered = window.prompt(
        'Paste your ' + label + ' API key. Leave blank to clear it. It is stored only in this browser.',
        current
      );
      if (entered === null) return null;
      return setApiKey(provider, entered);
    }

    function keyStatusLabel() {
      var openAiText = getApiKey('chatgpt') ? 'ChatGPT key saved' : 'ChatGPT key missing';
      var claudeText = getApiKey('claude') ? 'Claude key saved' : 'Claude key missing';
      return openAiText + ' | ' + claudeText;
    }

    function makeContext(type, label, excerpt, anchorId, options) {
      var opts = options || {};
      var safeType = type || 'section';
      var safeLabel = normalizeText(label) || 'Selected context';
      var safeExcerpt = truncateText(normalizeText(excerpt), 650);
      var safeAnchor = anchorId || (safeType + '-' + hashText(safeLabel + safeExcerpt));
      var safeQuoteSnippet = truncateText(normalizeText(opts.quoteSnippet || safeExcerpt), 220);
      var safeQuoteHash = opts.quoteHash || hashText(safeQuoteSnippet);
      var keySeed = safeType + '|' + safeAnchor + '|' + safeQuoteHash;
      return {
        type: safeType,
        label: safeLabel,
        excerpt: safeExcerpt,
        anchorId: safeAnchor,
        quoteSnippet: safeQuoteSnippet,
        quoteHash: safeQuoteHash,
        key: safeType + ':' + hashText(keySeed)
      };
    }

    function collectRecentContext(history) {
      if (!history.length) return '';
      var recent = history.slice(-3);
      var lines = ['Previous Q&A for this same context:'];
      for (var i = 0; i < recent.length; i++) {
        var item = recent[i];
        lines.push(
          (i + 1) + '. [' + providerLabel(item.provider) + '] Q: ' + truncateText(item.question || '', 220)
        );
        lines.push('   A: ' + truncateText(item.answer || '', 380));
      }
      return lines.join('\n');
    }

    function buildPrompts(context, question, intentInstruction, recentContext) {
      var systemPrompt =
        'You are a precise calculus tutor. Be accurate, clear, and concise. ' +
        'Write all mathematical notation in LaTeX delimiters: inline \\(...\\) and display \\[...\\]. ' +
        'Respond in plain text using exactly this structure:\n' +
        'Direct answer:\n' +
        'Why this applies here:\n' +
        'Example:\n' +
        'Next questions:\n' +
        '- ...\n' +
        '- ...';

      var userPrompt =
        'Context type: ' + context.type + '\n' +
        'Context label: ' + context.label + '\n' +
        'Context excerpt: "' + context.excerpt + '"\n' +
        'Learning intent: ' + intentInstruction + '\n' +
        (recentContext ? recentContext + '\n' : '') +
        'Question: ' + question;

      return { systemPrompt: systemPrompt, userPrompt: userPrompt };
    }

    function setAnswerContent(el, text) {
      el.textContent = text || '';
      if (typeof window.renderMathInElement === 'function') {
        try {
          window.renderMathInElement(el, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\[', right: '\\]', display: true },
              { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false
          });
        } catch (e) {
          // Keep plain text fallback on KaTeX render errors.
        }
      }
    }

    function extractOpenAIResponseText(payload) {
      if (payload && typeof payload.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text.trim();
      }
      if (!payload || !Array.isArray(payload.output)) return '';
      var chunks = [];
      for (var i = 0; i < payload.output.length; i++) {
        var out = payload.output[i];
        if (!out || !Array.isArray(out.content)) continue;
        for (var j = 0; j < out.content.length; j++) {
          var part = out.content[j];
          if (part && typeof part.text === 'string' && part.text.trim()) {
            chunks.push(part.text.trim());
          }
        }
      }
      return chunks.join('\n\n').trim();
    }

    function extractClaudeResponseText(payload) {
      if (!payload || !Array.isArray(payload.content)) return '';
      var chunks = [];
      for (var i = 0; i < payload.content.length; i++) {
        var part = payload.content[i];
        if (part && part.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
          chunks.push(part.text.trim());
        }
      }
      return chunks.join('\n\n').trim();
    }

    async function askChatGPT(context, question, intentInstruction, recentContext, apiKey) {
      var prompts = buildPrompts(context, question, intentInstruction, recentContext);
      var response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: providerConfig('chatgpt').model,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: prompts.systemPrompt }]
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: prompts.userPrompt }]
            }
          ],
          max_output_tokens: 700
        })
      });

      if (!response.ok) {
        var message = 'ChatGPT request failed (' + response.status + ').';
        try {
          var errPayload = await response.json();
          if (errPayload && errPayload.error && errPayload.error.message) {
            message = errPayload.error.message;
          }
        } catch (e) {
          // keep default message
        }
        throw new Error(message);
      }

      var payload = await response.json();
      var text = extractOpenAIResponseText(payload);
      if (!text) throw new Error('ChatGPT returned an empty response. Try again.');
      return text;
    }

    async function askClaude(context, question, intentInstruction, recentContext, apiKey) {
      var prompts = buildPrompts(context, question, intentInstruction, recentContext);
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: providerConfig('claude').model,
          system: prompts.systemPrompt,
          max_tokens: 700,
          messages: [{ role: 'user', content: prompts.userPrompt }]
        })
      });

      if (!response.ok) {
        var message = 'Claude request failed (' + response.status + ').';
        try {
          var errPayload = await response.json();
          if (errPayload && errPayload.error && errPayload.error.message) {
            message = errPayload.error.message;
          }
        } catch (e) {
          // keep default message
        }
        throw new Error(message);
      }

      var payload = await response.json();
      var text = extractClaudeResponseText(payload);
      if (!text) throw new Error('Claude returned an empty response. Try again.');
      return text;
    }

    async function askByProvider(provider, context, question, intentInstruction, recentContext, apiKey) {
      if (provider === 'claude') {
        return askClaude(context, question, intentInstruction, recentContext, apiKey);
      }
      return askChatGPT(context, question, intentInstruction, recentContext, apiKey);
    }

    function formatTimestamp(iso) {
      if (!iso) return 'Saved';
      var d = new Date(iso);
      if (isNaN(d.getTime())) return 'Saved';
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }

    function makeId() {
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }

    function contextFromKey(contextKey) {
      var meta = qaState.contextMeta[contextKey];
      if (!meta) return null;
      var ctx = makeContext(
        meta.type || 'section',
        meta.label || 'Saved context',
        meta.excerpt || '',
        meta.anchorId || '',
        {
          quoteSnippet: meta.quoteSnippet || '',
          quoteHash: meta.quoteHash || ''
        }
      );
      ctx.key = contextKey;
      return ctx;
    }

    function findParentCard(node) {
      var curr = node;
      while (curr && curr !== document.body) {
        if (curr.classList && curr.classList.contains('visual-card')) return curr;
        curr = curr.parentNode;
      }
      return null;
    }

    function findIntentConfig(id) {
      for (var i = 0; i < QUICK_INTENTS.length; i++) {
        if (QUICK_INTENTS[i].id === id) return QUICK_INTENTS[i];
      }
      return null;
    }

    function collectHeadingSnippet(headingEl, maxChars) {
      var parts = [];
      var total = 0;
      var node = headingEl.nextElementSibling;
      while (node && total < maxChars) {
        if (node.tagName === 'H2' || node.tagName === 'FOOTER') break;
        var text = normalizeText(node.textContent);
        if (text) {
          parts.push(text);
          total += text.length + 1;
        }
        if (node.tagName === 'SECTION') break;
        node = node.nextElementSibling;
      }
      return truncateText(parts.join(' '), maxChars);
    }

    var panelRoot = document.createElement('aside');
    panelRoot.className = 'ai-assist-panel';
    panelRoot.setAttribute('aria-hidden', 'true');
    panelRoot.innerHTML =
      '<div class="ai-assist-header">' +
        '<div class="ai-assist-title">Ask AI</div>' +
        '<button type="button" class="ai-assist-close" aria-label="Close panel">Close</button>' +
      '</div>' +
      '<div class="ai-context-box">' +
        '<div class="ai-context-type">Context</div>' +
        '<div class="ai-context-label">Pick a section or highlight a sentence.</div>' +
        '<p class="ai-context-excerpt"></p>' +
      '</div>' +
      '<div class="ai-assist-row">' +
        '<label class="ai-field-label" for="aiProvider">Assistant</label>' +
        '<select id="aiProvider" class="ai-provider-select">' +
          '<option value="chatgpt">ChatGPT</option>' +
          '<option value="claude">Claude</option>' +
        '</select>' +
      '</div>' +
      '<div class="ai-assist-row ai-key-row">' +
        '<button type="button" class="func-btn ai-key-btn ai-key-openai">Set ChatGPT key</button>' +
        '<button type="button" class="func-btn ai-key-btn ai-key-claude">Set Claude key</button>' +
      '</div>' +
      '<div class="ai-key-status" aria-live="polite"></div>' +
      '<div class="ai-intent-chips"></div>' +
      '<form class="ai-question-form">' +
        '<textarea class="ai-question-input" rows="3" maxlength="800" placeholder="Ask a question about this context..." required></textarea>' +
        '<button type="submit" class="animate-btn ai-question-submit">Ask</button>' +
      '</form>' +
      '<p class="ai-question-status" aria-live="polite"></p>' +
      '<div class="ai-history-list"></div>';
    document.body.appendChild(panelRoot);

    var panel = {
      root: panelRoot,
      closeBtn: panelRoot.querySelector('.ai-assist-close'),
      contextType: panelRoot.querySelector('.ai-context-type'),
      contextLabel: panelRoot.querySelector('.ai-context-label'),
      contextExcerpt: panelRoot.querySelector('.ai-context-excerpt'),
      provider: panelRoot.querySelector('.ai-provider-select'),
      openAiKeyBtn: panelRoot.querySelector('.ai-key-openai'),
      claudeKeyBtn: panelRoot.querySelector('.ai-key-claude'),
      keyStatus: panelRoot.querySelector('.ai-key-status'),
      intents: panelRoot.querySelector('.ai-intent-chips'),
      form: panelRoot.querySelector('.ai-question-form'),
      input: panelRoot.querySelector('.ai-question-input'),
      submit: panelRoot.querySelector('.ai-question-submit'),
      status: panelRoot.querySelector('.ai-question-status'),
      history: panelRoot.querySelector('.ai-history-list')
    };

    var activeContext = null;
    var activeIntentId = '';
    var pendingSelectionContext = null;

    function setPanelOpen(isOpen) {
      if (isOpen) {
        panel.root.classList.add('open');
        panel.root.setAttribute('aria-hidden', 'false');
      } else {
        panel.root.classList.remove('open');
        panel.root.setAttribute('aria-hidden', 'true');
      }
    }

    function renderIntentChips() {
      panel.intents.innerHTML = '';
      for (var i = 0; i < QUICK_INTENTS.length; i++) {
        (function(intent) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ai-intent-chip' + (activeIntentId === intent.id ? ' active' : '');
          btn.textContent = intent.label;
          btn.addEventListener('click', function() {
            activeIntentId = (activeIntentId === intent.id) ? '' : intent.id;
            renderIntentChips();
          });
          panel.intents.appendChild(btn);
        }(QUICK_INTENTS[i]));
      }
    }

    function renderHistory() {
      panel.history.innerHTML = '';
      if (!activeContext) {
        var emptyDefault = document.createElement('p');
        emptyDefault.className = 'ai-history-empty';
        emptyDefault.textContent = 'Choose a section or highlight text to start.';
        panel.history.appendChild(emptyDefault);
        return;
      }

      var history = getContextHistory(activeContext.key);
      if (!history.length) {
        var empty = document.createElement('p');
        empty.className = 'ai-history-empty';
        empty.textContent = 'No saved Q&A for this context yet.';
        panel.history.appendChild(empty);
        return;
      }

      for (var i = history.length - 1; i >= 0; i--) {
        (function(entry) {
          var item = document.createElement('article');
          item.className = 'ai-history-item';

          var top = document.createElement('div');
          top.className = 'ai-history-top';

          var meta = document.createElement('div');
          meta.className = 'ai-history-meta';

          var providerTag = document.createElement('span');
          providerTag.className = 'ai-meta-tag';
          providerTag.textContent = providerLabel(entry.provider);

          meta.appendChild(providerTag);

          if (entry.intentId) {
            var intent = findIntentConfig(entry.intentId);
            if (intent) {
              var intentTag = document.createElement('span');
              intentTag.className = 'ai-meta-tag intent';
              intentTag.textContent = intent.label;
              meta.appendChild(intentTag);
            }
          }

          var time = document.createElement('span');
          time.className = 'ai-history-time';
          time.textContent = formatTimestamp(entry.createdAt);
          meta.appendChild(time);

          var del = document.createElement('button');
          del.type = 'button';
          del.className = 'ai-history-delete';
          del.textContent = 'Delete';
          del.addEventListener('click', function() {
            qaState.contexts[activeContext.key] = getContextHistory(activeContext.key).filter(function(x) {
              return x.id !== entry.id;
            });
            removeContextIfEmpty(activeContext.key);
            saveState();
            refreshIndicators();
            renderHistory();
            panel.status.textContent = 'Deleted one saved Q&A.';
          });

          top.appendChild(meta);
          top.appendChild(del);

          var q = document.createElement('p');
          q.className = 'ai-history-question';
          q.textContent = 'Q: ' + (entry.question || '');

          var a = document.createElement('p');
          a.className = 'ai-history-answer';
          setAnswerContent(a, entry.answer || '');

          item.appendChild(top);
          item.appendChild(q);
          item.appendChild(a);
          panel.history.appendChild(item);
        }(history[i]));
      }
    }

    function openForContext(context) {
      activeContext = context;
      panel.contextType.textContent = context.type.charAt(0).toUpperCase() + context.type.slice(1);
      panel.contextLabel.textContent = context.label;
      panel.contextExcerpt.textContent = context.excerpt || 'No extra excerpt available.';
      panel.status.textContent = '';
      renderHistory();
      setPanelOpen(true);
      panel.input.focus();
    }

    function closePanel() {
      setPanelOpen(false);
    }

    panel.closeBtn.addEventListener('click', function() {
      closePanel();
    });

    panel.openAiKeyBtn.addEventListener('click', function() {
      var value = promptForApiKey('chatgpt');
      if (value === null) return;
      panel.keyStatus.textContent = keyStatusLabel();
      panel.status.textContent = value ? 'ChatGPT key saved.' : 'ChatGPT key cleared.';
    });

    panel.claudeKeyBtn.addEventListener('click', function() {
      var value = promptForApiKey('claude');
      if (value === null) return;
      panel.keyStatus.textContent = keyStatusLabel();
      panel.status.textContent = value ? 'Claude key saved.' : 'Claude key cleared.';
    });

    panel.form.addEventListener('submit', async function(event) {
      event.preventDefault();
      if (!activeContext) {
        panel.status.textContent = 'Pick a section or sentence first.';
        return;
      }

      var question = normalizeText(panel.input.value);
      if (!question) return;

      var provider = panel.provider.value === 'claude' ? 'claude' : 'chatgpt';
      var apiKey = getApiKey(provider);
      if (!apiKey) {
        apiKey = promptForApiKey(provider);
        panel.keyStatus.textContent = keyStatusLabel();
      }
      if (!apiKey) {
        panel.status.textContent = 'Add a ' + providerLabel(provider) + ' key first.';
        return;
      }

      var intentConfig = findIntentConfig(activeIntentId);
      var intentInstruction = intentConfig ? intentConfig.instruction : 'General clarification.';
      var recentContext = collectRecentContext(getContextHistory(activeContext.key));

      var originalLabel = panel.submit.textContent;
      panel.submit.disabled = true;
      panel.provider.disabled = true;
      panel.input.disabled = true;
      panel.submit.textContent = 'Asking...';
      panel.status.textContent = 'Waiting for ' + providerLabel(provider) + '...';

      try {
        var answer = await askByProvider(
          provider,
          activeContext,
          question,
          intentInstruction,
          recentContext,
          apiKey
        );

        getContextHistory(activeContext.key).push({
          id: makeId(),
          provider: provider,
          intentId: activeIntentId || '',
          question: question,
          answer: answer,
          createdAt: new Date().toISOString()
        });
        upsertContextMeta(activeContext);
        getContextMeta(activeContext.key).lastAskedAt = new Date().toISOString();
        saveState();
        refreshIndicators();
        renderHistory();
        panel.input.value = '';
        panel.status.textContent = 'Saved via ' + providerLabel(provider) + '.';
      } catch (error) {
        panel.status.textContent = error && error.message
          ? error.message
          : 'Could not get an answer right now.';
      } finally {
        panel.submit.disabled = false;
        panel.provider.disabled = false;
        panel.input.disabled = false;
        panel.submit.textContent = originalLabel;
        panel.input.focus();
      }
    });

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && panel.root.classList.contains('open')) {
        closePanel();
      }
    });

    function contextFromHeading(headingEl) {
      var label = headingEl.getAttribute('data-ai-label') || normalizeText(headingEl.textContent);
      var anchorId = ensureElementId(headingEl, 'section');
      var excerpt = '';

      if (headingEl.classList.contains('visual-title')) {
        var card = headingEl.closest('.visual-card');
        var desc = card ? card.querySelector('.visual-desc') : null;
        excerpt = desc ? normalizeText(desc.textContent) : '';
        return makeContext('visualization', label, excerpt, anchorId);
      }

      if (headingEl.tagName === 'H3') {
        var stepBody = headingEl.closest('.guide-step-body');
        excerpt = stepBody ? normalizeText(stepBody.textContent.replace(label, '')) : '';
        return makeContext('section', label, excerpt, anchorId);
      }

      if (headingEl.classList.contains('rule-name')) {
        var ruleCard = headingEl.closest('.rule-card');
        excerpt = ruleCard ? normalizeText(ruleCard.textContent.replace(label, '')) : '';
        return makeContext('section', label, excerpt, anchorId, { quoteSnippet: label });
      }

      excerpt = collectHeadingSnippet(headingEl, 550);
      return makeContext('section', label, excerpt, anchorId);
    }

    function contextKeysForAnchor(anchorId) {
      var keys = [];
      var allKeys = Object.keys(qaState.contextMeta || {});
      for (var i = 0; i < allKeys.length; i++) {
        var key = allKeys[i];
        var meta = qaState.contextMeta[key];
        if (!meta || meta.anchorId !== anchorId) continue;
        if (!getContextHistory(key).length) continue;
        keys.push(key);
      }
      return keys;
    }

    function contextCountForAnchor(anchorId) {
      var keys = contextKeysForAnchor(anchorId);
      var total = 0;
      for (var i = 0; i < keys.length; i++) {
        total += getContextHistory(keys[i]).length;
      }
      return total;
    }

    function latestContextKeyForAnchor(anchorId) {
      var keys = contextKeysForAnchor(anchorId);
      if (!keys.length) return null;
      var bestKey = keys[0];
      var bestTime = 0;
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var meta = qaState.contextMeta[key] || {};
        var history = getContextHistory(key);
        var timeCandidate = Date.parse(meta.lastAskedAt || '');
        if (!isFinite(timeCandidate) && history.length) {
          timeCandidate = Date.parse(history[history.length - 1].createdAt || '');
        }
        if (!isFinite(timeCandidate)) timeCandidate = 0;
        if (timeCandidate >= bestTime) {
          bestTime = timeCandidate;
          bestKey = key;
        }
      }
      return bestKey;
    }

    function getScopeRootForAnchor(anchorId) {
      var anchorEl = document.getElementById(anchorId);
      if (!anchorEl) return null;
      if (anchorEl.classList.contains('visual-title')) {
        return anchorEl.closest('.visual-card') || anchorEl;
      }
      if (anchorEl.tagName === 'H3') {
        return anchorEl.closest('.guide-step-body') || anchorEl;
      }
      return anchorEl;
    }

    function escapeRegExp(value) {
      return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function findSelectionCandidates(meta) {
      if (!meta || meta.type !== 'selection') return null;
      var quote = normalizeText(meta.quoteSnippet || meta.excerpt);
      if (!quote) return null;

      var root = getScopeRootForAnchor(meta.anchorId);
      var candidates = [];

      if (root) {
        if (root.tagName === 'H2') {
          var node = root.nextElementSibling;
          while (node) {
            if (node.tagName === 'H2' || node.tagName === 'FOOTER') break;
            if (!node.classList || !node.classList.contains('viz-qa')) {
              candidates.push(node);
            }
            if (node.tagName === 'SECTION') break;
            node = node.nextElementSibling;
          }
        } else {
          candidates.push(root);
        }
      }
      if (!candidates.length) {
        candidates.push(document.body);
      }

      return {
        quote: quote,
        candidates: candidates
      };
    }

    function findSelectionContainer(meta) {
      var found = findSelectionCandidates(meta);
      if (!found) return null;
      var quote = found.quote;
      var probe = quote.slice(0, Math.min(120, quote.length));
      var candidates = found.candidates;
      var best = null;
      var bestScore = -1;

      var selector = 'p, li, td, .visual-desc, .guide-pull, .callout';
      for (var c = 0; c < candidates.length; c++) {
        var nodes = candidates[c].matches && candidates[c].matches(selector)
          ? [candidates[c]]
          : candidates[c].querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
          var el = nodes[i];
          if (el.closest && (el.closest('.ai-assist-panel') || el.closest('.viz-qa'))) continue;
          var text = normalizeText(el.textContent);
          if (!text) continue;
          if (text.indexOf(quote) !== -1) {
            return el;
          }
          var score = 0;
          if (text.indexOf(probe) !== -1) score += 4;
          if (probe.indexOf(text.slice(0, Math.min(80, text.length))) !== -1) score += 2;
          var shortQuote = quote.slice(0, Math.min(60, quote.length));
          if (shortQuote && text.indexOf(shortQuote) !== -1) score += 1;
          if (score > bestScore) {
            bestScore = score;
            best = el;
          }
        }
      }
      return best;
    }

    function rangeFromOffsets(container, startOffset, endOffset) {
      var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      var pos = 0;
      var startNode = null;
      var endNode = null;
      var startInNode = 0;
      var endInNode = 0;
      var lastNode = null;

      while (walker.nextNode()) {
        var node = walker.currentNode;
        var len = node.nodeValue.length;
        var nextPos = pos + len;
        lastNode = node;

        if (!startNode && startOffset <= nextPos) {
          startNode = node;
          startInNode = Math.max(0, startOffset - pos);
        }

        if (startNode && endOffset <= nextPos) {
          endNode = node;
          endInNode = Math.max(0, endOffset - pos);
          break;
        }

        pos = nextPos;
      }

      if (startNode && !endNode && lastNode) {
        endNode = lastNode;
        endInNode = lastNode.nodeValue.length;
      }
      if (!startNode || !endNode) return null;

      var range = document.createRange();
      range.setStart(startNode, startInNode);
      range.setEnd(endNode, endInNode);
      return range;
    }

    function findQuoteRangeInContainer(container, quote) {
      if (!container || !quote) return null;
      var raw = container.textContent || '';
      if (!raw) return null;

      var idx = raw.indexOf(quote);
      var matchText = quote;

      if (idx === -1) {
        var re = new RegExp(escapeRegExp(quote).replace(/\s+/g, '\\s+'));
        var m = re.exec(raw);
        if (m) {
          idx = m.index;
          matchText = m[0];
        }
      }

      if (idx === -1) {
        var reInsensitive = new RegExp(escapeRegExp(quote).replace(/\s+/g, '\\s+'), 'i');
        var mi = reInsensitive.exec(raw);
        if (mi) {
          idx = mi.index;
          matchText = mi[0];
        }
      }

      if (idx === -1) return null;
      return rangeFromOffsets(container, idx, idx + matchText.length);
    }

    var activeQuoteHighlight = null;

    function clearQuoteHoverHighlight() {
      if (!activeQuoteHighlight || !activeQuoteHighlight.parentNode) {
        activeQuoteHighlight = null;
        return;
      }
      var parent = activeQuoteHighlight.parentNode;
      while (activeQuoteHighlight.firstChild) {
        parent.insertBefore(activeQuoteHighlight.firstChild, activeQuoteHighlight);
      }
      parent.removeChild(activeQuoteHighlight);
      parent.normalize();
      activeQuoteHighlight = null;
    }

    function showQuoteHoverHighlight(contextKey, preferredContainer) {
      var meta = qaState.contextMeta[contextKey];
      if (!meta) return;
      var quote = normalizeText(meta.quoteSnippet || meta.excerpt || '');
      if (!quote) return;

      var container = preferredContainer || findSelectionContainer(meta);
      if (!container) return;
      var range = findQuoteRangeInContainer(container, quote);
      if (!range) return;

      clearQuoteHoverHighlight();

      var wrapper = document.createElement('span');
      wrapper.className = 'ai-hover-quote-highlight';
      try {
        var frag = range.extractContents();
        wrapper.appendChild(frag);
        range.insertNode(wrapper);
        activeQuoteHighlight = wrapper;
      } catch (e) {
        activeQuoteHighlight = null;
      }
    }

    function refreshHeadingBadges() {
      var headings = document.querySelectorAll('[data-ai-anchor]');
      Array.prototype.forEach.call(headings, function(headingEl) {
        var badge = headingEl.querySelector('.ai-inline-count');
        if (!badge) return;
        var anchorId = headingEl.getAttribute('data-ai-anchor');
        var count = contextCountForAnchor(anchorId);
        if (count > 0) {
          badge.textContent = String(count);
          badge.classList.add('show');
        } else {
          badge.textContent = '0';
          badge.classList.remove('show');
        }
      });
    }

    function refreshSentenceIndicators() {
      clearQuoteHoverHighlight();
      var old = document.querySelectorAll('.ai-sentence-indicator');
      Array.prototype.forEach.call(old, function(node) {
        node.remove();
      });

      var placements = [];
      var keys = Object.keys(qaState.contextMeta || {});
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var meta = qaState.contextMeta[key];
        if (!meta || meta.type !== 'selection') continue;
        var count = getContextHistory(key).length;
        if (!count) continue;

        var container = findSelectionContainer(meta);
        if (!container) continue;
        var quote = normalizeText(meta.quoteSnippet || meta.excerpt || '');
        var quoteRange = findQuoteRangeInContainer(container, quote);
        placements.push({
          key: key,
          count: count,
          container: container,
          range: quoteRange
        });
      }

      for (var p = 0; p < placements.length; p++) {
        (function(placeInfo) {
          var marker = document.createElement('button');
          marker.type = 'button';
          marker.className = 'ai-sentence-indicator';
          marker.textContent = placeInfo.count;
          marker.addEventListener('mouseenter', function() {
            showQuoteHoverHighlight(placeInfo.key, placeInfo.container);
          });
          marker.addEventListener('mouseleave', function() {
            clearQuoteHoverHighlight();
          });
          marker.addEventListener('focus', function() {
            showQuoteHoverHighlight(placeInfo.key, placeInfo.container);
          });
          marker.addEventListener('blur', function() {
            clearQuoteHoverHighlight();
          });
          marker.addEventListener('click', function() {
            clearQuoteHoverHighlight();
            var ctx = contextFromKey(placeInfo.key);
            if (ctx) {
              openForContext(ctx);
            }
          });

          if (placeInfo.range) {
            var place = placeInfo.range.cloneRange();
            place.collapse(false);
            place.insertNode(marker);
            marker.classList.add('exact');
          } else {
            marker.classList.add('fallback');
            placeInfo.container.appendChild(document.createTextNode(' '));
            placeInfo.container.appendChild(marker);
          }
        }(placements[p]));
      }
    }

    function refreshIndicators() {
      refreshHeadingBadges();
      refreshSentenceIndicators();
    }

    function addHeadingAskButtons() {
      var headingNodes = document.querySelectorAll('h2, .guide-step-body h3, .visual-title');
      Array.prototype.forEach.call(headingNodes, function(headingEl) {
        if (headingEl.querySelector('.ai-inline-ask')) return;
        var label = normalizeText(headingEl.textContent);
        if (!label) return;
        headingEl.setAttribute('data-ai-label', label);
        var anchorId = ensureElementId(headingEl, 'section');
        headingEl.setAttribute('data-ai-anchor', anchorId);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ai-inline-ask';
        btn.textContent = 'Ask AI';
        btn.addEventListener('click', function() {
          openForContext(contextFromHeading(headingEl));
        });
        var badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'ai-inline-count';
        badge.textContent = '0';
        badge.addEventListener('click', function() {
          var recentKey = latestContextKeyForAnchor(anchorId);
          if (recentKey) {
            var ctx = contextFromKey(recentKey);
            if (ctx) {
              openForContext(ctx);
              return;
            }
          }
          openForContext(contextFromHeading(headingEl));
        });
        headingEl.appendChild(document.createTextNode(' '));
        headingEl.appendChild(btn);
        headingEl.appendChild(document.createTextNode(' '));
        headingEl.appendChild(badge);
      });
    }

    function addRuleCountBadges() {
      var rules = document.querySelectorAll('.rule-name');
      Array.prototype.forEach.call(rules, function(ruleEl) {
        if (ruleEl.querySelector('.ai-inline-count')) return;
        var label = normalizeText(ruleEl.textContent);
        if (!label) return;
        ruleEl.setAttribute('data-ai-label', label);
        var anchorId = ensureElementId(ruleEl, 'rule');
        ruleEl.setAttribute('data-ai-anchor', anchorId);

        var badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'ai-inline-count ai-inline-count-subtle';
        badge.textContent = '0';
        badge.addEventListener('click', function() {
          var recentKey = latestContextKeyForAnchor(anchorId);
          if (recentKey) {
            var ctx = contextFromKey(recentKey);
            if (ctx) {
              openForContext(ctx);
              return;
            }
          }
          openForContext(contextFromHeading(ruleEl));
        });

        ruleEl.appendChild(document.createTextNode(' '));
        ruleEl.appendChild(badge);
      });
    }

    function wireVizLaunchers() {
      var mounts = document.querySelectorAll('.viz-qa[data-viz-id]');
      Array.prototype.forEach.call(mounts, function(root) {
        var card = findParentCard(root);
        var titleEl = card ? card.querySelector('.visual-title') : null;
        var descEl = card ? card.querySelector('.visual-desc') : null;
        var vizId = root.getAttribute('data-viz-id') || hashText(root.textContent);
        var label = normalizeText(root.getAttribute('data-viz-title') || (titleEl ? titleEl.textContent : vizId));
        var excerpt = normalizeText(root.getAttribute('data-viz-desc') || (descEl ? descEl.textContent : ''));
        var anchorSource = titleEl;
        if (!anchorSource) {
          anchorSource = root.previousElementSibling;
          while (anchorSource && anchorSource.tagName !== 'H2') {
            anchorSource = anchorSource.previousElementSibling;
          }
        }
        var anchorId = ensureElementId(anchorSource || root, 'viz');

        root.innerHTML = '';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ai-viz-launch';
        btn.textContent = 'Ask AI about this visualization';
        btn.addEventListener('click', function() {
          openForContext(makeContext('visualization', label, excerpt, anchorId, {
            quoteSnippet: label + ' ' + excerpt
          }));
        });
        root.appendChild(btn);
      });
    }

    var selectionBtn = document.createElement('button');
    selectionBtn.type = 'button';
    selectionBtn.className = 'ai-selection-ask';
    selectionBtn.textContent = 'Ask AI';
    document.body.appendChild(selectionBtn);

    function hideSelectionButton() {
      selectionBtn.classList.remove('show');
      selectionBtn.classList.remove('has-history');
      selectionBtn.textContent = 'Ask AI';
      pendingSelectionContext = null;
    }

    function nearestAnchorElementForNode(node) {
      var el = node && node.nodeType === 1 ? node : (node ? node.parentElement : null);
      if (!el) return document.querySelector('h2');

      var ruleCard = el.closest && el.closest('.rule-card');
      if (ruleCard) {
        var ruleHeading = ruleCard.querySelector('.rule-name');
        if (ruleHeading) return ruleHeading;
      }

      var visualCard = el.closest && el.closest('.visual-card');
      if (visualCard) {
        var visualHeading = visualCard.querySelector('.visual-title');
        if (visualHeading) return visualHeading;
      }

      var guideBody = el.closest && el.closest('.guide-step-body');
      if (guideBody) {
        var guideHeading = guideBody.querySelector('h3');
        if (guideHeading) return guideHeading;
      }

      while (el && el !== document.body) {
        if (
          el.matches &&
          (
            el.matches('h2') ||
            el.matches('.guide-step-body h3') ||
            el.matches('.visual-title') ||
            el.matches('.rule-name')
          )
        ) {
          return el;
        }
        el = el.parentElement;
      }

      var anchors = document.querySelectorAll('h2, .guide-step-body h3, .visual-title, .rule-name');
      var lastBefore = null;
      for (var i = 0; i < anchors.length; i++) {
        var anchor = anchors[i];
        if (anchor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) {
          lastBefore = anchor;
        }
      }
      return lastBefore || document.querySelector('h2');
    }

    function updateSelectionButton() {
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        hideSelectionButton();
        return;
      }
      if (panel.root.contains(sel.anchorNode) || panel.root.contains(sel.focusNode)) {
        hideSelectionButton();
        return;
      }

      var text = normalizeText(sel.toString());
      if (text.length < 8) {
        hideSelectionButton();
        return;
      }
      text = truncateText(text, 450);

      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        hideSelectionButton();
        return;
      }

      pendingSelectionContext = makeContext(
        'selection',
        'Selected sentence',
        text,
        ensureElementId(nearestAnchorElementForNode(range.startContainer), 'section'),
        { quoteSnippet: text, quoteHash: hashText(text) }
      );

      var existingCount = getContextHistory(pendingSelectionContext.key).length;
      if (existingCount > 0) {
        selectionBtn.classList.add('has-history');
        selectionBtn.textContent = 'Ask AI (' + existingCount + ')';
      } else {
        selectionBtn.classList.remove('has-history');
        selectionBtn.textContent = 'Ask AI';
      }

      var x = rect.left + (rect.width / 2);
      var left = Math.max(12, Math.min(window.innerWidth - 84, x - 36));
      var top = window.scrollY + rect.top - 40;

      selectionBtn.style.left = left + 'px';
      selectionBtn.style.top = top + 'px';
      selectionBtn.classList.add('show');
    }

    selectionBtn.addEventListener('click', function() {
      if (pendingSelectionContext) {
        openForContext(pendingSelectionContext);
      }
      hideSelectionButton();
      var sel = window.getSelection();
      if (sel) sel.removeAllRanges();
    });

    document.addEventListener('mouseup', function() {
      setTimeout(updateSelectionButton, 0);
    });
    document.addEventListener('keyup', function() {
      setTimeout(updateSelectionButton, 0);
    });
    document.addEventListener('scroll', hideSelectionButton, true);
    document.addEventListener('mousedown', function(event) {
      if (!selectionBtn.contains(event.target)) {
        hideSelectionButton();
      }
    });

    panel.keyStatus.textContent = keyStatusLabel();
    renderIntentChips();
    renderHistory();
    wireVizLaunchers();
    addHeadingAskButtons();
    addRuleCountBadges();
    refreshIndicators();
  }());

});
