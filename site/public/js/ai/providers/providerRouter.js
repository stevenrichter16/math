import { askOpenAI } from './openaiProvider.js';
import { askClaude } from './claudeProvider.js';

function providerEntry(providers, provider) {
  if (providers && providers[provider]) {
    return providers[provider];
  }
  if (providers && providers.chatgpt) {
    return providers.chatgpt;
  }
  return null;
}

export async function askByProvider(options) {
  var opts = options || {};
  var provider = opts.provider === 'claude' ? 'claude' : 'chatgpt';
  var providers = opts.providers || {};
  var config = providerEntry(providers, provider);

  var shared = {
    apiKey: opts.apiKey || '',
    model: config && config.model ? config.model : '',
    prompts: opts.prompts || {},
    maxTokens: opts.maxTokens
  };

  if (provider === 'claude') {
    return askClaude(shared);
  }
  return askOpenAI(shared);
}
