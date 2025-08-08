const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class WhisperClient {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async transcribe(audioBuffer) {
    try {
      const tempPath = path.join(__dirname, `whisper_${Date.now()}.wav`);
      
      // Create proper WAV file with header
      const wavBuffer = this.createWavBuffer(audioBuffer);
      fs.writeFileSync(tempPath, wavBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: 'whisper-1',
        response_format: 'text',
        temperature: 0,
        prompt: 'Hello namaste face wash hair oil skincare products'
      });

      // Clean up
      fs.unlinkSync(tempPath);
      
      return transcription.trim();
    } catch (error) {
      console.error('Whisper transcription error:', error.message);
      return null;
    }
  }

  createWavBuffer(audioBuffer) {
    // Simple WAV header for 16kHz mono PCM
    const header = Buffer.alloc(44);
    const dataSize = audioBuffer.length;
    const fileSize = dataSize + 36;
    
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // PCM format size
    header.writeUInt16LE(1, 20);  // PCM format
    header.writeUInt16LE(1, 22);  // Mono
    header.writeUInt32LE(16000, 24); // Sample rate
    header.writeUInt32LE(32000, 28); // Byte rate
    header.writeUInt16LE(2, 32);  // Block align
    header.writeUInt16LE(16, 34); // Bits per sample
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    
    return Buffer.concat([header, audioBuffer]);
  }
}

module.exports = WhisperClient;