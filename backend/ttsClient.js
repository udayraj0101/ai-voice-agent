const axios = require('axios');

class TTSClient {
  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY;
    this.baseUrl = 'https://api.sarvam.ai/text-to-speech';
  }

  async streamSpeech(text, onChunk) {
    try {
      console.log('Converting text to speech:', text.substring(0, 30) + '...');
      
      const response = await axios.post(this.baseUrl, {
        inputs: [text],
        target_language_code: 'en-IN',
        speaker: 'meera',
        pitch: 0.1,
        pace: 1.0,
        loudness: 1.0,
        speech_sample_rate: 8000,
        enable_preprocessing: false,
        model: 'bulbul:v1'
      }, {
        headers: {
          'API-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      if (response.data && response.data.audios && response.data.audios[0]) {
        const audioBase64 = response.data.audios[0];
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        console.log('TTS completed, audio size:', audioBuffer.length, 'bytes');
        onChunk(audioBuffer);
      } else {
        console.error('❌ No audio data in TTS response');
        onChunk(Buffer.from('TTS_ERROR'));
      }

    } catch (error) {
      console.error('❌ TTS error:', error.response?.data || error.message);
      onChunk(Buffer.from('TTS_ERROR'));
    }
  }
}

module.exports = TTSClient;