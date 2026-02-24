export function initSelectionButton(options) {
  var opts = options || {};
  var documentRef = opts.documentRef || document;

  var selectionBtn = documentRef.createElement('button');
  selectionBtn.type = 'button';
  selectionBtn.className = 'ai-selection-ask';
  selectionBtn.textContent = 'Ask AI';
  documentRef.body.appendChild(selectionBtn);

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
    if (text.length < 8) {
      hideSelectionButton();
      return;
    }
    text = opts.truncateText(text, 450);

    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      hideSelectionButton();
      return;
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

    var x = rect.left + (rect.width / 2);
    var left = Math.max(12, Math.min(window.innerWidth - 84, x - 36));
    var top = window.scrollY + rect.top - 40;

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
    setTimeout(updateSelectionButton, 0);
  });
  documentRef.addEventListener('keyup', function() {
    setTimeout(updateSelectionButton, 0);
  });
  documentRef.addEventListener('scroll', hideSelectionButton, true);
  documentRef.addEventListener('mousedown', function(event) {
    if (!selectionBtn.contains(event.target)) {
      hideSelectionButton();
    }
  });

  return {
    hideSelectionButton: hideSelectionButton,
    updateSelectionButton: updateSelectionButton,
    selectionBtn: selectionBtn
  };
}
