import { spawn } from 'node:child_process';
const children = new Set();
export async function stopTree(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise(resolve => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      killer.once('exit', resolve); killer.once('error', resolve);
    });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
    try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  }
}
export async function stopChildren() { await Promise.all([...children].map(stopTree)); }
export function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32' });
    children.add(child);
    child.once('exit', () => children.delete(child));
    child.once('error', () => children.delete(child));
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(command + ' exited with ' + (code ?? signal))));
  });
}
export const nodeRun = (file, args = [], env = process.env) => run(process.execPath, [file, ...args], env);
