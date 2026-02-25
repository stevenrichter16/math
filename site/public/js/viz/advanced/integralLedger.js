import { setupCanvas } from '../shared/vizShared.js';

var LEDGER_FNS = {
  wave: function(x) { return Math.sin(x) + (0.25 * x); },
  cubic: function(x) { return (0.2 * x * x * x) - x; },
  bump: function(x) { return Math.exp(-x * x) - 0.35; }
};

var METHOD_LABELS = {
  left: 'Left',
  mid: 'Midpoint',
  right: 'Right'
};

export function bootIntegralLedgerViz() {
  var c = setupCanvas('ledgerCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W = c.width;
  var H = c.height;

  var aSlider = document.getElementById('ledgerASlider');
  var bSlider = document.getElementById('ledgerBSlider');
  var nSlider = document.getElementById('ledgerNSlider');
  var aVal = document.getElementById('ledgerAVal');
  var bVal = document.getElementById('ledgerBVal');
  var nVal = document.getElementById('ledgerNVal');
  var posVal = document.getElementById('ledgerPosVal');
  var negVal = document.getElementById('ledgerNegVal');
  var netVal = document.getElementById('ledgerNetVal');
  var exactVal = document.getElementById('ledgerExactVal');
  var errVal = document.getElementById('ledgerErrVal');
  var info = document.getElementById('ledgerInfo');

  var fnButtons = {
    wave: document.getElementById('ledgerFnWave'),
    cubic: document.getElementById('ledgerFnCubic'),
    bump: document.getElementById('ledgerFnBump')
  };

  var methodButtons = {
    left: document.getElementById('ledgerMethodLeft'),
    mid: document.getElementById('ledgerMethodMid'),
    right: document.getElementById('ledgerMethodRight')
  };

  if (!aSlider || !bSlider || !nSlider || !aVal || !bVal || !nVal || !posVal || !negVal || !netVal || !exactVal || !errVal || !info
      || !fnButtons.wave || !fnButtons.cubic || !fnButtons.bump
      || !methodButtons.left || !methodButtons.mid || !methodButtons.right) {
    return;
  }

  var fnName = 'wave';
  var method = 'mid';
  var a = parseFloat(aSlider.value);
  var b = parseFloat(bSlider.value);
  var n = parseInt(nSlider.value, 10);

  var xMin = -4;
  var xMax = 4;

  function activeFn() {
    return LEDGER_FNS[fnName];
  }

  function mapX(x) {
    return ((x - xMin) / (xMax - xMin)) * W;
  }

  function mapYBuilder(yLo, yHi) {
    return function(y) {
      return H - ((y - yLo) / (yHi - yLo)) * H;
    };
  }

  function sampleRange(fn) {
    var lo = Infinity;
    var hi = -Infinity;
    for (var i = 0; i <= 720; i++) {
      var x = xMin + (i / 720) * (xMax - xMin);
      var y = fn(x);
      if (!isFinite(y)) continue;
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
    if (!isFinite(lo) || !isFinite(hi)) {
      lo = -1;
      hi = 1;
    }
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
    var pad = Math.max((hi - lo) * 0.22, 0.6);
    return [lo - pad, hi + pad];
  }

  function syncRange(changed) {
    var minGap = 0.25;
    if (b - a >= minGap) return;

    if (changed === 'a') {
      b = Math.min(3.5, a + minGap);
      if (b - a < minGap) {
        a = b - minGap;
      }
    } else {
      a = Math.max(-3.5, b - minGap);
      if (b - a < minGap) {
        b = a + minGap;
      }
    }

    aSlider.value = a.toFixed(2);
    bSlider.value = b.toFixed(2);
  }

  function drawAxes(mapY) {
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    var axisY = mapY(0);
    ctx.moveTo(0, axisY);
    ctx.lineTo(W, axisY);
    var axisX = mapX(0);
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, H);
    ctx.stroke();
  }

  function sampleAt(xLeft, dx) {
    if (method === 'left') return xLeft;
    if (method === 'right') return xLeft + dx;
    return xLeft + (0.5 * dx);
  }

  function drawCurve(fn, mapY) {
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    var started = false;
    for (var i = 0; i <= W; i++) {
      var x = xMin + (i / W) * (xMax - xMin);
      var y = fn(x);
      if (!isFinite(y)) {
        started = false;
        continue;
      }
      var px = mapX(x);
      var py = mapY(y);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  function integrateSimpson(fn, lo, hi, steps) {
    if (hi === lo) {
      return 0;
    }
    var nSteps = Math.max(10, steps || 1200);
    if (nSteps % 2 !== 0) {
      nSteps += 1;
    }
    var h = (hi - lo) / nSteps;
    var sum = fn(lo) + fn(hi);
    for (var i = 1; i < nSteps; i++) {
      var x = lo + (i * h);
      var fx = fn(x);
      if (!isFinite(fx)) {
        continue;
      }
      sum += (i % 2 === 0 ? 2 : 4) * fx;
    }
    return (h / 3) * sum;
  }

  function drawBars(fn, mapY) {
    var dx = (b - a) / n;
    var axisY = mapY(0);
    var pos = 0;
    var neg = 0;

    for (var i = 0; i < n; i++) {
      var xL = a + (i * dx);
      var xR = xL + dx;
      var xS = sampleAt(xL, dx);
      var yS = fn(xS);
      if (!isFinite(yS)) continue;

      var px = mapX(xL);
      var pw = Math.max(1, mapX(xR) - px);
      var py = mapY(yS);
      var h = axisY - py;
      var contrib = yS * dx;

      if (contrib >= 0) {
        pos += contrib;
        ctx.fillStyle = 'rgba(249, 115, 22, 0.34)';
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.75)';
      } else {
        neg += contrib;
        ctx.fillStyle = 'rgba(96, 165, 250, 0.32)';
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.75)';
      }

      ctx.beginPath();
      if (h >= 0) {
        ctx.rect(px, py, pw, h);
      } else {
        ctx.rect(px, axisY, pw, -h);
      }
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    var net = pos + neg;
    return {
      pos: pos,
      neg: neg,
      net: net,
      dx: dx
    };
  }

  function drawRangeMarkers(mapY) {
    var top = 8;
    var bottom = H - 8;
    var axisY = mapY(0);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mapX(a), top);
    ctx.lineTo(mapX(a), bottom);
    ctx.moveTo(mapX(b), top);
    ctx.lineTo(mapX(b), bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#b8c4dc';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('a', mapX(a) + 4, axisY - 6);
    ctx.fillText('b', mapX(b) + 4, axisY - 6);
  }

  function updateLabels() {
    aVal.textContent = a.toFixed(1);
    bVal.textContent = b.toFixed(1);
    nVal.textContent = String(n);
  }

  function draw() {
    var fn = activeFn();
    var range = sampleRange(fn);
    var mapY = mapYBuilder(range[0], range[1]);

    ctx.clearRect(0, 0, W, H);
    drawAxes(mapY);
    var approx = drawBars(fn, mapY);
    drawRangeMarkers(mapY);
    drawCurve(fn, mapY);
    updateLabels();

    var exact = integrateSimpson(fn, a, b, 1800);
    var error = approx.net - exact;
    var signedVolume = Math.abs(approx.pos) + Math.abs(approx.neg);
    var cancellation = signedVolume > 1e-8
      ? Math.abs(approx.net) / signedVolume
      : 1;

    posVal.textContent = approx.pos.toFixed(3);
    negVal.textContent = approx.neg.toFixed(3);
    netVal.textContent = approx.net.toFixed(3);
    exactVal.textContent = exact.toFixed(3);
    errVal.textContent = error.toFixed(3);

    info.textContent = METHOD_LABELS[method] + ' rule with n = ' + n
      + ' gives ' + approx.net.toFixed(4)
      + ' vs reference ' + exact.toFixed(4)
      + '. cancellation ratio = ' + cancellation.toFixed(3) + '.';
  }

  function setFn(name) {
    fnName = name;
    Object.keys(fnButtons).forEach(function(key) {
      fnButtons[key].classList.toggle('active', key === fnName);
    });
    draw();
  }

  function setMethod(name) {
    method = name;
    Object.keys(methodButtons).forEach(function(key) {
      methodButtons[key].classList.toggle('active', key === method);
    });
    draw();
  }

  Object.keys(fnButtons).forEach(function(key) {
    fnButtons[key].addEventListener('click', function() {
      setFn(key);
    });
  });

  Object.keys(methodButtons).forEach(function(key) {
    methodButtons[key].addEventListener('click', function() {
      setMethod(key);
    });
  });

  aSlider.addEventListener('input', function() {
    a = parseFloat(aSlider.value);
    syncRange('a');
    draw();
  });

  bSlider.addEventListener('input', function() {
    b = parseFloat(bSlider.value);
    syncRange('b');
    draw();
  });

  nSlider.addEventListener('input', function() {
    n = Math.max(4, parseInt(nSlider.value, 10) || 4);
    draw();
  });

  setFn('wave');
  setMethod('mid');
}
