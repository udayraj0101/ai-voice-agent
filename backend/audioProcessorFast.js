class AudioProcessorFast {
  constructor() {
    this.sampleRate = 16000;
  }

  async process(audioBuffer) {
    const startTime = Date.now();
    
    try {
      // Apply basic noise reduction and normalization
      const processedBuffer = this.applyNoiseReduction(audioBuffer);
      
      console.log('Fast audio processing:', Date.now() - startTime + 'ms');
      return processedBuffer;
    } catch (error) {
      console.log('Fast processing failed, using original:', error.message);
      return audioBuffer;
    }
  }

  applyNoiseReduction(buffer) {
    try {
      // Convert to int16 array for processing
      const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
      
      // Simple noise gate and normalization
      const threshold = 500; // Noise gate threshold
      let maxAmplitude = 0;
      
      // Find max amplitude
      for (let i = 0; i < int16Array.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(int16Array[i]));
      }
      
      // Apply noise gate and normalize
      const normalizationFactor = maxAmplitude > 0 ? 16000 / maxAmplitude : 1;
      
      for (let i = 0; i < int16Array.length; i++) {
        if (Math.abs(int16Array[i]) < threshold) {
          int16Array[i] = 0; // Remove low-level noise
        } else {
          int16Array[i] = Math.round(int16Array[i] * normalizationFactor * 0.8); // Normalize and reduce volume slightly
        }
      }
      
      return Buffer.from(int16Array.buffer);
    } catch (error) {
      return buffer;
    }
  }

  convertToPCM16(buffer) {
    // Simple conversion - assume input is already close to what we need
    return buffer;
  }

  createWavHeader(dataLength) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(dataLength + 36, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(this.sampleRate, 24);
    header.writeUInt32LE(this.sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    return header;
  }
}

module.exports = AudioProcessorFast;