import type { MiniAppPackage } from "@/lib/mini-app-package";

export const SAMPLE_PACKAGE: MiniAppPackage = {
  formatVersion: 1,
  manifest: {
    id: "example.counter",
    name: "Pocket Counter",
    version: "1.0.0",
    sdkVersion: 1,
    entry: "index.html",
    permissions: ["storage"],
  },
  files: {
    "index.html": `<main><p class="eyebrow">YOUR FIRST MINI APP</p><h1>Pocket Counter</h1><p>A small app. Its own space.</p><output id="count" aria-live="polite">…</output><button id="add" disabled>Add one</button><button id="reset" disabled>Reset counter</button><p id="status" role="status">Opening saved data…</p><p id="lifecycle">Waiting for Moobi</p><details><summary>Isolation check</summary><p id="isolation">Checking…</p></details></main>`,
    "app.css": `*{box-sizing:border-box}body{margin:0;background:var(--phone-canvas);color:var(--phone-text);font:15px system-ui,sans-serif}main{padding:24px 18px}h1{font-size:26px;letter-spacing:-.04em;margin:12px 0}p{color:var(--phone-text-secondary);line-height:1.5}.eyebrow{font-size:10px;letter-spacing:.14em}output{display:block;font-size:72px;letter-spacing:-.06em;margin:20px 0}button{display:block;width:100%;min-height:44px;border:1px solid var(--phone-border);border-radius:14px;background:var(--phone-surface);color:var(--phone-text);font:inherit;margin:8px 0}button:disabled{opacity:.5}button:focus-visible,summary:focus-visible{outline:2px solid var(--phone-focus);outline-offset:2px}#add{background:var(--phone-accent);color:var(--phone-on-accent)}#status,#lifecycle,details{font-size:12px}summary{min-height:44px;cursor:pointer}`,
    "app.js": String.raw`
const output = document.querySelector('#count');
const status = document.querySelector('#status');
const add = document.querySelector('#add');
const reset = document.querySelector('#reset');
let count = 0;
moobi.onEvent((event) => {
  if (['launch', 'pause', 'resume', 'back'].includes(event))
    document.querySelector('#lifecycle').textContent = 'Lifecycle: ' + event;
});
async function save(next) {
  add.disabled = reset.disabled = true;
  try {
    await moobi.storage.set('count', String(next));
    count = next;
    output.textContent = String(count);
    status.textContent = 'Saved on this browser. Stop and reopen to check.';
  } catch (error) { status.textContent = error.message; }
  finally { add.disabled = reset.disabled = false; }
}
add.addEventListener('click', () => save(count + 1));
reset.addEventListener('click', () => save(0));
moobi.ready.then(async () => {
  const saved = await moobi.storage.get('count');
  count = saved !== null && /^\d{1,9}$/.test(saved) ? Number(saved) : 0;
  output.textContent = String(count);
  status.textContent = 'Your counter is ready.';
  add.disabled = reset.disabled = false;
  let parentBlocked = false;
  let storageBlocked = false;
  let connectionBlocked = false;
  try { void parent.document.body; } catch { parentBlocked = true; }
  try { void localStorage.length; } catch { storageBlocked = true; }
  try { await fetch('data:text/plain,probe'); } catch { connectionBlocked = true; }
  document.querySelector('#isolation').textContent =
    'Parent DOM: ' + (parentBlocked ? 'blocked' : 'UNEXPECTED ACCESS') +
    '. Direct storage: ' + (storageBlocked ? 'blocked' : 'UNEXPECTED ACCESS') +
    '. Connection API: ' + (connectionBlocked ? 'blocked' : 'UNEXPECTED ACCESS') + '.';
}).catch((error) => { status.textContent = error.message; });`,
  },
};
