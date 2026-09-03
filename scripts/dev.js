const { exec } = require('child_process');
const path = require('path');

const vite = exec('npx vite', { cwd: path.join(__dirname, '..') });
vite.stdout.pipe(process.stdout);
vite.stderr.pipe(process.stderr);

setTimeout(() => {
  const electron = exec('npx electron . --dev', { cwd: path.join(__dirname, '..') });
  electron.stdout.pipe(process.stdout);
  electron.stderr.pipe(process.stderr);
  electron.on('close', () => {
    vite.kill();
    process.exit();
  });
}, 3000);
