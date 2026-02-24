export function createMarkerLayer(options) {
  var opts = options || {};
  var documentRef = opts.documentRef || document;

  function refreshSentenceIndicators() {
    opts.clearQuoteHoverHighlight();

    var old = documentRef.querySelectorAll('.ai-sentence-indicator');
    Array.prototype.forEach.call(old, function(node) {
      node.remove();
    });

    var placements = [];
    var keys = opts.getAllContextKeys();
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var meta = opts.getContextMeta(key);
      if (!meta || meta.type !== 'selection') {
        continue;
      }
      var count = opts.getContextHistory(key).length;
      if (!count) {
        continue;
      }

      var container = opts.findSelectionContainer(meta);
      if (!container) {
        continue;
      }
      var quote = opts.normalizeText(meta.quoteSnippet || meta.excerpt || '');
      var quoteRange = opts.findQuoteRangeInContainer(container, quote);
      placements.push({
        key: key,
        count: count,
        container: container,
        range: quoteRange
      });
    }

    for (var p = 0; p < placements.length; p++) {
      (function(placeInfo) {
        var marker = documentRef.createElement('button');
        marker.type = 'button';
        marker.className = 'ai-sentence-indicator';
        marker.textContent = placeInfo.count;
        marker.addEventListener('mouseenter', function() {
          opts.showQuoteHoverHighlight(placeInfo.key, placeInfo.container);
        });
        marker.addEventListener('mouseleave', function() {
          opts.clearQuoteHoverHighlight();
        });
        marker.addEventListener('focus', function() {
          opts.showQuoteHoverHighlight(placeInfo.key, placeInfo.container);
        });
        marker.addEventListener('blur', function() {
          opts.clearQuoteHoverHighlight();
        });
        marker.addEventListener('click', function() {
          opts.clearQuoteHoverHighlight();
          var ctx = opts.contextFromKey(placeInfo.key);
          if (ctx) {
            opts.openForContext(ctx);
          }
        });

        if (placeInfo.range) {
          var place = placeInfo.range.cloneRange();
          place.collapse(false);
          place.insertNode(marker);
          marker.classList.add('exact');
        } else {
          marker.classList.add('fallback');
          placeInfo.container.appendChild(documentRef.createTextNode(' '));
          placeInfo.container.appendChild(marker);
        }
      }(placements[p]));
    }
  }

  return {
    refreshSentenceIndicators: refreshSentenceIndicators
  };
}
