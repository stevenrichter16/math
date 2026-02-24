export var VIZ_FNS = {
  pow2: function(x) { return x * x; },
  pow3: function(x) { return x * x * x; },
  sin:  function(x) { return Math.sin(x); },
  exp:  function(x) { return Math.exp(x); }
};

export function vizDeriv(f, x) {
  var h = 1e-7;
  return (f(x + h) - f(x - h)) / (2 * h);
}

// orange (rising) <-> grey (flat) <-> blue (falling)
export function slopeColor(d) {
  var t = Math.max(-1, Math.min(1, d / 4));
  if (t >= 0) {
    var r = Math.round(249 * t + 148 * (1 - t));
    var g = Math.round(115 * t + 163 * (1 - t));
    var b = Math.round(22 * t + 184 * (1 - t));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  t = -t;
  var r2 = Math.round(96 * t + 148 * (1 - t));
  var g2 = Math.round(165 * t + 163 * (1 - t));
  var b2 = Math.round(250 * t + 184 * (1 - t));
  return 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')';
}

export function setupCanvas(id) {
  var c = document.getElementById(id);
  if (!c) {
    return null;
  }
  c.width = c.offsetWidth || 680;
  c.height = c.offsetHeight || 240;
  return c;
}
