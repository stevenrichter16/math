export function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // no-op when storage is unavailable
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    // no-op when storage is unavailable
  }
}
