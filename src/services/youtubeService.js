const { google } = require('googleapis');
const config = require('../config/auth');
const { logger } = require('../utils/logger');

class YouTubeService {
  constructor() {
    this.youtube = google.youtube('v3');
    this.oauth2Client = new google.auth.OAuth2(
      config.oauth2.clientId,
      config.oauth2.clientSecret,
      config.oauth2.redirectUri
    );
  }

  async createLiveStream(title, description = '') {
    try {
      // Membuat broadcast
      const broadcast = await this.youtube.liveBroadcasts.insert({
        auth: this.oauth2Client,
        part: 'snippet,contentDetails,status',
        resource: {
          snippet: {
            title,
            description,
            scheduledStartTime: new Date().toISOString()
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
            enableDvr: true,
            recordFromStart: true,
            enableArchive: true,
            monitorStream: true
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false
          }
        }
      });

      // Membuat stream
      const stream = await this.youtube.liveStreams.insert({
        auth: this.oauth2Client,
        part: 'snippet,cdn,contentDetails,status',
        resource: {
          snippet: {
            title: `${title} - Stream`
          },
          cdn: {
            frameRate: 'variable',
            ingestionType: 'rtmp',
            resolution: 'variable'
          },
          contentDetails: {
            isReusable: false
          }
        }
      });

      // Menghubungkan broadcast dengan stream
      await this.youtube.liveBroadcasts.bind({
        auth: this.oauth2Client,
        part: 'id,contentDetails',
        id: broadcast.data.id,
        streamId: stream.data.id
      });

      return {
        broadcastId: broadcast.data.id,
        streamId: stream.data.id,
        rtmpUrl: `${stream.data.cdn.ingestionInfo.ingestionAddress}/${stream.data.cdn.ingestionInfo.streamName}`
      };
    } catch (error) {
      logger.error('Gagal membuat live stream di YouTube:', error);
      throw new Error('Gagal membuat live stream di YouTube');
    }
  }

  async deleteLiveStream(broadcastId) {
    try {
      await this.youtube.liveBroadcasts.delete({
        auth: this.oauth2Client,
        id: broadcastId
      });
    } catch (error) {
      logger.error('Gagal menghapus live stream di YouTube:', error);
      throw new Error('Gagal menghapus live stream di YouTube');
    }
  }

  setAccessToken(token) {
    this.oauth2Client.setCredentials(token);
  }
}

module.exports = new YouTubeService();