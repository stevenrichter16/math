function extractOpenAIResponseText(payload) {
  if (payload && typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  if (!payload || !Array.isArray(payload.output)) {
    return '';
  }
  var chunks = [];
  for (var i = 0; i < payload.output.length; i++) {
    var out = payload.output[i];
    if (!out || !Array.isArray(out.content)) {
      continue;
    }
    for (var j = 0; j < out.content.length; j++) {
      var part = out.content[j];
      if (part && typeof part.text === 'string' && part.text.trim()) {
        chunks.push(part.text.trim());
      }
    }
  }
  return chunks.join('\n\n').trim();
}

export async function askOpenAI(options) {
  var opts = options || {};
  var apiKey = (opts.apiKey || '').trim();
  var prompts = opts.prompts || {};
  var maxTokens = typeof opts.maxTokens === 'number' ? opts.maxTokens : 700;
  var model = opts.model || 'gpt-5.2-mini';

  var response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: prompts.systemPrompt || '' }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompts.userPrompt || '' }]
        }
      ],
      max_output_tokens: maxTokens
    })
  });

  if (!response.ok) {
    var message = 'ChatGPT request failed (' + response.status + ').';
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
  var text = extractOpenAIResponseText(payload);
  if (!text) {
    throw new Error('ChatGPT returned an empty response. Try again.');
  }
  return text;
}
