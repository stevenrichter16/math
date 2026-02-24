import { setupCanvas, VIZ_FNS, vizDeriv, slopeColor } from '../shared/vizShared.js';

export function bootTwinCurvesViz() {
  var c = setupCanvas('twinCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W = c.width, H = c.height;
  var f = VIZ_FNS.pow2;
  var twinH = 2.0, twinX = 1.0;

  var hSlider = document.getElementById('twinHSlider');
  var xSlider = document.getElementById('twinXSlider');
  var hVal = document.getElementById('twinHVal');
  var xVal = document.getElementById('twinXVal');
  var info = document.getElementById('twinInfo');

  if (!hSlider || !xSlider || !hVal || !xVal || !info) {
    return;
  }

  var xRange = 8;
  var cx = W * 0.5;
  var sx = W / xRange;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    var yVals = [];
    for (var px = 0; px < W; px++) {
      var xv = (px - cx) / sx;
      var yv = f(xv);
      if (isFinite(yv)) yVals.push(yv);
    }
    var yMin = Math.min.apply(null, yVals);
    var yMax = Math.max.apply(null, yVals);
    var yPad = Math.max((yMax - yMin) * 0.25, 1);
    yMin -= yPad;
    yMax += yPad;
    var yRange = yMax - yMin;

    function toC(x, y) { return [cx + x * sx, H - (y - yMin) / yRange * H]; }

    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - (-yMin / yRange) * H);
    ctx.lineTo(W, H - (-yMin / yRange) * H);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();

    ctx.strokeStyle = '#7c6af7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    var started = false;
    for (var px2 = 0; px2 < W; px2++) {
      var xv2 = (px2 - cx) / sx;
      var yv2 = f(xv2);
      if (!isFinite(yv2)) {
        started = false;
        continue;
      }
      var pt = toC(xv2, yv2);
      if (!started) {
        ctx.moveTo(pt[0], pt[1]);
        started = true;
      } else {
        ctx.lineTo(pt[0], pt[1]);
      }
    }
    ctx.stroke();

    var ax = twinX;
    var ay = f(twinX);
    var bx = twinX + twinH;
    var by = f(twinX + twinH);
    var pA = toC(ax, ay);
    var pB = toC(bx, by);

    var secantSlope = Math.abs(twinH) < 0.005
      ? vizDeriv(f, twinX)
      : (by - ay) / (bx - ax);
    var isTangent = Math.abs(twinH) < 0.005;

    var leftX = (0 - cx) / sx;
    var rightX = (W - cx) / sx;
    var sL = toC(leftX, ay + secantSlope * (leftX - ax));
    var sR = toC(rightX, ay + secantSlope * (rightX - ax));

    var secantColor = slopeColor(secantSlope);
    ctx.strokeStyle = isTangent ? '#a78bfa' : secantColor;
    ctx.lineWidth = 2;
    ctx.setLineDash(isTangent ? [] : [7, 5]);
    ctx.beginPath();
    ctx.moveTo(sL[0], sL[1]);
    ctx.lineTo(sR[0], sR[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!isTangent) {
      var riseTop = toC(ax, by);
      var riseBot = toC(ax, ay);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(riseTop[0], riseTop[1]);
      ctx.lineTo(riseBot[0], riseBot[1]);
      ctx.stroke();

      var runLeft = toC(ax, ay);
      var runRight = toC(bx, ay);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(runLeft[0], runLeft[1]);
      ctx.lineTo(runRight[0], runRight[1]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "11px 'Courier New', monospace";
      ctx.fillStyle = '#34d399';
      ctx.fillText('rise', riseTop[0] + 5, (riseTop[1] + riseBot[1]) / 2);
      ctx.fillStyle = '#f97316';
      ctx.fillText('run = h', (runLeft[0] + runRight[0]) / 2 - 20, runLeft[1] + 14);
    }

    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(pA[0], pA[1], 5, 0, Math.PI * 2);
    ctx.fill();

    if (!isTangent) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(pB[0], pB[1], 5, 0, Math.PI * 2);
      ctx.fill();
    }

    var exact = vizDeriv(f, twinX);
    if (isTangent) {
      info.textContent = 'h → 0: tangent slope = ' + exact.toFixed(4) + '  ✓ this IS the derivative';
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
}
