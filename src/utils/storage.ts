export const storagePrefix = "nulink_agent_react_";

export const storage = {
  getItem: (keyName: string) => {
    const key = `${storagePrefix}${keyName}`;
    const value = window.localStorage.getItem(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value as string);
  },
  setItem: (keyName: string, keyValue: string | object) => {
    const key = `${storagePrefix}${keyName}`,
      value = JSON.stringify(keyValue);
    window.localStorage.setItem(key, value);
  },
  removeItem: (keyName: string) => {
    const key = `${storagePrefix}${keyName}`;
    return window.localStorage.removeItem(key);
  },
  clear: () => {
    window.localStorage.clear();
  },
};

export default storage;

export const sessionStoragePrefix = "nulink_agent_react_session_";

export const seStorage = {
  getItem: (keyName: string) => {
    const key = `${sessionStoragePrefix}${keyName}`;
    const value = window.sessionStorage.getItem(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value as string);
  },
  setItem: (keyName: string, keyValue: string | object) => {
    const key = `${sessionStoragePrefix}${keyName}`,
      value = JSON.stringify(keyValue);
    window.sessionStorage.setItem(key, value);
  },
  removeItem: (keyName: string) => {
    const key = `${sessionStoragePrefix}${keyName}`;
    return window.sessionStorage.removeItem(key);
  },
  clear: () => {
    window.sessionStorage.clear();
  },
};
