import { setupCanvas, slopeColor } from '../shared/vizShared.js';

var ODE_EQS = {
  growth: {
    buttonLabel: "y' = y",
    paramA: { key: 'r', label: 'growth rate r', min: -2.0, max: 2.0, step: 0.05, initial: 1.0 },
    paramB: null,
    equationLabel: function(p) {
      return "y' = " + p.r.toFixed(2) + 'y';
    },
    slope: function(_x, y, p) {
      return p.r * y;
    },
    nullclines: function(p) {
      var stability = 'neutral';
      if (p.r > 0.001) stability = 'unstable';
      if (p.r < -0.001) stability = 'stable';
      return [{
        type: 'hline',
        y: 0,
        label: 'y = 0 (' + stability + ')'
      }];
    }
  },
  logistic: {
    buttonLabel: "y' = 1.2y(1 - y/2)",
    paramA: { key: 'r', label: 'growth rate r', min: -2.0, max: 2.0, step: 0.05, initial: 1.2 },
    paramB: { key: 'K', label: 'carrying capacity K', min: 0.4, max: 3.8, step: 0.05, initial: 2.0 },
    equationLabel: function(p) {
      return "y' = " + p.r.toFixed(2) + "y(1 - y/" + p.K.toFixed(2) + ')';
    },
    slope: function(_x, y, p) {
      return p.r * y * (1 - y / p.K);
    },
    nullclines: function(p) {
      var stableAtZero = p.r < -0.001;
      var stableAtK = p.r > 0.001;
      var neutral = Math.abs(p.r) <= 0.001;
      return [
        {
          type: 'hline',
          y: 0,
          label: 'y = 0 (' + (neutral ? 'neutral' : (stableAtZero ? 'stable' : 'unstable')) + ')'
        },
        {
          type: 'hline',
          y: p.K,
          label: 'y = K (' + (neutral ? 'neutral' : (stableAtK ? 'stable' : 'unstable')) + ')'
        }
      ];
    }
  },
  driven: {
    buttonLabel: "y' = sin(x) - 0.6y",
    paramA: { key: 'A', label: 'forcing amplitude A', min: 0.0, max: 2.5, step: 0.05, initial: 1.0 },
    paramB: { key: 'd', label: 'damping d', min: 0.05, max: 2.0, step: 0.05, initial: 0.6 },
    equationLabel: function(p) {
      return "y' = " + p.A.toFixed(2) + 'sin(x) - ' + p.d.toFixed(2) + 'y';
    },
    slope: function(x, y, p) {
      return (p.A * Math.sin(x)) - (p.d * y);
    },
    nullclines: function(p) {
      if (Math.abs(p.d) < 1e-4) {
        return [];
      }
      return [{
        type: 'curve',
        label: 'nullcline y = (A/d) sin(x)',
        fn: function(x) { return (p.A / p.d) * Math.sin(x); }
      }];
    }
  }
};

var SEED_COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa', '#22d3ee', '#fb7185', '#84cc16'];

