const { spawn } = require('child_process');
const path = require('path');

class ProcessMonitor {
  constructor() {
    this.process = null;
    this.restartCount = 0;
    this.maxRestarts = 10;
    this.restartDelay = 5000; // 5 detik
  }

  start() {
    if (this.restartCount >= this.maxRestarts) {
      console.error('Mencapai batas maksimum restart. Menghentikan monitor.');
      process.exit(1);
    }

    const appPath = path.join(__dirname, 'src', 'index.js');
    console.log(`Memulai aplikasi: ${appPath}`);

    this.process = spawn('node', [appPath], {
      stdio: 'inherit',
      env: process.env
    });

    this.process.on('exit', (code, signal) => {
      console.log(`Proses berhenti dengan kode: ${code}`);
      if (code !== 0) {
        console.log(`Mencoba restart dalam ${this.restartDelay/1000} detik...`);
        this.restartCount++;
        setTimeout(() => this.start(), this.restartDelay);
      }
    });

    this.process.on('error', (err) => {
      console.error('Kesalahan proses:', err);
    });
  }
}

const monitor = new ProcessMonitor();
monitor.start();

// Menangani sinyal untuk shutdown yang bersih
process.on('SIGTERM', () => {
  console.log('Menerima sinyal SIGTERM. Melakukan shutdown yang bersih...');
  if (monitor.process) {
    monitor.process.kill();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Menerima sinyal SIGINT. Melakukan shutdown yang bersih...');
  if (monitor.process) {
    monitor.process.kill();
  }
  process.exit(0);
});