const axios = require('axios');

class RunPodWhisperClient {
  constructor() {
    this.apiUrl = 'https://api.runpod.ai/v2/8bueq9cenmedud';
    this.apiKey = process.env.RUNPOD_API_KEY;
  }

  async transcribe(audioBuffer) {
    try {
      // Skip if audio is too short (less than 0.5 seconds)
      if (audioBuffer.length < 16000) {
        console.log('Audio too short, skipping RunPod:', audioBuffer.length, 'bytes');
        return null;
      }
      
      // Convert to WAV format for better compatibility
      const wavBuffer = this.createWavHeader(audioBuffer);
      const audio_base64 = wavBuffer.toString('base64');
      
      console.log('Sending audio to RunPod:', audioBuffer.length, 'bytes');
      
      const response = await axios.post(`${this.apiUrl}/runsync`, {
        input: {
          audio_base64,
          model: 'base',
          language: 'hi' // Hindi language code
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log('RunPod response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.output && response.data.output.transcription) {
        return response.data.output.transcription.trim();
      } else {
        console.error('No transcription in RunPod response:', response.data);
        return null;
      }
    } catch (error) {
      console.error('RunPod transcription error:', error.response?.data || error.message);
      return null;
    }
  }
  
  createWavHeader(audioBuffer) {
    const header = Buffer.alloc(44);
    const dataSize = audioBuffer.length;
    
    header.write('RIFF', 0);
    header.writeUInt32LE(dataSize + 36, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(16000, 24);
    header.writeUInt32LE(32000, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    
    return Buffer.concat([header, audioBuffer]);
  }
}

module.exports = RunPodWhisperClient;