export function bootDifferentialFlowViz() {
  var c = setupCanvas('odeCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W = c.width;
  var H = c.height;

  var eqButtons = {
    growth: document.getElementById('odeEqGrowth'),
    logistic: document.getElementById('odeEqLogistic'),
    driven: document.getElementById('odeEqDriven')
  };
  var seedCountEl = document.getElementById('odeSeedCount');
  var x0Val = document.getElementById('odeX0Val');
  var y0Val = document.getElementById('odeY0Val');
  var slopeVal = document.getElementById('odeSlopeVal');
  var trendVal = document.getElementById('odeTrendVal');
  var info = document.getElementById('odeInfo');
  var resetBtn = document.getElementById('odeResetBtn');
  var clearBtn = document.getElementById('odeClearBtn');

  var paramALabel = document.getElementById('odeParamALabel');
  var paramAVal = document.getElementById('odeParamAVal');
  var paramASlider = document.getElementById('odeParamASlider');
  var paramBRow = document.getElementById('odeParamBRow');
  var paramBLabel = document.getElementById('odeParamBLabel');
  var paramBVal = document.getElementById('odeParamBVal');
  var paramBSlider = document.getElementById('odeParamBSlider');

  if (!eqButtons.growth || !eqButtons.logistic || !eqButtons.driven || !seedCountEl || !x0Val || !y0Val
      || !slopeVal || !trendVal || !info || !resetBtn || !clearBtn
      || !paramALabel || !paramAVal || !paramASlider || !paramBRow || !paramBLabel || !paramBVal || !paramBSlider) {
    return;
  }

  var xMin = -4;
  var xMax = 4;
  var yMin = -3;
  var yMax = 3;
  var eqName = 'growth';
  var params = { r: 1.0, K: 2.0, A: 1.0, d: 0.6 };
  var seeds = [{ x: -2, y: 0.8, color: SEED_COLORS[0] }];
  var activeSeedIdx = 0;
  var nextSeedColor = 1;
  var MAX_SEEDS = 12;

  function mapX(x) {
    return ((x - xMin) / (xMax - xMin)) * W;
  }

  function mapY(y) {
    return H - ((y - yMin) / (yMax - yMin)) * H;
  }

  function invX(px) {
    return xMin + (px / W) * (xMax - xMin);
  }

  function invY(py) {
    return yMin + ((H - py) / H) * (yMax - yMin);
  }

  function currentEq() {
    return ODE_EQS[eqName];
  }

  function slopeFn(x, y) {
    return currentEq().slope(x, y, params);
  }

  function eqLabel() {
    return currentEq().equationLabel(params);
  }

  function clampToView(seed) {
    return {
      x: Math.max(xMin, Math.min(xMax, seed.x)),
      y: Math.max(yMin, Math.min(yMax, seed.y)),
      color: seed.color
    };
  }

  function activeSeed() {
    if (!seeds.length) {
      return null;
    }
    if (activeSeedIdx < 0 || activeSeedIdx >= seeds.length) {
      activeSeedIdx = seeds.length - 1;
    }
    return seeds[activeSeedIdx];
  }

  function rk4Step(fn, x, y, h) {
    var k1 = fn(x, y);
    var k2 = fn(x + h * 0.5, y + h * 0.5 * k1);
    var k3 = fn(x + h * 0.5, y + h * 0.5 * k2);
    var k4 = fn(x + h, y + h * k3);
    return y + (h / 6) * (k1 + (2 * k2) + (2 * k3) + k4);
  }

  function traceSolution(seed, direction) {
    var h = 0.035 * direction;
    var x = seed.x;
    var y = seed.y;
    var pts = [];

    for (var i = 0; i < 2000; i++) {
      var nextX = x + h;
      if (nextX < xMin || nextX > xMax) break;
      var nextY = rk4Step(slopeFn, x, y, h);
      if (!isFinite(nextY) || nextY < yMin - 2 || nextY > yMax + 2) break;
      pts.push([nextX, nextY]);
      x = nextX;
      y = nextY;
    }

    return pts;
  }

  function drawAxesAndGrid() {
    var gridColor = 'rgba(148,163,184,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeStyle = gridColor;
    for (var gx = Math.ceil(xMin); gx <= Math.floor(xMax); gx++) {
      var px = mapX(gx);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
    }
    for (var gy = Math.ceil(yMin); gy <= Math.floor(yMax); gy++) {
      var py = mapY(gy);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, mapY(0));
    ctx.lineTo(W, mapY(0));
    ctx.moveTo(mapX(0), 0);
    ctx.lineTo(mapX(0), H);
    ctx.stroke();
  }

  function drawField() {
    var xStep = 0.5;
    var yStep = 0.45;

    for (var gx = xMin; gx <= xMax + 1e-9; gx += xStep) {
      for (var gy = yMin; gy <= yMax + 1e-9; gy += yStep) {
        var m = slopeFn(gx, gy);
        if (!isFinite(m)) continue;

        var segmentHalf = 0.17;
        var xL = gx - segmentHalf;
        var yL = gy - (m * segmentHalf);
        var xR = gx + segmentHalf;
        var yR = gy + (m * segmentHalf);

        ctx.strokeStyle = slopeColor(m);
        ctx.globalAlpha = 0.67;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(mapX(xL), mapY(yL));
        ctx.lineTo(mapX(xR), mapY(yR));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawNullclines() {
    var lines = currentEq().nullclines(params);
    if (!lines || !lines.length) {
      return 'nullcline: none in this window';
    }

    var summary = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(251,191,36,0.9)';

      if (line.type === 'hline') {
        if (line.y < yMin || line.y > yMax) {
          continue;
        }
        var py = mapY(line.y);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(W, py);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = '#fcd34d';
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(line.label, 8, py - 6);
      }

      if (line.type === 'curve' && typeof line.fn === 'function') {
        var started = false;
        ctx.beginPath();
        for (var s = 0; s <= W; s++) {
          var x = invX(s);
          var y = line.fn(x);
          if (!isFinite(y)) {
            started = false;
            continue;
          }
          var pyCurve = mapY(y);
          if (!started) {
            ctx.moveTo(s, pyCurve);
            started = true;
          } else {
            ctx.lineTo(s, pyCurve);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fcd34d';
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(line.label, 8, H - 12);
      }

      summary.push(line.label);
    }
    ctx.setLineDash([]);
    return summary.length ? 'nullcline: ' + summary.join(' | ') : 'nullcline: none in this window';
  }

  function drawTrajectoryForSeed(seed, isActive) {
    var left = traceSolution(seed, -1).reverse();
    var right = traceSolution(seed, 1);
    var all = left.concat([[seed.x, seed.y]], right);
    if (!all.length) return;

    ctx.strokeStyle = isActive ? '#f8fafc' : seed.color;
    ctx.globalAlpha = isActive ? 1 : 0.72;
    ctx.lineWidth = isActive ? 2.6 : 2.1;
    ctx.beginPath();
    for (var i = 0; i < all.length; i++) {
      var px = mapX(all[i][0]);
      var py = mapY(all[i][1]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    var pX = mapX(seed.x);
    var pY = mapY(seed.y);
    ctx.fillStyle = seed.color;
    ctx.beginPath();
    ctx.arc(pX, pY, 4.8, 0, Math.PI * 2);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(pX, pY, 7.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawTrajectories() {
    for (var i = 0; i < seeds.length; i++) {
      drawTrajectoryForSeed(seeds[i], i === activeSeedIdx);
    }
  }

  function drawSeedDirection(seed) {
    if (!seed) {
      return;
    }
    var slope = slopeFn(seed.x, seed.y);
    if (!isFinite(slope)) {
      return;
    }

    var span = 0.5;
    var x1 = seed.x;
    var y1 = seed.y;
    var x2 = seed.x + span;
    var y2 = seed.y + (slope * span);
    var p1 = [mapX(x1), mapY(y1)];
    var p2 = [mapX(x2), mapY(y2)];

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();

    var ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    var head = 7;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(p2[0], p2[1]);
    ctx.lineTo(p2[0] - Math.cos(ang - 0.5) * head, p2[1] - Math.sin(ang - 0.5) * head);
    ctx.lineTo(p2[0] - Math.cos(ang + 0.5) * head, p2[1] - Math.sin(ang + 0.5) * head);
    ctx.closePath();
    ctx.fill();
  }

  function behaviorLabel(slope) {
    if (slope > 0.03) return 'rising as x increases';
    if (slope < -0.03) return 'falling as x increases';
    return 'nearly flat (local equilibrium)';
  }

  function syncParamControls() {
    var eq = currentEq();

    paramALabel.textContent = eq.paramA.label;
    paramASlider.min = String(eq.paramA.min);
    paramASlider.max = String(eq.paramA.max);
    paramASlider.step = String(eq.paramA.step);
    paramASlider.value = String(params[eq.paramA.key]);
    paramAVal.textContent = Number(params[eq.paramA.key]).toFixed(2);

    if (eq.paramB) {
      paramBRow.classList.remove('is-hidden');
      paramBLabel.textContent = eq.paramB.label;
      paramBSlider.min = String(eq.paramB.min);
      paramBSlider.max = String(eq.paramB.max);
      paramBSlider.step = String(eq.paramB.step);
      paramBSlider.value = String(params[eq.paramB.key]);
      paramBVal.textContent = Number(params[eq.paramB.key]).toFixed(2);
    } else {
      paramBRow.classList.add('is-hidden');
    }
  }

  function updateReadout(nullclineSummary) {
    var seed = activeSeed();
    seedCountEl.textContent = String(seeds.length);

    if (!seed) {
      x0Val.textContent = '—';
      y0Val.textContent = '—';
      slopeVal.textContent = '—';
      trendVal.textContent = 'add a seed';
      info.textContent = eqLabel() + ' | Tap the field to add an initial condition. ' + nullclineSummary + '.';
      return;
    }

    var slopeAtSeed = slopeFn(seed.x, seed.y);
    var yAhead = rk4Step(slopeFn, seed.x, seed.y, 0.3);
    var trend = behaviorLabel(slopeAtSeed);

    x0Val.textContent = seed.x.toFixed(2);
    y0Val.textContent = seed.y.toFixed(2);
    slopeVal.textContent = slopeAtSeed.toFixed(3);
    trendVal.textContent = trend;
    info.textContent = eqLabel() + ' | active slope = ' + slopeAtSeed.toFixed(3)
      + ' | projected y(' + (seed.x + 0.3).toFixed(2) + ') ~ ' + yAhead.toFixed(3)
      + ' | ' + nullclineSummary + '.';
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawAxesAndGrid();
    drawField();
    var nullclineSummary = drawNullclines();
    drawTrajectories();
    drawSeedDirection(activeSeed());
    updateReadout(nullclineSummary);
  }

  function setEq(nextEq) {
    eqName = nextEq;
    Object.keys(eqButtons).forEach(function(key) {
      eqButtons[key].classList.toggle('active', key === eqName);
    });
    syncParamControls();
    draw();
  }

  function addSeed(x, y) {
    seeds.push({
      x: x,
      y: y,
      color: SEED_COLORS[nextSeedColor % SEED_COLORS.length]
    });
    nextSeedColor += 1;
    if (seeds.length > MAX_SEEDS) {
      seeds.shift();
    }
    activeSeedIdx = seeds.length - 1;
  }

  function setSeedFromEvent(event) {
    var rect = c.getBoundingClientRect();
    var px = event.clientX - rect.left;
    var py = event.clientY - rect.top;
    if (px < 0 || py < 0 || px > rect.width || py > rect.height) return;
    addSeed(
      invX((px / rect.width) * W),
      invY((py / rect.height) * H)
    );
    draw();
  }

  Object.keys(eqButtons).forEach(function(key) {
    eqButtons[key].addEventListener('click', function() {
      setEq(key);
    });
  });

  paramASlider.addEventListener('input', function() {
    var eq = currentEq();
    params[eq.paramA.key] = parseFloat(paramASlider.value);
    paramAVal.textContent = Number(params[eq.paramA.key]).toFixed(2);
    draw();
  });

  paramBSlider.addEventListener('input', function() {
    var eq = currentEq();
    if (!eq.paramB) return;
    params[eq.paramB.key] = parseFloat(paramBSlider.value);
    paramBVal.textContent = Number(params[eq.paramB.key]).toFixed(2);
    draw();
  });

  var usePointer = typeof window.PointerEvent !== 'undefined';
  if (usePointer) {
    c.addEventListener('pointerdown', function(event) {
      setSeedFromEvent(event);
    });
  } else {
    c.addEventListener('click', function(event) {
      setSeedFromEvent(event);
    });
  }

  resetBtn.addEventListener('click', function() {
    seeds = [{ x: -2, y: 0.8, color: SEED_COLORS[0] }];
    activeSeedIdx = 0;
    nextSeedColor = 1;
    draw();
  });

  clearBtn.addEventListener('click', function() {
    seeds = [];
    activeSeedIdx = -1;
    draw();
  });

  // Seed parameters from equation defaults.
  Object.keys(ODE_EQS).forEach(function(name) {
    var cfg = ODE_EQS[name];
    params[cfg.paramA.key] = cfg.paramA.initial;
    if (cfg.paramB) {
      params[cfg.paramB.key] = cfg.paramB.initial;
    }
  });

  setEq('growth');
}
