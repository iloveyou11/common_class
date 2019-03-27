class Web {
    setLocal(key, value) {
        if (window.localStorage) {
            storage = window.localStorage;
            if (storage.getItem(key)) {
                storage.removeItem(key);
            }
            storage.setItem(key, value);
        }
    }
    setSession(key, value) {
        if (window.sessionStorage) {
            storage = window.sessionStorage;
            if (storage.getItem(key)) {
                storage.removeItem(key);
            }
            storage.setItem(key, value);
        }
    }
}

export default Web()