const axios = require('axios');

class TTSClientFast {
  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY;
    this.baseUrl = 'https://api.sarvam.ai/text-to-speech';
    this.audioCache = new Map();
  }

  async streamSpeech(text, onChunk) {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.normalizeText(text);
    if (this.audioCache.has(cacheKey)) {
      console.log('TTS cache hit');
      const cachedAudio = this.audioCache.get(cacheKey);
      onChunk(cachedAudio);
      console.log('TTS conversion: 0ms (cached)');
      return;
    }

    try {
      console.log('Converting text to speech:', text.substring(0, 30) + '...');
      
      const response = await axios.post(this.baseUrl, {
        inputs: [text],
        target_language_code: 'en-IN',
        speaker: 'meera',
        pitch: 0,
        pace: 1.4, // Faster pace
        loudness: 1.0,
        speech_sample_rate: 8000, // Lower quality for speed
        enable_preprocessing: false,
        model: 'bulbul:v1'
      }, {
        headers: {
          'API-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 8000 // 8 second timeout
      });

      if (response.data && response.data.audios && response.data.audios[0]) {
        const audioBase64 = response.data.audios[0];
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        
        // Cache short responses
        if (text.length < 80) {
          this.audioCache.set(cacheKey, audioBuffer);
          
          // Limit cache size
          if (this.audioCache.size > 20) {
            const firstKey = this.audioCache.keys().next().value;
            this.audioCache.delete(firstKey);
          }
        }
        
        onChunk(audioBuffer);
        
        const totalTime = Date.now() - startTime;
        console.log('TTS conversion:', totalTime + 'ms');
        console.log('TTS completed, audio size:', audioBuffer.length, 'bytes');

      } else {
        console.error('No audio data in TTS response');
        onChunk(Buffer.from('TTS_ERROR'));
      }

    } catch (error) {
      console.error('TTS error:', error.response?.data || error.message);
      onChunk(Buffer.from('TTS_ERROR'));
    }
  }

  normalizeText(text) {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }
}

module.exports = TTSClientFast;