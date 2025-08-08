const { createClient } = require('@deepgram/sdk');

class DeepgramFast {
  constructor() {
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  }

  async transcribe(audioBuffer) {
    try {
      const startTime = Date.now();
      
      // Create WAV header for proper audio format
      const wavBuffer = this.createWAV(audioBuffer);
      
      // Use prerecorded API (works reliably)
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        wavBuffer,
        {
          model: 'nova-2',
          language: 'hi-en',
          smart_format: true,
          punctuate: true,
          diarize: false
        }
      );

      if (error) {
        console.error('Deepgram error:', error);
        return null;
      }

      const transcript = result.results.channels[0].alternatives[0].transcript;
      const confidence = result.results.channels[0].alternatives[0].confidence;
      
      console.log(`🎯 Deepgram (${Date.now() - startTime}ms, ${(confidence * 100).toFixed(1)}%):`, transcript);
      return transcript.trim();

    } catch (error) {
      console.error('Deepgram transcription error:', error);
      return null;
    }
  }

  createWAV(audioBuffer) {
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

module.exports = DeepgramFast;