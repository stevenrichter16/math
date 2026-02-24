function extractClaudeResponseText(payload) {
  if (!payload || !Array.isArray(payload.content)) {
    return '';
  }
  var chunks = [];
  for (var i = 0; i < payload.content.length; i++) {
    var part = payload.content[i];
    if (part && part.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
      chunks.push(part.text.trim());
    }
  }
  return chunks.join('\n\n').trim();
}

export async function askClaude(options) {
  var opts = options || {};
  var apiKey = (opts.apiKey || '').trim();
  var prompts = opts.prompts || {};
  var maxTokens = typeof opts.maxTokens === 'number' ? opts.maxTokens : 700;
  var model = opts.model || 'claude-3-5-sonnet-latest';

  var response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
      system: prompts.systemPrompt || '',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompts.userPrompt || '' }]
    })
  });

  if (!response.ok) {
    var message = 'Claude request failed (' + response.status + ').';
    try {
      var errPayload = await response.json();
      if (errPayload && errPayload.error && errPayload.error.message) {
        message = errPayload.error.message;
      }
    } catch (e) {
      // keep default message
    }
    throw new Error(message);
  }

  var payload = await response.json();
  var text = extractClaudeResponseText(payload);
  if (!text) {
    throw new Error('Claude returned an empty response. Try again.');
  }
  return text;
}
