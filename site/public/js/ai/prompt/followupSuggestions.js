function normalizeLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanQuestion(value) {
  var text = normalizeLine(value)
    .replace(/^[-*•\u2022]+\s*/, '')
    .replace(/^\d+[\.)]\s*/, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();

  if (!text || text.length < 8) {
    return '';
  }

  if (!/[?]$/.test(text)) {
    text = text.replace(/[.!]+$/, '').trim();
    text += '?';
  }

  return text;
}

function shouldSkipLine(line) {
  return /^(direct answer|why this applies here|example|next questions?)\s*:/i.test(line);
}

function pushUnique(list, seen, value) {
  var question = cleanQuestion(value);
  if (!question) {
    return;
  }
  var key = question.toLowerCase();
  if (seen[key]) {
    return;
  }
  seen[key] = true;
  list.push(question);
}

export function extractFollowUpQuestions(answer, originalQuestion) {
  var text = String(answer || '');
  var lines = text.split(/\r?\n/);
  var followUps = [];
  var seen = {};

  var markerIndex = -1;
  for (var i = 0; i < lines.length; i++) {
    if (/^\s*next questions?\s*:/i.test(lines[i])) {
      markerIndex = i;
      break;
    }
  }

  if (markerIndex >= 0) {
    for (var j = markerIndex + 1; j < lines.length; j++) {
      var line = normalizeLine(lines[j]);
      if (!line) {
        if (followUps.length) {
          break;
        }
        continue;
      }
      if (shouldSkipLine(line)) {
        continue;
      }
      pushUnique(followUps, seen, line);
      if (followUps.length >= 4) {
        return followUps.slice(0, 4);
      }
    }
  }

  for (var k = 0; k < lines.length; k++) {
    var candidate = normalizeLine(lines[k]);
    if (!candidate || shouldSkipLine(candidate)) {
      continue;
    }
    if (/\?$/.test(candidate)) {
      pushUnique(followUps, seen, candidate);
      if (followUps.length >= 4) {
        return followUps.slice(0, 4);
      }
    }
  }

  if (followUps.length < 2) {
    var lower = text.toLowerCase();
    if (lower.indexOf('graph') !== -1 || lower.indexOf('slope') !== -1) {
      pushUnique(followUps, seen, 'How can I verify this directly on the graph?');
    }
    if (lower.indexOf('example') !== -1 || lower.indexOf('calculate') !== -1) {
      pushUnique(followUps, seen, 'Can you walk through one more concrete numeric example?');
    }
    pushUnique(followUps, seen, 'What is the most common mistake to avoid here?');
    pushUnique(followUps, seen, 'What should I ask next to understand this more deeply?');
  }

  if (originalQuestion) {
    var original = normalizeLine(originalQuestion).toLowerCase();
    followUps = followUps.filter(function(item) {
      return item.toLowerCase() !== original;
    });
  }

  return followUps.slice(0, 4);
}
