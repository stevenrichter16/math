import { slopeColor } from '../shared/vizShared.js';

export function bootDesmosIntro(options) {
  var opts = options || {};
  var graphState = opts.graphState || { currentFn: 'x^2', currentX: 1.0 };

  var elt = document.getElementById('desmos-container');
  if (!elt || typeof Desmos === 'undefined' || !Desmos.GraphingCalculator) {
    return;
  }

  var calculator = Desmos.GraphingCalculator(elt, {
    expressions: false,
    settingsMenu: false,
    zoomButtons: false,
    border: false,
    backgroundColor: '#12141e'
  });

  function evalFn(fn, x) {
    var expr = fn
      .replace(/\\sin/g, 'Math.sin')
      .replace(/\\ln/g, 'Math.log')
      .replace(/e\^x/g, 'Math.exp(x)')
      .replace(/\^/g, '**');
    try {
      return Function('x', '"use strict"; return ' + expr)(x);
    } catch (e) {
      return NaN;
    }
  }

  function numericalDerivative(fn, x) {
    var h = 1e-7;
    return (evalFn(fn, x + h) - evalFn(fn, x - h)) / (2 * h);
  }

  function updateGraph() {
    var x = graphState.currentX;
    var fn = graphState.currentFn;
    var slope = numericalDerivative(fn, x);
    var fx = evalFn(fn, x);
    var tangentColor = isNaN(slope) ? '#f97316' : slopeColor(slope);
    var b = fx - slope * x;
    var bStr = b >= 0 ? '+ ' + b.toFixed(3) : '- ' + Math.abs(b).toFixed(3);
    var tangentExpr = slope.toFixed(4) + ' * x ' + bStr;

    calculator.setExpressions([
      { id: 'fn', latex: 'f(x) = ' + fn, color: '#7c6af7', lineWidth: 2.5 },
      {
        id: 'tangent',
        latex: 'y = ' + tangentExpr,
        color: tangentColor,
        lineWidth: 2,
        lineStyle: Desmos.Styles.DASHED
      },
      {
        id: 'point',
        latex: '(' + x + ', ' + fx.toFixed(6) + ')',
        color: tangentColor,
        pointSize: 12
      }
    ]);

    var slopeVal = document.getElementById('slopeVal');
    if (slopeVal) {
      slopeVal.textContent = isNaN(slope) ? 'undefined' : slope.toFixed(4);
    }
    var fxVal = document.getElementById('fxVal');
    if (fxVal) {
      fxVal.textContent = isNaN(fx) ? 'undefined' : fx.toFixed(4);
    }
  }

  var slider = document.getElementById('xSlider');
  var xValEl = document.getElementById('xVal');
  if (slider && xValEl) {
    slider.addEventListener('input', function() {
      graphState.currentX = parseFloat(slider.value);
      xValEl.textContent = graphState.currentX.toFixed(1);
      updateGraph();
    });
  }

  document.querySelectorAll('.func-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.func-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      graphState.currentFn = btn.dataset.fn;
      if (graphState.currentFn === '\\ln(x)' && graphState.currentX <= 0 && slider && xValEl) {
        graphState.currentX = 1;
        slider.value = 1;
        xValEl.textContent = '1.0';
      }
      updateGraph();
    });
  });

  updateGraph();
}
