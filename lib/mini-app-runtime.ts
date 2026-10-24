import type { MiniAppPackage } from "@/lib/mini-app-package";

export const PREVIEW_SANDBOX = "allow-scripts";
export const PREVIEW_PERMISSIONS =
  "camera 'none'; microphone 'none'; geolocation 'none'; display-capture 'none'; clipboard-read 'none'; clipboard-write 'none'; fullscreen 'none'; payment 'none'; usb 'none'; serial 'none'; bluetooth 'none'";
export const PREVIEW_CSP =
  "default-src 'none'; connect-src 'none'; img-src data:; media-src 'none'; font-src 'none'; style-src 'unsafe-inline' data:; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

// This bootstrap executes only inside the opaque sandbox origin, never in the host.
const SDK = String.raw`
(() => {
  const config = CONFIG;
  const channel = 'moobi-preview-v1';
  const pending = new Map();
  const listeners = new Set();
  let nextId = 0;
  let environment = null;
  function request(method, extra = {}) {
    if (pending.size >= 8) return Promise.reject(new Error('Too many pending SDK requests.'));
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Moobi did not respond. Restart the preview.'));
      }, 5000);
      pending.set(id, { resolve, reject, timer });
      parent.postMessage({ channel, session: config.session, id, method, ...extra }, config.parentOrigin);
    });
  }
  addEventListener('message', (event) => {
    const message = event.data;
    if (event.source !== parent || event.origin !== config.parentOrigin ||
        !message || message.channel !== channel || message.session !== config.session) return;
    if (message.event) {
      if (message.event === 'environment') {
        environment = Object.freeze(message.value);
        document.documentElement.style.colorScheme = environment.theme;
        for (const [key, value] of Object.entries(environment.tokens))
          document.documentElement.style.setProperty(key, value);
        document.documentElement.style.setProperty('--phone-safe-area-top', '0px');
        document.documentElement.style.setProperty('--phone-safe-area-bottom', '0px');
      }
      listeners.forEach((listener) => { try { listener(message.event, message.value); } catch {} });
      return;
    }
    const job = pending.get(message.id);
    if (!job || typeof message.ok !== 'boolean') return;
    clearTimeout(job.timer);
    pending.delete(message.id);
    if (message.ok) job.resolve(message.value);
    else job.reject(new Error(message.error));
  });
  Object.defineProperty(window, 'moobi', { value: Object.freeze({
    ready: new Promise((resolve, reject) => {
      addEventListener('load', () => request('ready').then(resolve, reject), { once: true });
    }),
    getEnvironment: () => environment,
    onEvent: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    storage: Object.freeze({
      get: (key) => request('storage.get', { key }),
      set: (key, value) => request('storage.set', { key, value }),
      remove: (key) => request('storage.remove', { key }),
    }),
  }), writable: false, configurable: false });
  const fault = () => { request('fault').catch(() => {}); };
  addEventListener('error', fault);
  addEventListener('unhandledrejection', fault);
})();`;

function base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192)
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
}

/** Form controls normalize raw line endings. ASCII base64 preserves CSP-hashed bytes. */
export function encodeRuntimeDocument(value: string): string {
  return base64(value);
}

export async function buildPreviewDocument(
  app: MiniAppPackage,
  session: string,
  parentOrigin: string,
) {
  const config = JSON.stringify({ session, parentOrigin }).replaceAll(
    "<",
    "\\u003c",
  );
  const sdk = SDK.replace("CONFIG", config);
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sdk)),
  );
  const hash = btoa(String.fromCharCode(...digest));
  // The fixed policy precedes all package content. Extra meta policies cannot loosen it.
  // Data scripts avoid interpolating untrusted JS into a host HTML script element.
  const policy = `${PREVIEW_CSP}; script-src 'sha256-${hash}' data:`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><script>${sdk}</script><link rel="stylesheet" href="data:text/css;base64,${base64(app.files["app.css"])}"></head><body>${app.files["index.html"]}<script src="data:text/javascript;base64,${base64(app.files["app.js"])}"></script></body></html>`;
}
