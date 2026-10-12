// Dump the real tool schemas + descriptions from the MCP server.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const child = spawn('node', [path.join(root, 'packages/mcp/dist/server.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '', seq = 0; const pending = [];
child.stdout.on('data', d => { buf += d.toString(); try { frame(); } catch {} });
function frame() { let i; while ((i = buf.indexOf('\n')) !== -1) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { const m = JSON.parse(line); const done = pending.shift(); if (done) done(m); } catch {} } }
function send(o) { child.stdin.write(JSON.stringify(o) + '\n'); }
function rpc(method, params) { return new Promise(r => { pending.push(r); send({ jsonrpc: '2.0', id: ++seq, method, params }); }); }

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'dump', version: '1' } });
const list = await rpc('tools/list', {});
for (const t of list.result.tools) {
  console.log('### ' + t.name);
  console.log('DESC: ' + t.description);
  const props = t.inputSchema?.properties ?? {};
  const req = t.inputSchema?.required ?? [];
  const inputs = Object.keys(props).map(k => k + (req.includes(k) ? '' : '?')).join(', ');
  console.log('INPUTS: ' + inputs);
  console.log('OUTPUT KEYS: (from handler) see source');
  console.log();
}
child.kill();
