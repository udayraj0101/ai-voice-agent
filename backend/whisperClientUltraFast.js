const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class WhisperClientUltraFast {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000 // 10 second timeout
    });
  }

  async transcribe(audioBuffer) {
    const startTime = Date.now();
    
    try {
      // Create minimal WAV with lower quality for speed
      const tempPath = path.join(__dirname, `whisper_${Date.now()}.wav`);
      const wavBuffer = this.createMinimalWav(audioBuffer);
      fs.writeFileSync(tempPath, wavBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: 'whisper-1',
        response_format: 'text',
        temperature: 0,
        language: 'hi', // Hindi hint
        prompt: 'Mamaearth products skincare haircare hello good morning' // Context hint
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

  createMinimalWav(audioBuffer) {
    // Compress audio to 8kHz for faster processing
    const compressedBuffer = this.compressAudio(audioBuffer);
    
    const header = Buffer.alloc(44);
    const dataSize = compressedBuffer.length;
    
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
    
    return Buffer.concat([header, compressedBuffer]);
  }

  compressAudio(buffer) {
    try {
      // Simple downsampling - take every 2nd sample
      const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
      const compressed = new Int16Array(Math.floor(int16Array.length / 2));
      
      for (let i = 0; i < compressed.length; i++) {
        compressed[i] = int16Array[i * 2];
      }
      
      return Buffer.from(compressed.buffer);
    } catch (error) {
      return buffer;
    }
  }
}

module.exports = WhisperClientUltraFast;