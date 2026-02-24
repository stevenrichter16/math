import { setupCanvas, VIZ_FNS, vizDeriv, slopeColor } from '../shared/vizShared.js';

export function bootTemperatureMapViz() {
  var c = setupCanvas('tempCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W = c.width, H = c.height;
  var f = VIZ_FNS.sin;

  var btnMap = {
    sin: document.getElementById('tempFnSin'),
    pow2: document.getElementById('tempFnPow2'),
    pow3: document.getElementById('tempFnPow3'),
    exp: document.getElementById('tempFnExp')
  };

  if (!btnMap.sin || !btnMap.pow2 || !btnMap.pow3 || !btnMap.exp) {
    return;
  }

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

  var xRange = 8;
  var cx = W * 0.5;
  var sx = W / xRange;

  function xvAt(px) { return (px - cx) / sx; }

  function scanFn(fn) {
    var fVals = [];
    var dVals = [];
    for (var px = 0; px < W; px++) {
      var xv = xvAt(px);
      var fv = fn(xv);
      var dv = vizDeriv(fn, xv);
      if (isFinite(fv)) fVals.push(fv);
      if (isFinite(dv)) dVals.push(dv);
    }
    return { fVals: fVals, dVals: dVals };
  }

  function padRange(arr, pct) {
    var mn = Math.min.apply(null, arr);
    var mx = Math.max.apply(null, arr);
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

    function mapY(v, lo, hi, yTop, yBot) {
      return yTop + (1 - (v - lo) / (hi - lo)) * (yBot - yTop);
    }

    var fLo = fRange[0], fHi = fRange[1];
    var fAxisY = mapY(0, fLo, fHi, 0, topH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, fAxisY);
    ctx.lineTo(W, fAxisY);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, topH);
    ctx.stroke();

    ctx.font = '11px system-ui, sans-serif';
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
      ctx.beginPath();
      ctx.moveTo(px - 1, y0);
      ctx.lineTo(px, y1);
      ctx.stroke();
    }

    var dLo = dRange[0], dHi = dRange[1];
    var dAxisY = topH + mapY(0, dLo, dHi, 0, botH);

    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topH);
    ctx.lineTo(W, topH);
    ctx.moveTo(0, dAxisY);
    ctx.lineTo(W, dAxisY);
    ctx.moveTo(cx, topH);
    ctx.lineTo(cx, H);
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
      ctx.beginPath();
      ctx.moveTo(px2 - 1, dy0);
      ctx.lineTo(px2, dy1);
      ctx.stroke();
    }

    var lgX = W - 130, lgY = 8, lgW = 120, lgH2 = 10;
    var grad = ctx.createLinearGradient(lgX, 0, lgX + lgW, 0);
    grad.addColorStop(0, 'rgb(96,165,250)');
    grad.addColorStop(0.5, 'rgb(148,163,184)');
    grad.addColorStop(1, 'rgb(249,115,22)');
    ctx.fillStyle = grad;
    ctx.fillRect(lgX, lgY, lgW, lgH2);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#8892a4';
    ctx.fillText('falling', lgX, lgY + lgH2 + 11);
    ctx.fillText('rising', lgX + lgW - 32, lgY + lgH2 + 11);
  }

  draw();
}
