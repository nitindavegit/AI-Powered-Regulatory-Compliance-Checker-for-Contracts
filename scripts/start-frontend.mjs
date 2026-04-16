import { spawn } from 'node:child_process';

const backendPort = process.env.BACKEND_PORT || '4001';
const backendUrl = `http://127.0.0.1:${backendPort}/api/health`;
const children = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isBackendUp = async () => {
  try {
    const response = await fetch(backendUrl);
    return response.ok;
  } catch {
    return false;
  }
};

const runNode = (args, options = {}) => {
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
  children.push(child);
  return child;
};

const shutdown = () => {
  while (children.length) {
    const child = children.pop();
    if (child && !child.killed) {
      child.kill('SIGINT');
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const ensureBackend = async () => {
  if (await isBackendUp()) {
    return null;
  }

  const backend = runNode(['backend/server.js']);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isBackendUp()) {
      return backend;
    }
    await delay(500);
  }

  throw new Error(`Backend did not start on port ${backendPort}`);
};

try {
  await ensureBackend();

  const vite = runNode([
    'node_modules/vite/bin/vite.js',
    '--configLoader',
    'runner',
    '--port',
    '3000',
    '--host',
    '0.0.0.0',
  ]);

  vite.on('exit', (code) => {
    shutdown();
    process.exit(code ?? 0);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown();
  process.exit(1);
}
