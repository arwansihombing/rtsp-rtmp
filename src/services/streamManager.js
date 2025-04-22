const ffmpeg = require('fluent-ffmpeg');
const { Stream } = require('../models');
const { logger } = require('../utils/logger');

class StreamManager {
  constructor() {
    this.streams = new Map();
  }

  async initializeStreams() {
    const streams = await Stream.findAll({ where: { status: 'running' } });
    for (const stream of streams) {
      await this.startStream(stream.id);
    }
  }

  async startStream(streamId, retryCount = 0) {
    try {
      const stream = await Stream.findByPk(streamId);
      if (!stream) throw new Error('Stream tidak ditemukan');

      if (this.streams.has(streamId)) {
        await this.stopStream(streamId);
      }

      // Validasi URL RTSP
      if (!stream.rtspUrl || !stream.rtspUrl.startsWith('rtsp://')) {
        throw new Error('URL RTSP tidak valid');
      }

      const command = ffmpeg()
        .input('anullsrc')
        .inputOptions('-f', 'lavfi')
        .inputOptions('-rtsp_transport', 'tcp')
        .input(stream.rtspUrl)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioFrequency(44100)
        .audioBitrate('128k')
        .outputOptions('-strict', 'experimental')
        .format('flv');

      // Konfigurasi resolusi dan bitrate berdasarkan resolusi yang dipilih
      const resolutionMap = {
        '480': { size: '854x480', bitrate: '800k' },
        '720': { size: '1280x720', bitrate: '1500k' },
        '1080': { size: '1920x1080', bitrate: '3000k' },
        '4k': { size: '3840x2160', bitrate: '8000k' }
      };

      if (stream.resolution) {
        const resolution = stream.resolution.split('x')[1]; // Mengambil tinggi resolusi
        const preset = resolutionMap[resolution];
        
        if (preset) {
          command.size(preset.size)
                 .outputOptions('-b:v', preset.bitrate);
        } else {
          // Jika resolusi tidak ada dalam map, gunakan resolusi custom
          const [width, height] = stream.resolution.split('x');
          command.size(`${width}x${height}`);
        }
      }

      const rtmpUrl = `${stream.rtmpUrl}/${stream.streamKey}`;
      
      command.on('start', () => {
        logger.info(`Stream ${stream.name} dimulai dengan sukses`);
        stream.update({ 
          status: 'running', 
          lastError: null,
          retryCount: 0
        });
      });

      command.on('error', async (err) => {
        const errorMessage = `Error pada stream ${stream.name}: ${err.message}`;
        logger.error(errorMessage);
        logger.error('Stack trace:', err.stack);

        await stream.update({ 
          status: 'error', 
          lastError: errorMessage,
          retryCount: retryCount + 1
        });

        if (stream.autoRestart && retryCount < 5) {
          const delaySeconds = Math.min(Math.pow(2, retryCount) * 5, 300); // Exponential backoff dengan max 5 menit
          logger.info(`Mencoba restart stream ${stream.name} dalam ${delaySeconds} detik... (Percobaan ke-${retryCount + 1})`);
          setTimeout(() => this.startStream(streamId, retryCount + 1), delaySeconds * 1000);
        } else if (retryCount >= 5) {
          logger.error(`Stream ${stream.name} gagal setelah ${retryCount} kali percobaan. Menghentikan auto-restart.`);
          await stream.update({ 
            status: 'failed',
            lastError: `Gagal setelah ${retryCount} kali percobaan: ${errorMessage}`
          });
        }
      });

      command.on('end', async () => {
        logger.info(`Stream ${stream.name} berhenti`);
        await stream.update({ status: 'stopped' });

        if (stream.autoRestart && retryCount < 5) {
          logger.info(`Memulai ulang stream ${stream.name}...`);
          await this.startStream(streamId, retryCount);
        }
      });

      command.output(rtmpUrl);
      command.run();

      this.streams.set(streamId, command);
    } catch (error) {
      logger.error(`Gagal memulai stream ${streamId}:`, error);
      throw error;
    }
  }

  async stopStream(streamId) {
    const command = this.streams.get(streamId);
    if (command) {
      command.kill();
      this.streams.delete(streamId);
      await Stream.update({ status: 'stopped' }, { where: { id: streamId } });
    }
  }

  async restartStream(streamId) {
    await this.stopStream(streamId);
    await this.startStream(streamId);
  }
}

let streamManager;

async function setupStreamManager() {
  if (!streamManager) {
    streamManager = new StreamManager();
    await streamManager.initializeStreams();
  }
  return streamManager;
}

module.exports = {
  setupStreamManager
};