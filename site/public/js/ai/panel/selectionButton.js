export function initSelectionButton(options) {
  var opts = options || {};
  var documentRef = opts.documentRef || document;
  var updateTimer = null;

  var selectionBtn = documentRef.createElement('button');
  selectionBtn.type = 'button';
  selectionBtn.className = 'ai-selection-ask';
  selectionBtn.textContent = 'Ask AI';
  documentRef.body.appendChild(selectionBtn);

  function scheduleUpdate(delayMs) {
    if (updateTimer) {
      window.clearTimeout(updateTimer);
    }
    updateTimer = window.setTimeout(function() {
      updateTimer = null;
      updateSelectionButton();
    }, typeof delayMs === 'number' ? delayMs : 0);
  }

  function isCoarsePointer() {
    try {
      return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    } catch (e) {
      return false;
    }
  }

  function measureSelectionButton() {
    var wasShown = selectionBtn.classList.contains('show');
    if (!wasShown) {
      selectionBtn.style.visibility = 'hidden';
      selectionBtn.classList.add('show');
    }
    var rect = selectionBtn.getBoundingClientRect();
    var size = {
      width: rect.width || 84,
      height: rect.height || 30
    };
    if (!wasShown) {
      selectionBtn.classList.remove('show');
      selectionBtn.style.visibility = '';
    }
    return size;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hideSelectionButton() {
    selectionBtn.classList.remove('show');
    selectionBtn.classList.remove('has-history');
    selectionBtn.textContent = 'Ask AI';
    opts.aiState.pendingSelectionContext = null;
  }

  function updateSelectionButton() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      hideSelectionButton();
      return;
    }
    if (opts.panelRoot.contains(sel.anchorNode) || opts.panelRoot.contains(sel.focusNode)) {
      hideSelectionButton();
      return;
    }

    var text = opts.normalizeText(sel.toString());
    if (text.length < 2) {
      hideSelectionButton();
      return;
    }
    text = opts.truncateText(text, 450);

    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      var rects = range.getClientRects();
      if (rects && rects.length > 0) {
        rect = rects[0];
      } else {
        var startEl = range.startContainer && range.startContainer.nodeType === 1
          ? range.startContainer
          : (range.startContainer ? range.startContainer.parentElement : null);
        if (startEl && typeof startEl.getBoundingClientRect === 'function') {
          rect = startEl.getBoundingClientRect();
        }
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        hideSelectionButton();
        return;
      }
    }

    opts.aiState.pendingSelectionContext = opts.makeContext(
      'selection',
      'Selected sentence',
      text,
      opts.ensureElementId(opts.nearestAnchorElementForNode(range.startContainer), 'section'),
      { quoteSnippet: text, quoteHash: opts.hashText(text) }
    );

    var existingCount = opts.getContextHistory(opts.aiState.pendingSelectionContext.key).length;
    if (existingCount > 0) {
      selectionBtn.classList.add('has-history');
      selectionBtn.textContent = 'Ask AI (' + existingCount + ')';
    } else {
      selectionBtn.classList.remove('has-history');
      selectionBtn.textContent = 'Ask AI';
    }

    var size = measureSelectionButton();
    var x = rect.left + (rect.width / 2);
    var left = clamp(x - (size.width / 2), 10, window.innerWidth - size.width - 10);
    var top;
    if (isCoarsePointer()) {
      top = rect.bottom + 10;
      if (top + size.height > window.innerHeight - 10) {
        top = rect.top - size.height - 10;
      }
    } else {
      top = rect.top - size.height - 10;
      if (top < 10) {
        top = rect.bottom + 10;
      }
    }
    top = clamp(top, 10, window.innerHeight - size.height - 10);

    selectionBtn.style.left = left + 'px';
    selectionBtn.style.top = top + 'px';
    selectionBtn.classList.add('show');
  }

  selectionBtn.addEventListener('click', function() {
    if (opts.aiState.pendingSelectionContext) {
      opts.openForContext(opts.aiState.pendingSelectionContext);
    }
    hideSelectionButton();
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  });

  documentRef.addEventListener('mouseup', function() {
    scheduleUpdate(0);
  });
  documentRef.addEventListener('pointerup', function() {
    scheduleUpdate(0);
  });
  documentRef.addEventListener('touchend', function() {
    scheduleUpdate(24);
  }, { passive: true });
  documentRef.addEventListener('selectionchange', function() {
    scheduleUpdate(24);
  });
  documentRef.addEventListener('keyup', function() {
    scheduleUpdate(0);
  });
  documentRef.addEventListener('scroll', hideSelectionButton, true);
  documentRef.addEventListener('mousedown', function(event) {
    if (!selectionBtn.contains(event.target)) {
      hideSelectionButton();
    }
  });
  window.addEventListener('resize', hideSelectionButton);
  window.addEventListener('orientationchange', hideSelectionButton);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', hideSelectionButton);
    window.visualViewport.addEventListener('scroll', hideSelectionButton);
  }

  return {
    hideSelectionButton: hideSelectionButton,
    updateSelectionButton: updateSelectionButton,
    selectionBtn: selectionBtn
  };
}
