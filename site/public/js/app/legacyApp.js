import { createAppState } from './appState.js';
import { bootDerivativeViz } from '../viz/derivative/derivativeViz.js';
import { bootRulesViz } from '../viz/rules/rulesViz.js';
import { bootAdvancedViz } from '../viz/advanced/advancedViz.js';
import { bootAiPanel } from '../ai/panel/panelController.js';

export function bootLegacyApp() {
  var appState = createAppState();
  var graphState = appState.graph;
  var aiState = appState.ai;

  try {
    bootAiPanel({ aiState: aiState });
  } catch (error) {
    console.error('[legacyApp] Failed to boot AI panel', error);
  }

  if (typeof window.katex !== 'undefined' && window.katex && typeof window.katex.render === 'function') {
    document.querySelectorAll('.math-inline').forEach(function(el) {
      window.katex.render(el.dataset.tex, el, { throwOnError: false, displayMode: false });
    });
    document.querySelectorAll('.math-display').forEach(function(el) {
      window.katex.render(el.dataset.tex, el, { throwOnError: false, displayMode: true });
    });
  } else {
    console.warn('[legacyApp] KaTeX not available; continuing without math rendering.');
  }

  try {
    bootDerivativeViz({ graphState: graphState });
  } catch (error) {
    console.error('[legacyApp] Failed to boot derivative visualizations', error);
  }

  try {
    bootRulesViz();
  } catch (error) {
    console.error('[legacyApp] Failed to boot rule visualizations', error);
  }

  try {
    bootAdvancedViz();
  } catch (error) {
    console.error('[legacyApp] Failed to boot advanced visualizations', error);
  }
}
