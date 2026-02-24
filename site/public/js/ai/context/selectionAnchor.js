export function createSelectionAnchorTools(options) {
  var opts = options || {};
  var documentRef = opts.documentRef || document;
  var normalizeText = opts.normalizeText || function(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  };
  var getContextMeta = opts.getContextMeta || function() {
    return null;
  };
  var activeQuoteHighlight = null;

  function getScopeRootForAnchor(anchorId) {
    var anchorEl = documentRef.getElementById(anchorId);
    if (!anchorEl) {
      return null;
    }
    if (anchorEl.classList.contains('visual-title')) {
      return anchorEl.closest('.visual-card') || anchorEl;
    }
    if (anchorEl.tagName === 'H3') {
      return anchorEl.closest('.guide-step-body') || anchorEl;
    }
    return anchorEl;
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function findSelectionCandidates(meta) {
    if (!meta || meta.type !== 'selection') {
      return null;
    }
    var quote = normalizeText(meta.quoteSnippet || meta.excerpt);
    if (!quote) {
      return null;
    }

    var root = getScopeRootForAnchor(meta.anchorId);
    var candidates = [];

    if (root) {
      if (root.tagName === 'H2') {
        var node = root.nextElementSibling;
        while (node) {
          if (node.tagName === 'H2' || node.tagName === 'FOOTER') {
            break;
          }
          if (!node.classList || !node.classList.contains('viz-qa')) {
            candidates.push(node);
          }
          if (node.tagName === 'SECTION') {
            break;
          }
          node = node.nextElementSibling;
        }
      } else {
        candidates.push(root);
      }
    }

    if (!candidates.length) {
      candidates.push(documentRef.body);
    }

    return {
      quote: quote,
      candidates: candidates
    };
  }

  function findSelectionContainer(meta) {
    var found = findSelectionCandidates(meta);
    if (!found) {
      return null;
    }
    var quote = found.quote;
    var probe = quote.slice(0, Math.min(120, quote.length));
    var candidates = found.candidates;
    var best = null;
    var bestScore = -1;

    var selector = 'p, li, td, .visual-desc, .guide-pull, .callout';
    for (var c = 0; c < candidates.length; c++) {
      var nodes = candidates[c].matches && candidates[c].matches(selector)
        ? [candidates[c]]
        : candidates[c].querySelectorAll(selector);

      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.closest && (el.closest('.ai-assist-panel') || el.closest('.viz-qa'))) {
          continue;
        }
        var text = normalizeText(el.textContent);
        if (!text) {
          continue;
        }
        if (text.indexOf(quote) !== -1) {
          return el;
        }

        var score = 0;
        if (text.indexOf(probe) !== -1) {
          score += 4;
        }
        if (probe.indexOf(text.slice(0, Math.min(80, text.length))) !== -1) {
          score += 2;
        }
        var shortQuote = quote.slice(0, Math.min(60, quote.length));
        if (shortQuote && text.indexOf(shortQuote) !== -1) {
          score += 1;
        }
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      }
    }

    return best;
  }

  function rangeFromOffsets(container, startOffset, endOffset) {
    var nodeFilter = documentRef.defaultView && documentRef.defaultView.NodeFilter
      ? documentRef.defaultView.NodeFilter
      : NodeFilter;
    var walker = documentRef.createTreeWalker(container, nodeFilter.SHOW_TEXT, null);
    var pos = 0;
    var startNode = null;
    var endNode = null;
    var startInNode = 0;
    var endInNode = 0;
    var lastNode = null;

    while (walker.nextNode()) {
      var node = walker.currentNode;
      var len = node.nodeValue.length;
      var nextPos = pos + len;
      lastNode = node;

      if (!startNode && startOffset <= nextPos) {
        startNode = node;
        startInNode = Math.max(0, startOffset - pos);
      }

      if (startNode && endOffset <= nextPos) {
        endNode = node;
        endInNode = Math.max(0, endOffset - pos);
        break;
      }

      pos = nextPos;
    }

    if (startNode && !endNode && lastNode) {
      endNode = lastNode;
      endInNode = lastNode.nodeValue.length;
    }

    if (!startNode || !endNode) {
      return null;
    }

    var range = documentRef.createRange();
    range.setStart(startNode, startInNode);
    range.setEnd(endNode, endInNode);
    return range;
  }

  function findQuoteRangeInContainer(container, quote) {
    if (!container || !quote) {
      return null;
    }

    var raw = container.textContent || '';
    if (!raw) {
      return null;
    }

    var idx = raw.indexOf(quote);
    var matchText = quote;

    if (idx === -1) {
      var re = new RegExp(escapeRegExp(quote).replace(/\s+/g, '\\s+'));
      var m = re.exec(raw);
      if (m) {
        idx = m.index;
        matchText = m[0];
      }
    }

    if (idx === -1) {
      var reInsensitive = new RegExp(escapeRegExp(quote).replace(/\s+/g, '\\s+'), 'i');
      var mi = reInsensitive.exec(raw);
      if (mi) {
        idx = mi.index;
        matchText = mi[0];
      }
    }

    if (idx === -1) {
      return null;
    }

    return rangeFromOffsets(container, idx, idx + matchText.length);
  }

  function clearQuoteHoverHighlight() {
    if (!activeQuoteHighlight || !activeQuoteHighlight.parentNode) {
      activeQuoteHighlight = null;
      return;
    }
    var parent = activeQuoteHighlight.parentNode;
    while (activeQuoteHighlight.firstChild) {
      parent.insertBefore(activeQuoteHighlight.firstChild, activeQuoteHighlight);
    }
    parent.removeChild(activeQuoteHighlight);
    parent.normalize();
    activeQuoteHighlight = null;
  }

  function showQuoteHoverHighlight(contextKey, preferredContainer) {
    var meta = getContextMeta(contextKey);
    if (!meta) {
      return;
    }
    var quote = normalizeText(meta.quoteSnippet || meta.excerpt || '');
    if (!quote) {
      return;
    }

    var container = preferredContainer || findSelectionContainer(meta);
    if (!container) {
      return;
    }

    var range = findQuoteRangeInContainer(container, quote);
    if (!range) {
      return;
    }

    clearQuoteHoverHighlight();

    var wrapper = documentRef.createElement('span');
    wrapper.className = 'ai-hover-quote-highlight';
    try {
      var frag = range.extractContents();
      wrapper.appendChild(frag);
      range.insertNode(wrapper);
      activeQuoteHighlight = wrapper;
    } catch (e) {
      activeQuoteHighlight = null;
    }
  }

  function nearestAnchorElementForNode(node) {
    var el = node && node.nodeType === 1 ? node : (node ? node.parentElement : null);
    if (!el) {
      return documentRef.querySelector('h2');
    }

    var ruleCard = el.closest && el.closest('.rule-card');
    if (ruleCard) {
      var ruleHeading = ruleCard.querySelector('.rule-name');
      if (ruleHeading) {
        return ruleHeading;
      }
    }

    var visualCard = el.closest && el.closest('.visual-card');
    if (visualCard) {
      var visualHeading = visualCard.querySelector('.visual-title');
      if (visualHeading) {
        return visualHeading;
      }
    }

    var guideBody = el.closest && el.closest('.guide-step-body');
    if (guideBody) {
      var guideHeading = guideBody.querySelector('h3');
      if (guideHeading) {
        return guideHeading;
      }
    }

    while (el && el !== documentRef.body) {
      if (
        el.matches &&
        (
          el.matches('h2') ||
          el.matches('.guide-step-body h3') ||
          el.matches('.visual-title') ||
          el.matches('.rule-name')
        )
      ) {
        return el;
      }
      el = el.parentElement;
    }

    var nodeCtor = documentRef.defaultView && documentRef.defaultView.Node
      ? documentRef.defaultView.Node
      : Node;
    var anchors = documentRef.querySelectorAll('h2, .guide-step-body h3, .visual-title, .rule-name');
    var lastBefore = null;
    for (var i = 0; i < anchors.length; i++) {
      var anchor = anchors[i];
      if (anchor.compareDocumentPosition(node) & nodeCtor.DOCUMENT_POSITION_FOLLOWING) {
        lastBefore = anchor;
      }
    }
    return lastBefore || documentRef.querySelector('h2');
  }

  return {
    findSelectionContainer: findSelectionContainer,
    findQuoteRangeInContainer: findQuoteRangeInContainer,
    clearQuoteHoverHighlight: clearQuoteHoverHighlight,
    showQuoteHoverHighlight: showQuoteHoverHighlight,
    nearestAnchorElementForNode: nearestAnchorElementForNode
  };
}
