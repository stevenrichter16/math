import { createAppState } from './appState.js';
import { bootDerivativeViz } from '../viz/derivative/derivativeViz.js';
import { bootRulesViz } from '../viz/rules/rulesViz.js';
import { bootAiPanel } from '../ai/panel/panelController.js';

export function bootLegacyApp() {
  var appState = createAppState();
  var graphState = appState.graph;
  var aiState = appState.ai;

  document.querySelectorAll('.math-inline').forEach(function(el) {
    katex.render(el.dataset.tex, el, { throwOnError: false, displayMode: false });
  });
  document.querySelectorAll('.math-display').forEach(function(el) {
    katex.render(el.dataset.tex, el, { throwOnError: false, displayMode: true });
  });

  bootDerivativeViz({ graphState: graphState });
  bootRulesViz();
  bootAiPanel({ aiState: aiState });
}
