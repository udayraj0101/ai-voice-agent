class AudioProcessor {
  constructor() {
    this.sampleRate = 16000;
  }

  // Advanced noise reduction and audio enhancement
  processAudio(audioBuffer) {
    try {
      const int16Array = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 2);
      
      // Apply noise gate
      const processed = this.applyNoiseGate(int16Array);
      
      // Normalize audio levels
      const normalized = this.normalizeAudio(processed);
      
      // Create optimized WAV (no compression to preserve quality)
      return this.createWAV(normalized);
    } catch (error) {
      console.error('Audio processing error:', error);
      return audioBuffer;
    }
  }
  
  compressAudio(samples) {
    // 50% compression for faster Whisper
    const compressed = new Int16Array(Math.floor(samples.length / 2));
    for (let i = 0; i < compressed.length; i++) {
      compressed[i] = samples[i * 2];
    }
    console.log('🗜️ Audio compressed:', samples.length, '->', compressed.length, 'samples');
    return compressed;
  }

  applyNoiseGate(samples) {
    const threshold = 500; // Lower threshold to preserve speech
    const processed = new Int16Array(samples.length);
    
    for (let i = 0; i < samples.length; i++) {
      processed[i] = Math.abs(samples[i]) > threshold ? samples[i] : samples[i] * 0.1;
    }
    
    return processed;
  }

  normalizeAudio(samples) {
    let max = 0;
    for (let i = 0; i < samples.length; i++) {
      max = Math.max(max, Math.abs(samples[i]));
    }
    
    if (max === 0) return samples;
    
    const factor = 20000 / max; // Normalize to good level
    const normalized = new Int16Array(samples.length);
    
    for (let i = 0; i < samples.length; i++) {
      normalized[i] = Math.min(32767, Math.max(-32768, samples[i] * factor));
    }
    
    return normalized;
  }

  createWAV(samples) {
    const header = Buffer.alloc(44);
    const dataSize = samples.length * 2;
    
    header.write('RIFF', 0);
    header.writeUInt32LE(dataSize + 36, 4);
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
    header.writeUInt32LE(dataSize, 40);
    
    return Buffer.concat([header, Buffer.from(samples.buffer)]);
  }
}

module.exports = AudioProcessor;