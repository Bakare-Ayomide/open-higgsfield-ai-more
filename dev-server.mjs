import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

// Ensure port 3000 is clean before starting to avoid EADDRINUSE collisions
try {
  execSync('pkill -9 -f "next-server" || true', { stdio: 'ignore' });
  const start = Date.now();
  while (Date.now() - start < 300) {}
} catch {}

const rawArgs = process.argv.slice(2);
const filteredArgs = [];

let hasPort = false;
let hasHost = false;

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];

  if (arg === '--port' || arg === '-p') {
    hasPort = true;
    filteredArgs.push(arg);
    if (rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-')) {
      filteredArgs.push(rawArgs[++i]);
    }
  } else if (arg.startsWith('--port=')) {
    hasPort = true;
    filteredArgs.push(arg);
  } else if (arg === '--host' || arg === '--hostname' || arg === '-H') {
    hasHost = true;
    filteredArgs.push('--hostname');
    if (rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-')) {
      filteredArgs.push(rawArgs[++i]);
    }
  } else if (arg.startsWith('--host=')) {
    hasHost = true;
    filteredArgs.push(`--hostname=${arg.slice('--host='.length)}`);
  } else if (arg.startsWith('--hostname=')) {
    hasHost = true;
    filteredArgs.push(arg);
  } else {
    filteredArgs.push(arg);
  }
}

if (!hasPort) {
  filteredArgs.push('-p', '3000');
}
if (!hasHost) {
  filteredArgs.push('-H', '0.0.0.0');
}

const child = spawn(process.execPath, [nextBin, 'dev', ...filteredArgs], {
  stdio: 'inherit',
  env: process.env,
  detached: process.platform !== 'win32',
});

let isTerminating = false;
function terminateChild(signal = 'SIGTERM') {
  if (isTerminating) return;
  isTerminating = true;
  if (child && child.pid) {
    try {
      if (process.platform !== 'win32') {
        process.kill(-child.pid, signal);
      } else {
        child.kill(signal);
      }
    } catch {
      try { child.kill(signal); } catch {}
    }
  }
}

process.on('SIGINT', () => {
  terminateChild('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  terminateChild('SIGTERM');
  process.exit(0);
});

process.on('exit', () => {
  terminateChild('SIGKILL');
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

