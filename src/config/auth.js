// Konfigurasi kredensial OAuth 2.0 dan API Key untuk YouTube Data API

const config = {
    oauth2: {
        clientId: process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
        redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
        scope: [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.force-ssl'
        ]
    },
    apiKey: process.env.YOUTUBE_API_KEY
};

module.exports = config;