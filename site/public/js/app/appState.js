export function createEmptyQaState() {
  return {
    contexts: {},
    contextMeta: {}
  };
}

export function createAppState() {
  return {
    graph: {
      currentFn: 'x^2',
      currentX: 1.0
    },
    ai: {
      qaState: createEmptyQaState(),
      activeContext: null,
      activeIntentId: '',
      pendingSelectionContext: null,
      activeQuoteHighlight: null
    }
  };
}
