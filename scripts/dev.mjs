import { spawn } from 'node:child_process';

const children = [];

const run = (name, command, args) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
    shutdown();
  });

  children.push(child);
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

run('backend', 'npm', ['run', 'backend:dev']);
run('frontend', 'npm', ['run', 'dev:frontend']);
