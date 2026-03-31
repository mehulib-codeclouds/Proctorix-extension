if (typeof globalThis.browser === 'undefined') {
  globalThis.browser = (function () {
    const wrap = (api) => {
      return new Proxy(api, {
        get(target, prop) {
          const val = target[prop];
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            return wrap(val);
          }
          if (typeof val === 'function') {
            return function (...args) {
              const lastArg = args[args.length - 1];
              if (typeof lastArg === 'function') {
                return val.apply(target, args);
              }
              return new Promise((resolve, reject) => {
                val.apply(target, [
                  ...args,
                  (result) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(chrome.runtime.lastError.message));
                    } else {
                      resolve(result);
                    }
                  },
                ]);
              });
            };
          }
          return val;
        },
      });
    };
    return wrap(chrome);
  })();
}