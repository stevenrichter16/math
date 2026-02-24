import { createEmptyQaState } from '../../app/appState.js';
import { readStorage, writeStorage, removeStorage } from '../../core/storage.js';

function normalizeQaState(value) {
  if (!value || typeof value !== 'object') {
    return createEmptyQaState();
  }
  if (!value.contexts || typeof value.contexts !== 'object') {
    value.contexts = {};
  }
  if (!value.contextMeta || typeof value.contextMeta !== 'object') {
    value.contextMeta = {};
  }
  return value;
}

export function createQaStore(options) {
  var opts = options || {};
  var storageKey = opts.storageKey || 'page-ai-qa-v2';
  var providers = opts.providers || {};
  var providerKeys = Object.keys(providers);
  var defaultProvider = providers.chatgpt || (providerKeys.length ? providers[providerKeys[0]] : null);
  var qaState = normalizeQaState(opts.initialState || createEmptyQaState());

  function providerConfig(provider) {
    return providers[provider] || defaultProvider || null;
  }

  function load() {
    var raw = readStorage(storageKey);
    if (!raw) {
      qaState = normalizeQaState(qaState);
      return qaState;
    }
    try {
      qaState = normalizeQaState(JSON.parse(raw));
      return qaState;
    } catch (e) {
      qaState = createEmptyQaState();
      return qaState;
    }
  }

  function save() {
    writeStorage(storageKey, JSON.stringify(qaState));
  }

  function getContextHistory(contextKey) {
    if (!Array.isArray(qaState.contexts[contextKey])) {
      qaState.contexts[contextKey] = [];
    }
    return qaState.contexts[contextKey];
  }

  function getContextMeta(contextKey) {
    var existing = qaState.contextMeta[contextKey];
    if (!existing || typeof existing !== 'object') {
      existing = {};
      qaState.contextMeta[contextKey] = existing;
    }
    return existing;
  }

  function upsertContextMeta(context) {
    if (!context || !context.key) {
      return;
    }
    var meta = getContextMeta(context.key);
    meta.type = context.type;
    meta.label = context.label;
    meta.excerpt = context.excerpt;
    meta.anchorId = context.anchorId;
    meta.quoteSnippet = context.quoteSnippet || '';
    if (context.quoteHash) {
      meta.quoteHash = context.quoteHash;
    }
    qaState.contextMeta[context.key] = meta;
  }

  function removeContextIfEmpty(contextKey) {
    var history = getContextHistory(contextKey);
    if (history.length) {
      return;
    }
    delete qaState.contexts[contextKey];
    delete qaState.contextMeta[contextKey];
  }

  function getApiKey(provider) {
    var config = providerConfig(provider);
    if (!config || !config.keyStorageKey) {
      return '';
    }
    var key = readStorage(config.keyStorageKey);
    return key ? key.trim() : '';
  }

  function setApiKey(provider, key) {
    var config = providerConfig(provider);
    if (!config || !config.keyStorageKey) {
      return '';
    }
    var clean = (key || '').trim();
    if (!clean) {
      removeStorage(config.keyStorageKey);
      return '';
    }
    writeStorage(config.keyStorageKey, clean);
    return clean;
  }

  return {
    load: load,
    save: save,
    getContextHistory: getContextHistory,
    getContextMeta: getContextMeta,
    upsertContextMeta: upsertContextMeta,
    removeContextIfEmpty: removeContextIfEmpty,
    getApiKey: getApiKey,
    setApiKey: setApiKey
  };
}
