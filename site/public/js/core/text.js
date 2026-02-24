export function normalizeText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function truncateText(value, maxLen) {
  if (!value) {
    return '';
  }
  return value.length > maxLen ? value.slice(0, maxLen - 3) + '...' : value;
}

export function hashText(value) {
  var str = String(value || '');
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash * 31) + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function slugify(value) {
  var text = normalizeText(value).toLowerCase();
  return text
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function formatTimestamp(iso) {
  if (!iso) {
    return 'Saved';
  }
  var d = new Date(iso);
  if (isNaN(d.getTime())) {
    return 'Saved';
  }
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
