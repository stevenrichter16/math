export function attachAskFlow(options) {
  var opts = options || {};
  var panel = opts.panel;
  var aiState = opts.aiState;

  panel.openAiKeyBtn.addEventListener('click', function() {
    var value = opts.promptForApiKey('chatgpt');
    if (value === null) return;
    panel.keyStatus.textContent = opts.keyStatusLabel();
    panel.status.textContent = value ? 'ChatGPT key saved.' : 'ChatGPT key cleared.';
  });

  panel.claudeKeyBtn.addEventListener('click', function() {
    var value = opts.promptForApiKey('claude');
    if (value === null) return;
    panel.keyStatus.textContent = opts.keyStatusLabel();
    panel.status.textContent = value ? 'Claude key saved.' : 'Claude key cleared.';
  });

  panel.form.addEventListener('submit', async function(event) {
    event.preventDefault();
    if (!aiState.activeContext) {
      panel.status.textContent = 'Pick a section or sentence first.';
      return;
    }

    var question = opts.normalizeText(panel.input.value);
    if (!question) return;

    var provider = panel.provider.value === 'claude' ? 'claude' : 'chatgpt';
    var apiKey = opts.getApiKey(provider);
    if (!apiKey) {
      apiKey = opts.promptForApiKey(provider);
      panel.keyStatus.textContent = opts.keyStatusLabel();
    }
    if (!apiKey) {
      panel.status.textContent = 'Add a ' + opts.providerLabel(provider) + ' key first.';
      return;
    }

    var intentConfig = opts.findIntentConfig(aiState.activeIntentId);
    var intentInstruction = intentConfig ? intentConfig.instruction : 'General clarification.';
    var recentContext = opts.collectRecentContext(
      opts.getContextHistory(aiState.activeContext.key),
      opts.providerLabel,
      opts.truncateText
    );

    var originalLabel = panel.submit.textContent;
    panel.submit.disabled = true;
    panel.provider.disabled = true;
    panel.input.disabled = true;
    panel.submit.textContent = 'Asking...';
    panel.status.textContent = 'Waiting for ' + opts.providerLabel(provider) + '...';

    try {
      var prompts = opts.buildPrompts(aiState.activeContext, question, intentInstruction, recentContext);
      var answer = await opts.askProvider({
        provider: provider,
        providers: opts.providers,
        apiKey: apiKey,
        prompts: prompts,
        maxTokens: 700
      });

      opts.getContextHistory(aiState.activeContext.key).push({
        id: opts.makeId(),
        provider: provider,
        intentId: aiState.activeIntentId || '',
        question: question,
        answer: answer,
        createdAt: new Date().toISOString()
      });
      opts.upsertContextMeta(aiState.activeContext);
      opts.getContextMeta(aiState.activeContext.key).lastAskedAt = new Date().toISOString();
      opts.saveState();
      opts.refreshIndicators();
      opts.renderHistory();
      panel.input.value = '';
      panel.status.textContent = 'Saved via ' + opts.providerLabel(provider) + '.';
    } catch (error) {
      panel.status.textContent = error && error.message
        ? error.message
        : 'Could not get an answer right now.';
    } finally {
      panel.submit.disabled = false;
      panel.provider.disabled = false;
      panel.input.disabled = false;
      panel.submit.textContent = originalLabel;
      panel.input.focus();
    }
  });
}
