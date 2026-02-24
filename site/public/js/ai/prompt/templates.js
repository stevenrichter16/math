export function collectRecentContext(history, providerLabel, truncateText) {
  if (!history || !history.length) {
    return '';
  }
  var recent = history.slice(-3);
  var lines = ['Previous Q&A for this same context:'];
  for (var i = 0; i < recent.length; i++) {
    var item = recent[i];
    lines.push(
      (i + 1) + '. [' + providerLabel(item.provider) + '] Q: ' + truncateText(item.question || '', 220)
    );
    lines.push('   A: ' + truncateText(item.answer || '', 380));
  }
  return lines.join('\n');
}

export function buildPrompts(context, question, intentInstruction, recentContext) {
  var systemPrompt =
    'You are a precise calculus tutor. Be accurate, clear, and concise. ' +
    'Write all mathematical notation in LaTeX delimiters: inline \\(...\\) and display \\[...\\]. ' +
    'Respond in plain text using exactly this structure:\n' +
    'Direct answer:\n' +
    'Why this applies here:\n' +
    'Example:\n' +
    'Next questions:\n' +
    '- ...\n' +
    '- ...';

  var userPrompt =
    'Context type: ' + context.type + '\n' +
    'Context label: ' + context.label + '\n' +
    'Context excerpt: "' + context.excerpt + '"\n' +
    'Learning intent: ' + intentInstruction + '\n' +
    (recentContext ? recentContext + '\n' : '') +
    'Question: ' + question;

  return { systemPrompt: systemPrompt, userPrompt: userPrompt };
}
