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
        .input(stream.rtspUrl)
        .inputOptions('-rtsp_transport', 'tcp')
        .inputOptions('-thread_queue_size', '1024')
        .inputOptions('-probesize', '32768')
        .inputOptions('-analyzeduration', '1000000')
        .inputOptions('-stimeout', '10000000')
        .videoCodec('libx264')
        .outputOptions('-preset', 'veryfast')
        .outputOptions('-tune', 'zerolatency')
        .outputOptions('-profile:v', 'baseline')
        .size('854x480')
        .fps(15)
        .outputOptions('-threads', '2')
        .outputOptions('-x264opts', 'subme=0:me_range=4:rc_lookahead=0:me=dia:no_chroma_me:8x8dct=0:partitions=none')
        .videoBitrate('500k')
        .outputOptions('-maxrate', '500k')
        .outputOptions('-bufsize', '1000k')
        .outputOptions('-g', '30')
        .outputOptions('-keyint_min', '30')
        .outputOptions('-sc_threshold', '0')
        .outputOptions('-pix_fmt', 'yuv420p')
        .audioCodec('aac')
        .audioFrequency(44100)
        .audioBitrate('32k')
        .outputOptions('-strict', 'experimental')
        .outputOptions('-max_muxing_queue_size', '1024')
        .outputOptions('-reconnect', '1')
        .outputOptions('-reconnect_at_eof', '1')
        .outputOptions('-reconnect_streamed', '1')
        .outputOptions('-reconnect_delay_max', '5')
        .format('flv');

      // Konfigurasi resolusi dan bitrate berdasarkan resolusi yang dipilih
      const resolutionMap = {
        '480': { size: '854x480', bitrate: '500k' },
        '720': { size: '1280x720', bitrate: '1000k' },
        '1080': { size: '1920x1080', bitrate: '2000k' },
        '4k': { size: '3840x2160', bitrate: '4000k' }
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

      // Gunakan URL RTMP dan stream key yang dimasukkan pengguna tanpa modifikasi
      const rtmpUrl = stream.rtmpUrl;
      
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

        try {
          await stream.update({ 
            status: 'error', 
            lastError: errorMessage,
            retryCount: retryCount + 1
          });
        } catch (updateError) {
          logger.error(`Gagal mengupdate status stream: ${updateError.message}`);
        }

        if (stream.autoRestart && retryCount < 5) {
          const delaySeconds = Math.min(Math.pow(2, retryCount) * 5, 300); // Exponential backoff dengan max 5 menit
          logger.info(`Mencoba restart stream ${stream.name} dalam ${delaySeconds} detik... (Percobaan ke-${retryCount + 1})`);
          setTimeout(async () => {
            try {
              const currentStream = await Stream.findByPk(streamId);
              if (!currentStream) {
                logger.error(`Stream ${streamId} tidak ditemukan saat mencoba restart`);
                return;
              }
              if (currentStream.status !== 'stopped') {
                await this.startStream(streamId, retryCount + 1);
              }
            } catch (retryError) {
              logger.error(`Gagal melakukan retry stream: ${retryError.message}`);
            }
          }, delaySeconds * 1000);
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