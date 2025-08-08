const axios = require('axios');

class TTSClientStreaming {
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
      console.log('TTS cache hit for:', text.substring(0, 30));
      const cachedAudio = this.audioCache.get(cacheKey);
      onChunk(cachedAudio);
      console.log('TTS conversion: 0ms (cached)');
      return;
    }

    try {
      console.log('Converting text to speech:', text.substring(0, 30) + '...');
      
      // Process as single chunk to prevent multiple outputs
      const chunks = [text];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const response = await axios.post(this.baseUrl, {
          inputs: [chunk],
          target_language_code: 'en-IN',
          speaker: 'meera',
          pitch: 0.1,
          pace: 1.3, // Faster pace
          loudness: 1.2,
          speech_sample_rate: 16000, // Lower sample rate
          enable_preprocessing: false,
          model: 'bulbul:v1'
        }, {
          headers: {
            'API-Subscription-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });

        if (response.data && response.data.audios && response.data.audios[0]) {
          const audioBase64 = response.data.audios[0];
          const audioBuffer = Buffer.from(audioBase64, 'base64');
          
          // Cache the audio
          if (chunk.length < 100) { // Only cache short responses
            this.audioCache.set(this.normalizeText(chunk), audioBuffer);
          }
          
          // Stream immediately
          onChunk(audioBuffer);
          console.log('TTS chunk', i + 1, 'completed:', audioBuffer.length, 'bytes');
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log('TTS conversion:', totalTime + 'ms');

    } catch (error) {
      console.error('TTS error:', error.response?.data || error.message);
      onChunk(Buffer.from('TTS_ERROR'));
    }
  }

  splitText(text) {
    // Split long text into smaller chunks for faster processing
    if (text.length <= 100) return [text];
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 100) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks.length > 0 ? chunks : [text];
  }

  normalizeText(text) {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }
}

module.exports = TTSClientStreaming;