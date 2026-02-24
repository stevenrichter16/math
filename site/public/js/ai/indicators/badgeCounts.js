export function createBadgeCounts(options) {
  var opts = options || {};
  var documentRef = opts.documentRef || document;

  function refreshHeadingBadges() {
    var headings = documentRef.querySelectorAll('[data-ai-anchor]');
    Array.prototype.forEach.call(headings, function(headingEl) {
      var badge = headingEl.querySelector('.ai-inline-count');
      if (!badge) {
        return;
      }
      var anchorId = headingEl.getAttribute('data-ai-anchor');
      var count = opts.contextCountForAnchor(anchorId);
      if (count > 0) {
        badge.textContent = String(count);
        badge.classList.add('show');
      } else {
        badge.textContent = '0';
        badge.classList.remove('show');
      }
    });
  }

  function addHeadingAskButtons() {
    var headingNodes = documentRef.querySelectorAll('h2, .guide-step-body h3, .visual-title');
    Array.prototype.forEach.call(headingNodes, function(headingEl) {
      if (headingEl.querySelector('.ai-inline-ask')) {
        return;
      }
      var label = opts.normalizeText(headingEl.textContent);
      if (!label) {
        return;
      }
      headingEl.setAttribute('data-ai-label', label);
      var anchorId = opts.ensureElementId(headingEl, 'section');
      headingEl.setAttribute('data-ai-anchor', anchorId);

      var btn = documentRef.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-inline-ask';
      btn.textContent = 'Ask AI';
      btn.addEventListener('click', function() {
        opts.openForContext(opts.contextFromHeading(headingEl));
      });

      var badge = documentRef.createElement('button');
      badge.type = 'button';
      badge.className = 'ai-inline-count';
      badge.textContent = '0';
      badge.addEventListener('click', function() {
        var recentKey = opts.latestContextKeyForAnchor(anchorId);
        if (recentKey) {
          var ctx = opts.contextFromKey(recentKey);
          if (ctx) {
            opts.openForContext(ctx);
            return;
          }
        }
        opts.openForContext(opts.contextFromHeading(headingEl));
      });

      headingEl.appendChild(documentRef.createTextNode(' '));
      headingEl.appendChild(btn);
      headingEl.appendChild(documentRef.createTextNode(' '));
      headingEl.appendChild(badge);
    });
  }

  function addRuleCountBadges() {
    var rules = documentRef.querySelectorAll('.rule-name');
    Array.prototype.forEach.call(rules, function(ruleEl) {
      if (ruleEl.querySelector('.ai-inline-count')) {
        return;
      }
      var label = opts.normalizeText(ruleEl.textContent);
      if (!label) {
        return;
      }
      ruleEl.setAttribute('data-ai-label', label);
      var anchorId = opts.ensureElementId(ruleEl, 'rule');
      ruleEl.setAttribute('data-ai-anchor', anchorId);

      var badge = documentRef.createElement('button');
      badge.type = 'button';
      badge.className = 'ai-inline-count ai-inline-count-subtle';
      badge.textContent = '0';
      badge.addEventListener('click', function() {
        var recentKey = opts.latestContextKeyForAnchor(anchorId);
        if (recentKey) {
          var ctx = opts.contextFromKey(recentKey);
          if (ctx) {
            opts.openForContext(ctx);
            return;
          }
        }
        opts.openForContext(opts.contextFromHeading(ruleEl));
      });

      ruleEl.appendChild(documentRef.createTextNode(' '));
      ruleEl.appendChild(badge);
    });
  }

  return {
    refreshHeadingBadges: refreshHeadingBadges,
    addHeadingAskButtons: addHeadingAskButtons,
    addRuleCountBadges: addRuleCountBadges
  };
}
