const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class WhisperClientFast {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.transcriptionCache = new Map();
  }

  async transcribe(audioBuffer) {
    const startTime = Date.now();
    
    try {
      // Create optimized WAV file
      const tempPath = path.join(__dirname, `whisper_${Date.now()}.wav`);
      const wavBuffer = this.createOptimizedWav(audioBuffer);
      fs.writeFileSync(tempPath, wavBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: 'whisper-1',
        response_format: 'text',
        temperature: 0, // Deterministic
        language: 'hi' // Hint for Hindi/Hinglish
      });

      fs.unlinkSync(tempPath);
      
      const result = transcription.trim();
      const processingTime = Date.now() - startTime;
      
      console.log('Whisper processing:', processingTime + 'ms');
      return result;
      
    } catch (error) {
      console.error('Whisper error:', error.message);
      return null;
    }
  }

  createOptimizedWav(audioBuffer) {
    // Create optimized WAV header for 8kHz mono for faster processing
    const header = Buffer.alloc(44);
    const dataSize = audioBuffer.length;
    
    header.write('RIFF', 0);
    header.writeUInt32LE(dataSize + 36, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(8000, 24); // 8kHz for speed
    header.writeUInt32LE(16000, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    
    return Buffer.concat([header, audioBuffer]);
  }
}

module.exports = WhisperClientFast;