export function setAnswerContent(el, text) {
  el.textContent = text || '';
  if (typeof window.renderMathInElement === 'function') {
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {
      // Keep plain text fallback on KaTeX render errors.
    }
  }
}

export function renderHistoryList(options) {
  var opts = options || {};
  var historyEl = opts.historyEl;
  if (!historyEl) {
    return;
  }

  historyEl.innerHTML = '';

  if (!opts.activeContext) {
    var emptyDefault = document.createElement('p');
    emptyDefault.className = 'ai-history-empty';
    emptyDefault.textContent = opts.emptyDefaultText || 'Choose a section or highlight text to start.';
    historyEl.appendChild(emptyDefault);
    return;
  }

  var history = opts.getContextHistory(opts.activeContext.key);
  if (!history.length) {
    var empty = document.createElement('p');
    empty.className = 'ai-history-empty';
    empty.textContent = opts.emptyContextText || 'No saved Q&A for this context yet.';
    historyEl.appendChild(empty);
    return;
  }

  for (var i = history.length - 1; i >= 0; i--) {
    (function(entry) {
      var item = document.createElement('article');
      item.className = 'ai-history-item';

      var top = document.createElement('div');
      top.className = 'ai-history-top';

      var meta = document.createElement('div');
      meta.className = 'ai-history-meta';

      var providerTag = document.createElement('span');
      providerTag.className = 'ai-meta-tag';
      providerTag.textContent = opts.providerLabel(entry.provider);
      meta.appendChild(providerTag);

      if (entry.intentId) {
        var intent = opts.findIntentConfig(entry.intentId);
        if (intent) {
          var intentTag = document.createElement('span');
          intentTag.className = 'ai-meta-tag intent';
          intentTag.textContent = intent.label;
          meta.appendChild(intentTag);
        }
      }

      var time = document.createElement('span');
      time.className = 'ai-history-time';
      time.textContent = opts.formatTimestamp(entry.createdAt);
      meta.appendChild(time);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'ai-history-delete';
      del.textContent = 'Delete';
      del.addEventListener('click', function() {
        if (typeof opts.onDelete === 'function') {
          opts.onDelete(entry);
        }
      });

      top.appendChild(meta);
      top.appendChild(del);

      var q = document.createElement('p');
      q.className = 'ai-history-question';
      q.textContent = 'Q: ' + (entry.question || '');

      var a = document.createElement('p');
      a.className = 'ai-history-answer';
      setAnswerContent(a, entry.answer || '');

      item.appendChild(top);
      item.appendChild(q);
      item.appendChild(a);
      historyEl.appendChild(item);
    }(history[i]));
  }
}
