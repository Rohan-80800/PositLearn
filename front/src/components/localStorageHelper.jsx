const LOCAL_STORAGE_KEYS = {
  GITHUB_TOKEN: "github_token"
};

export const getLocalStorageItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.error(`Error getting item from localStorage: ${key}`, err);
    return null;
  }
};

export const setLocalStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.error(`Error setting item in localStorage: ${key}`, err);
  }
};

export const removeLocalStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Error removing item from localStorage: ${key}`, err);
  }
};

export { LOCAL_STORAGE_KEYS };
