import { writeFileSync } from 'node:fs';

const [port, url, out] = process.argv.slice(2);

async function findPage() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const tabs = await response.json();
      const page = tabs.find((tab) => tab.type === 'page');
      if (page) return page;
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('no page target');
}

const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const events = [];
let nextId = 0;
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  } else if (message.method) {
    events.push(message);
  }
});
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});
function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

let ready = false;
for (let attempt = 0; attempt < 120; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const probe = await send('Runtime.evaluate', { expression: 'Boolean(window.__shotReady)', returnByValue: true });
  if (probe.result?.result?.value) {
    ready = true;
    break;
  }
}
if (!ready) throw new Error('shot did not become ready');
await new Promise((resolve) => setTimeout(resolve, 400));
const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
if (!capture.result?.data) throw new Error('capture failed');
writeFileSync(out, Buffer.from(capture.result.data, 'base64'));
const errors = events
  .filter((event) => event.method === 'Runtime.exceptionThrown' || (event.method === 'Log.entryAdded' && event.params.entry.level === 'error'))
  .map((event) => JSON.stringify(event.params).slice(0, 300));
console.log(JSON.stringify({ out, ready, errors }));
ws.close();
