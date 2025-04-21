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

  async startStream(streamId) {
    try {
      const stream = await Stream.findByPk(streamId);
      if (!stream) throw new Error('Stream tidak ditemukan');

      if (this.streams.has(streamId)) {
        await this.stopStream(streamId);
      }

      const command = ffmpeg()
        .input('anullsrc')
        .inputOptions('-f', 'lavfi')
        .input(stream.rtspUrl)
        .inputOptions('-rtsp_transport', 'tcp')
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioFrequency(44100)
        .audioBitrate('128k')
        .outputOptions('-strict', 'experimental')
        .format('flv');

      if (stream.resolution) {
        const [width, height] = stream.resolution.split('x');
        command.size(`${width}x${height}`);
      }

      const rtmpUrl = `${stream.rtmpUrl}/${stream.streamKey}`;
      
      command.on('start', () => {
        logger.info(`Stream ${stream.name} dimulai`);
        stream.update({ status: 'running', lastError: null });
      });

      command.on('error', async (err) => {
        logger.error(`Error pada stream ${stream.name}:`, err.message);
        await stream.update({ status: 'error', lastError: err.message });

        if (stream.autoRestart) {
          logger.info(`Mencoba restart stream ${stream.name} dalam 10 detik...`);
          setTimeout(() => this.startStream(streamId), 10000);
        }
      });

      command.on('end', async () => {
        logger.info(`Stream ${stream.name} berhenti`);
        await stream.update({ status: 'stopped' });

        if (stream.autoRestart) {
          logger.info(`Memulai ulang stream ${stream.name}...`);
          this.startStream(streamId);
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