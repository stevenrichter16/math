import { setupCanvas, slopeColor } from '../shared/vizShared.js';

function surface(x, y) {
  return Math.sin(0.95 * x) * Math.cos(0.85 * y) + (0.18 * x) - (0.08 * y);
}

function dzdx(x, y) {
  return (0.95 * Math.cos(0.95 * x) * Math.cos(0.85 * y)) + 0.18;
}

function dzdy(x, y) {
  return (-0.85 * Math.sin(0.95 * x) * Math.sin(0.85 * y)) - 0.08;
}

export function bootPartialFreezeFrameViz() {
  var c = setupCanvas('partialCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W = c.width;
  var H = c.height;

  var xSlider = document.getElementById('partialXSlider');
  var ySlider = document.getElementById('partialYSlider');
  var xVal = document.getElementById('partialXVal');
  var yVal = document.getElementById('partialYVal');
  var dxVal = document.getElementById('partialDxVal');
  var dyVal = document.getElementById('partialDyVal');
  var gradVal = document.getElementById('partialGradVal');
  var dirVal = document.getElementById('partialDirVal');
  var info = document.getElementById('partialInfo');
  var lockYBtn = document.getElementById('partialModeY');
  var lockXBtn = document.getElementById('partialModeX');

  if (!xSlider || !ySlider || !xVal || !yVal || !dxVal || !dyVal || !gradVal || !dirVal || !info || !lockYBtn || !lockXBtn) {
    return;
  }

  var x0 = parseFloat(xSlider.value);
  var y0 = parseFloat(ySlider.value);
  var mode = 'lockY';
  var dMin = -3;
  var dMax = 3;

  function project(x, y, z) {
    var isoX = W * 0.105;
    var isoY = H * 0.052;
    var zScale = H * 0.3;
    var cx = W * 0.5;
    var cy = H * 0.64;
    return [
      cx + (x - y) * isoX,
      cy + (x + y) * isoY - z * zScale
    ];
  }

  function drawPath(stepCount, pointAtIndex, strokeStyle, width) {
    ctx.beginPath();
    var started = false;
    for (var i = 0; i <= stepCount; i++) {
      var pt = pointAtIndex(i);
      if (!pt) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(pt[0], pt[1]);
        started = true;
      } else {
        ctx.lineTo(pt[0], pt[1]);
      }
    }
    ctx.lineWidth = width;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }

  function drawSurfaceWireframe() {
    var majorStep = 0.5;
    var minorStep = 0.14;

    ctx.strokeStyle = 'rgba(156, 163, 175, 0.22)';
    ctx.lineWidth = 1;
    for (var gx = dMin; gx <= dMax + 1e-9; gx += majorStep) {
      drawPath(Math.round((dMax - dMin) / minorStep), function(idx) {
        var y = dMin + (idx * minorStep);
        if (y > dMax + 1e-9) return null;
        return project(gx, y, surface(gx, y));
      }, 'rgba(148, 163, 184, 0.24)', 1);
    }

    for (var gy = dMin; gy <= dMax + 1e-9; gy += majorStep) {
      drawPath(Math.round((dMax - dMin) / minorStep), function(idx) {
        var x = dMin + (idx * minorStep);
        if (x > dMax + 1e-9) return null;
        return project(x, gy, surface(x, gy));
      }, 'rgba(124, 106, 247, 0.24)', 1);
    }
  }

  function drawSlices() {
    var sliceStep = 0.06;
    var steps = Math.round((dMax - dMin) / sliceStep);
    var xColor = '#f97316';
    var yColor = '#60a5fa';

    drawPath(steps, function(idx) {
      var x = dMin + (idx * sliceStep);
      if (x > dMax + 1e-9) return null;
      return project(x, y0, surface(x, y0));
    }, mode === 'lockY' ? xColor : 'rgba(249,115,22,0.65)', mode === 'lockY' ? 3 : 2);

    drawPath(steps, function(idx) {
      var y = dMin + (idx * sliceStep);
      if (y > dMax + 1e-9) return null;
      return project(x0, y, surface(x0, y));
    }, mode === 'lockX' ? yColor : 'rgba(96,165,250,0.65)', mode === 'lockX' ? 3 : 2);
  }

  function drawAxes() {
    var x1 = project(dMin, 0, surface(dMin, 0));
    var x2 = project(dMax, 0, surface(dMax, 0));
    var y1 = project(0, dMin, surface(0, dMin));
    var y2 = project(0, dMax, surface(0, dMax));
    var z1 = project(0, 0, -1.2);
    var z2 = project(0, 0, 1.2);

    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.moveTo(x1[0], x1[1]);
    ctx.lineTo(x2[0], x2[1]);
    ctx.moveTo(y1[0], y1[1]);
    ctx.lineTo(y2[0], y2[1]);
    ctx.moveTo(z1[0], z1[1]);
    ctx.lineTo(z2[0], z2[1]);
    ctx.stroke();
  }

  function drawPoint() {
    var z0 = surface(x0, y0);
    var p = project(x0, y0, z0);
    var activeSlope = mode === 'lockY' ? dzdx(x0, y0) : dzdy(x0, y0);

    ctx.fillStyle = slopeColor(activeSlope);
    ctx.beginPath();
    ctx.arc(p[0], p[1], 5.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 7.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawGradientArrow() {
    var gx = dzdx(x0, y0);
    var gy = dzdy(x0, y0);
    var mag = Math.sqrt((gx * gx) + (gy * gy));
    if (mag < 1e-6) {
      return;
    }

    var step = 0.55;
    var ux = gx / mag;
    var uy = gy / mag;

    var z0 = surface(x0, y0);
    var start = project(x0, y0, z0);
    var end = project(
      x0 + (ux * step),
      y0 + (uy * step),
      surface(x0 + (ux * step), y0 + (uy * step))
    );

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();

    var ang = Math.atan2(end[1] - start[1], end[0] - start[0]);
    var head = 7;

    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.moveTo(end[0], end[1]);
    ctx.lineTo(
      end[0] - Math.cos(ang - 0.45) * head,
      end[1] - Math.sin(ang - 0.45) * head
    );
    ctx.lineTo(
      end[0] - Math.cos(ang + 0.45) * head,
      end[1] - Math.sin(ang + 0.45) * head
    );
    ctx.closePath();
    ctx.fill();
  }

  function steepestHeading(gx, gy) {
    var mag = Math.sqrt((gx * gx) + (gy * gy));
    if (mag < 1e-6) {
      return 'flat';
    }
    var angle = (Math.atan2(gy, gx) * 180 / Math.PI + 360) % 360;
    return 'theta=' + angle.toFixed(0) + ' deg from +x';
  }

  function updateReadout() {
    xVal.textContent = x0.toFixed(1);
    yVal.textContent = y0.toFixed(1);

    var px = dzdx(x0, y0);
    var py = dzdy(x0, y0);
    var grad = Math.sqrt((px * px) + (py * py));
    dxVal.textContent = px.toFixed(3);
    dyVal.textContent = py.toFixed(3);
    gradVal.textContent = grad.toFixed(3);
    dirVal.textContent = steepestHeading(px, py);

    if (mode === 'lockY') {
      info.textContent = 'y is frozen at ' + y0.toFixed(2)
        + '. Moving along x gives local slope (partial f / partial x) = ' + px.toFixed(3) + '.';
    } else {
      info.textContent = 'x is frozen at ' + x0.toFixed(2)
        + '. Moving along y gives local slope (partial f / partial y) = ' + py.toFixed(3) + '.';
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawAxes();
    drawSurfaceWireframe();
    drawSlices();
    drawGradientArrow();
    drawPoint();
    updateReadout();
  }

  function setMode(nextMode) {
    mode = nextMode;
    lockYBtn.classList.toggle('active', mode === 'lockY');
    lockXBtn.classList.toggle('active', mode === 'lockX');
    draw();
  }

  xSlider.addEventListener('input', function() {
    x0 = parseFloat(xSlider.value);
    draw();
  });

  ySlider.addEventListener('input', function() {
    y0 = parseFloat(ySlider.value);
    draw();
  });

  lockYBtn.addEventListener('click', function() {
    setMode('lockY');
  });

  lockXBtn.addEventListener('click', function() {
    setMode('lockX');
  });

  setMode('lockY');
}
