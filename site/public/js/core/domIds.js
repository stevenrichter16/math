export function ensureElementId(el, prefix, slugifyFn) {
  if (!el) {
    return prefix + '-' + Math.random().toString(36).slice(2, 8);
  }
  if (el.id) {
    return el.id;
  }

  var slugify = slugifyFn || function(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  var base = slugify(el.textContent || '') || prefix;
  var candidate = base;
  var idx = 2;
  while (document.getElementById(candidate)) {
    candidate = base + '-' + idx;
    idx++;
  }
  el.id = candidate;
  return el.id;
}
