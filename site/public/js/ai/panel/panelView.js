export function createPanelView(options) {
  var opts = options || {};
  var documentRef = opts.documentRef || document;

  var panelRoot = documentRef.createElement('aside');
  panelRoot.className = 'ai-assist-panel';
  panelRoot.setAttribute('aria-hidden', 'true');
  panelRoot.innerHTML =
    '<div class="ai-assist-header">' +
      '<div class="ai-assist-title">Ask AI</div>' +
      '<button type="button" class="ai-assist-close" aria-label="Close panel">Close</button>' +
    '</div>' +
    '<div class="ai-context-box">' +
      '<div class="ai-context-type">Context</div>' +
      '<div class="ai-context-label">Pick a section or highlight a sentence.</div>' +
      '<p class="ai-context-excerpt"></p>' +
    '</div>' +
    '<div class="ai-assist-row">' +
      '<label class="ai-field-label" for="aiProvider">Assistant</label>' +
      '<select id="aiProvider" class="ai-provider-select">' +
        '<option value="chatgpt">ChatGPT</option>' +
        '<option value="claude">Claude</option>' +
      '</select>' +
    '</div>' +
    '<div class="ai-assist-row ai-key-row">' +
      '<button type="button" class="func-btn ai-key-btn ai-key-openai">Set ChatGPT key</button>' +
      '<button type="button" class="func-btn ai-key-btn ai-key-claude">Set Claude key</button>' +
    '</div>' +
    '<div class="ai-key-status" aria-live="polite"></div>' +
    '<div class="ai-intent-chips"></div>' +
    '<form class="ai-question-form">' +
      '<textarea class="ai-question-input" rows="3" maxlength="800" placeholder="Ask a question about this context..." required></textarea>' +
      '<button type="submit" class="animate-btn ai-question-submit">Ask</button>' +
    '</form>' +
    '<p class="ai-question-status" aria-live="polite"></p>' +
    '<div class="ai-history-list"></div>';
  documentRef.body.appendChild(panelRoot);

  var panel = {
    root: panelRoot,
    closeBtn: panelRoot.querySelector('.ai-assist-close'),
    contextType: panelRoot.querySelector('.ai-context-type'),
    contextLabel: panelRoot.querySelector('.ai-context-label'),
    contextExcerpt: panelRoot.querySelector('.ai-context-excerpt'),
    provider: panelRoot.querySelector('.ai-provider-select'),
    openAiKeyBtn: panelRoot.querySelector('.ai-key-openai'),
    claudeKeyBtn: panelRoot.querySelector('.ai-key-claude'),
    keyStatus: panelRoot.querySelector('.ai-key-status'),
    intents: panelRoot.querySelector('.ai-intent-chips'),
    form: panelRoot.querySelector('.ai-question-form'),
    input: panelRoot.querySelector('.ai-question-input'),
    submit: panelRoot.querySelector('.ai-question-submit'),
    status: panelRoot.querySelector('.ai-question-status'),
    history: panelRoot.querySelector('.ai-history-list')
  };

  function setPanelOpen(isOpen) {
    if (isOpen) {
      panel.root.classList.add('open');
      panel.root.setAttribute('aria-hidden', 'false');
      return;
    }
    panel.root.classList.remove('open');
    panel.root.setAttribute('aria-hidden', 'true');
  }

  return {
    panelRoot: panelRoot,
    panel: panel,
    setPanelOpen: setPanelOpen
  };
}

export function renderIntentChips(options) {
  var opts = options || {};
  var intentsEl = opts.intentsEl;
  var intents = opts.intents || [];
  if (!intentsEl) {
    return;
  }

  intentsEl.innerHTML = '';
  for (var i = 0; i < intents.length; i++) {
    (function(intent) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-intent-chip' + (opts.activeIntentId === intent.id ? ' active' : '');
      btn.textContent = intent.label;
      btn.addEventListener('click', function() {
        if (typeof opts.onToggle === 'function') {
          opts.onToggle(intent.id);
        }
      });
      intentsEl.appendChild(btn);
    }(intents[i]));
  }
}
