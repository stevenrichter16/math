import { createQaStore } from '../state/qaStore.js';
import { askByProvider as askProvider } from '../providers/providerRouter.js';
import { buildPrompts, collectRecentContext } from '../prompt/templates.js';
import { extractFollowUpQuestions } from '../prompt/followupSuggestions.js';
import { renderHistoryList } from '../render/historyList.js';
import { createSelectionAnchorTools } from '../context/selectionAnchor.js';
import { createBadgeCounts } from '../indicators/badgeCounts.js';
import { createMarkerLayer } from '../indicators/markerLayer.js';
import { createPanelView, renderIntentChips } from './panelView.js';
import { createContextResolver } from './contextResolver.js';
import { attachAskFlow } from './askFlow.js';
import { initSelectionButton } from './selectionButton.js';
import { ensureElementId } from '../../core/domIds.js';
import {
  normalizeText,
  truncateText,
  hashText,
  slugify,
  formatTimestamp,
  makeId
} from '../../core/text.js';

export function bootAiPanel(options) {
  var opts = options || {};
  var aiState = opts.aiState || {};
  if (!aiState.qaState || typeof aiState.qaState !== 'object') {
    aiState.qaState = { contexts: {}, contextMeta: {} };
  }

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

  var qaStore = createQaStore({
    storageKey: QA_STORAGE_KEY,
    providers: PROVIDERS,
    initialState: aiState.qaState
  });
  aiState.qaState = qaStore.load();
  aiState.activeContext = null;
  aiState.activeIntentId = '';
  aiState.pendingSelectionContext = null;

  function ensureId(el, prefix) {
    return ensureElementId(el, prefix, slugify);
  }

  function providerConfig(provider) {
    return PROVIDERS[provider] || PROVIDERS.chatgpt;
  }

  function providerLabel(provider) {
    return providerConfig(provider).label;
  }

  function saveState() {
    qaStore.save();
  }

  function getContextHistory(contextKey) {
    return qaStore.getContextHistory(contextKey);
  }

  function getContextMeta(contextKey) {
    return qaStore.getContextMeta(contextKey);
  }

  function upsertContextMeta(context) {
    qaStore.upsertContextMeta(context);
  }

  function removeContextIfEmpty(contextKey) {
    qaStore.removeContextIfEmpty(contextKey);
  }

  function getApiKey(provider) {
    return qaStore.getApiKey(provider);
  }

  function setApiKey(provider, key) {
    return qaStore.setApiKey(provider, key);
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

  function findIntentConfig(id) {
    for (var i = 0; i < QUICK_INTENTS.length; i++) {
      if (QUICK_INTENTS[i].id === id) {
        return QUICK_INTENTS[i];
      }
    }
    return null;
  }

  var panelView = createPanelView({ documentRef: document });
  var panel = panelView.panel;

  function renderHistory() {
    renderHistoryList({
      historyEl: panel.history,
      activeContext: aiState.activeContext,
      getContextHistory: getContextHistory,
      providerLabel: providerLabel,
      findIntentConfig: findIntentConfig,
      formatTimestamp: formatTimestamp,
      onDelete: function(entry) {
        if (!aiState.activeContext) {
          return;
        }
        aiState.qaState.contexts[aiState.activeContext.key] = getContextHistory(aiState.activeContext.key).filter(function(x) {
          return x.id !== entry.id;
        });
        removeContextIfEmpty(aiState.activeContext.key);
        saveState();
        refreshIndicators();
        renderHistory();
        panel.status.textContent = 'Deleted one saved Q&A.';
      },
      onUseFollowUp: function(followUp) {
        panel.input.value = followUp;
        panel.input.dispatchEvent(new Event('input', { bubbles: true }));
        panel.input.focus();
        panel.input.setSelectionRange(panel.input.value.length, panel.input.value.length);
        panel.status.textContent = 'Follow-up added. Edit it or press Ask.';
      },
      extractFollowUpQuestions: extractFollowUpQuestions,
      emptyDefaultText: 'Choose a section or highlight text to start.',
      emptyContextText: 'No saved Q&A for this context yet.'
    });
  }

  function openForContext(context) {
    aiState.activeContext = context;
    panel.contextType.textContent = context.type.charAt(0).toUpperCase() + context.type.slice(1);
    panel.contextLabel.textContent = context.label;
    panel.contextExcerpt.textContent = context.excerpt || 'No extra excerpt available.';
    panel.status.textContent = '';
    renderHistory();
    panelView.setPanelOpen(true);
    panel.input.focus();
  }

  function closePanel() {
    panelView.setPanelOpen(false);
  }

  function rerenderIntentChips() {
    renderIntentChips({
      intentsEl: panel.intents,
      intents: QUICK_INTENTS,
      activeIntentId: aiState.activeIntentId,
      onToggle: function(intentId) {
        aiState.activeIntentId = aiState.activeIntentId === intentId ? '' : intentId;
        rerenderIntentChips();
      }
    });
  }

  var contextResolver = createContextResolver({
    documentRef: document,
    aiState: aiState,
    normalizeText: normalizeText,
    truncateText: truncateText,
    hashText: hashText,
    ensureElementId: ensureId,
    getContextHistory: getContextHistory
  });

  var selectionAnchor = createSelectionAnchorTools({
    documentRef: document,
    normalizeText: normalizeText,
    getContextMeta: function(contextKey) {
      return aiState.qaState.contextMeta[contextKey] || null;
    }
  });

  var markerLayer = createMarkerLayer({
    documentRef: document,
    getAllContextKeys: function() {
      return Object.keys(aiState.qaState.contextMeta || {});
    },
    getContextMeta: function(contextKey) {
      return aiState.qaState.contextMeta[contextKey] || null;
    },
    getContextHistory: getContextHistory,
    findSelectionContainer: selectionAnchor.findSelectionContainer,
    findQuoteRangeInContainer: selectionAnchor.findQuoteRangeInContainer,
    normalizeText: normalizeText,
    showQuoteHoverHighlight: selectionAnchor.showQuoteHoverHighlight,
    clearQuoteHoverHighlight: selectionAnchor.clearQuoteHoverHighlight,
    contextFromKey: contextResolver.contextFromKey,
    openForContext: openForContext
  });

  var badgeCounts = createBadgeCounts({
    documentRef: document,
    normalizeText: normalizeText,
    ensureElementId: ensureId,
    contextCountForAnchor: contextResolver.contextCountForAnchor,
    latestContextKeyForAnchor: contextResolver.latestContextKeyForAnchor,
    contextFromKey: contextResolver.contextFromKey,
    contextFromHeading: contextResolver.contextFromHeading,
    openForContext: openForContext
  });

  function refreshIndicators() {
    badgeCounts.refreshHeadingBadges();
    markerLayer.refreshSentenceIndicators();
  }

  attachAskFlow({
    panel: panel,
    aiState: aiState,
    providers: PROVIDERS,
    providerLabel: providerLabel,
    getApiKey: getApiKey,
    promptForApiKey: promptForApiKey,
    keyStatusLabel: keyStatusLabel,
    findIntentConfig: findIntentConfig,
    getContextHistory: getContextHistory,
    collectRecentContext: collectRecentContext,
    truncateText: truncateText,
    normalizeText: normalizeText,
    buildPrompts: buildPrompts,
    askProvider: askProvider,
    extractFollowUpQuestions: extractFollowUpQuestions,
    makeId: makeId,
    upsertContextMeta: upsertContextMeta,
    getContextMeta: getContextMeta,
    saveState: saveState,
    refreshIndicators: refreshIndicators,
    renderHistory: renderHistory
  });

  panel.closeBtn.addEventListener('click', function() {
    closePanel();
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && panel.root.classList.contains('open')) {
      closePanel();
    }
  });

  initSelectionButton({
    documentRef: document,
    panelRoot: panel.root,
    aiState: aiState,
    makeContext: contextResolver.makeContext,
    ensureElementId: ensureId,
    nearestAnchorElementForNode: selectionAnchor.nearestAnchorElementForNode,
    hashText: hashText,
    normalizeText: normalizeText,
    truncateText: truncateText,
    getContextHistory: getContextHistory,
    openForContext: openForContext
  });

  panel.keyStatus.textContent = keyStatusLabel();
  rerenderIntentChips();
  renderHistory();
  contextResolver.wireVizLaunchers(openForContext);
  badgeCounts.addHeadingAskButtons();
  badgeCounts.addRuleCountBadges();
  refreshIndicators();
}
