export function createContextResolver(options) {
  var opts = options || {};
  var documentRef = opts.documentRef || document;
  var aiState = opts.aiState;

  function makeContext(type, label, excerpt, anchorId, options2) {
    var opts2 = options2 || {};
    var safeType = type || 'section';
    var safeLabel = opts.normalizeText(label) || 'Selected context';
    var safeExcerpt = opts.truncateText(opts.normalizeText(excerpt), 650);
    var safeAnchor = anchorId || (safeType + '-' + opts.hashText(safeLabel + safeExcerpt));
    var safeQuoteSnippet = opts.truncateText(opts.normalizeText(opts2.quoteSnippet || safeExcerpt), 220);
    var safeQuoteHash = opts2.quoteHash || opts.hashText(safeQuoteSnippet);
    var keySeed = safeType + '|' + safeAnchor + '|' + safeQuoteHash;
    return {
      type: safeType,
      label: safeLabel,
      excerpt: safeExcerpt,
      anchorId: safeAnchor,
      quoteSnippet: safeQuoteSnippet,
      quoteHash: safeQuoteHash,
      key: safeType + ':' + opts.hashText(keySeed)
    };
  }

  function contextFromKey(contextKey) {
    var meta = aiState.qaState.contextMeta[contextKey];
    if (!meta) {
      return null;
    }
    var ctx = makeContext(
      meta.type || 'section',
      meta.label || 'Saved context',
      meta.excerpt || '',
      meta.anchorId || '',
      {
        quoteSnippet: meta.quoteSnippet || '',
        quoteHash: meta.quoteHash || ''
      }
    );
    ctx.key = contextKey;
    return ctx;
  }

  function findParentCard(node) {
    var curr = node;
    while (curr && curr !== documentRef.body) {
      if (curr.classList && curr.classList.contains('visual-card')) {
        return curr;
      }
      curr = curr.parentNode;
    }
    return null;
  }

  function collectHeadingSnippet(headingEl, maxChars) {
    var parts = [];
    var total = 0;
    var node = headingEl.nextElementSibling;
    while (node && total < maxChars) {
      if (node.tagName === 'H2' || node.tagName === 'FOOTER') {
        break;
      }
      var text = opts.normalizeText(node.textContent);
      if (text) {
        parts.push(text);
        total += text.length + 1;
      }
      if (node.tagName === 'SECTION') {
        break;
      }
      node = node.nextElementSibling;
    }
    return opts.truncateText(parts.join(' '), maxChars);
  }

  function contextFromHeading(headingEl) {
    var label = headingEl.getAttribute('data-ai-label') || opts.normalizeText(headingEl.textContent);
    var anchorId = opts.ensureElementId(headingEl, 'section');
    var excerpt = '';

    if (headingEl.classList.contains('visual-title')) {
      var card = headingEl.closest('.visual-card');
      var desc = card ? card.querySelector('.visual-desc') : null;
      excerpt = desc ? opts.normalizeText(desc.textContent) : '';
      return makeContext('visualization', label, excerpt, anchorId);
    }

    if (headingEl.tagName === 'H3') {
      var stepBody = headingEl.closest('.guide-step-body');
      excerpt = stepBody ? opts.normalizeText(stepBody.textContent.replace(label, '')) : '';
      return makeContext('section', label, excerpt, anchorId);
    }

    if (headingEl.classList.contains('rule-name')) {
      var ruleCard = headingEl.closest('.rule-card');
      excerpt = ruleCard ? opts.normalizeText(ruleCard.textContent.replace(label, '')) : '';
      return makeContext('section', label, excerpt, anchorId, { quoteSnippet: label });
    }

    excerpt = collectHeadingSnippet(headingEl, 550);
    return makeContext('section', label, excerpt, anchorId);
  }

  function contextKeysForAnchor(anchorId) {
    var keys = [];
    var allKeys = Object.keys(aiState.qaState.contextMeta || {});
    for (var i = 0; i < allKeys.length; i++) {
      var key = allKeys[i];
      var meta = aiState.qaState.contextMeta[key];
      if (!meta || meta.anchorId !== anchorId) continue;
      if (!opts.getContextHistory(key).length) continue;
      keys.push(key);
    }
    return keys;
  }

  function contextCountForAnchor(anchorId) {
    var keys = contextKeysForAnchor(anchorId);
    var total = 0;
    for (var i = 0; i < keys.length; i++) {
      total += opts.getContextHistory(keys[i]).length;
    }
    return total;
  }

  function latestContextKeyForAnchor(anchorId) {
    var keys = contextKeysForAnchor(anchorId);
    if (!keys.length) {
      return null;
    }
    var bestKey = keys[0];
    var bestTime = 0;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var meta = aiState.qaState.contextMeta[key] || {};
      var history = opts.getContextHistory(key);
      var timeCandidate = Date.parse(meta.lastAskedAt || '');
      if (!isFinite(timeCandidate) && history.length) {
        timeCandidate = Date.parse(history[history.length - 1].createdAt || '');
      }
      if (!isFinite(timeCandidate)) {
        timeCandidate = 0;
      }
      if (timeCandidate >= bestTime) {
        bestTime = timeCandidate;
        bestKey = key;
      }
    }
    return bestKey;
  }

  function wireVizLaunchers(openForContext) {
    var mounts = documentRef.querySelectorAll('.viz-qa[data-viz-id]');
    Array.prototype.forEach.call(mounts, function(root) {
      var card = findParentCard(root);
      var titleEl = card ? card.querySelector('.visual-title') : null;
      var descEl = card ? card.querySelector('.visual-desc') : null;
      var vizId = root.getAttribute('data-viz-id') || opts.hashText(root.textContent);
      var label = opts.normalizeText(root.getAttribute('data-viz-title') || (titleEl ? titleEl.textContent : vizId));
      var excerpt = opts.normalizeText(root.getAttribute('data-viz-desc') || (descEl ? descEl.textContent : ''));
      var anchorSource = titleEl;
      if (!anchorSource) {
        anchorSource = root.previousElementSibling;
        while (anchorSource && anchorSource.tagName !== 'H2') {
          anchorSource = anchorSource.previousElementSibling;
        }
      }
      var anchorId = opts.ensureElementId(anchorSource || root, 'viz');

      root.innerHTML = '';
      var btn = documentRef.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-viz-launch';
      btn.textContent = 'Ask AI about this visualization';
      btn.addEventListener('click', function() {
        openForContext(makeContext('visualization', label, excerpt, anchorId, {
          quoteSnippet: label + ' ' + excerpt
        }));
      });
      root.appendChild(btn);
    });
  }

  return {
    makeContext: makeContext,
    contextFromKey: contextFromKey,
    contextFromHeading: contextFromHeading,
    contextCountForAnchor: contextCountForAnchor,
    latestContextKeyForAnchor: latestContextKeyForAnchor,
    wireVizLaunchers: wireVizLaunchers
  };
}
