class BufferManager {
  constructor() {
    this.audioBuffer = [];
    this.energyHistory = [];
    this.silenceThreshold = 0.025;
    this.minSpeechDuration = 4; // chunks - reduced for faster response
    this.silenceDuration = 0;
    this.maxSilenceDuration = 3; // chunks - faster pause detection
    this.isSpeaking = false;
    this.speechStartTime = null;
  }

  addChunk(audioData) {
    // Convert base64 to int16 array for energy calculation
    const audioBuffer = Buffer.from(audioData, 'base64');
    const int16Array = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 2);
    
    // Calculate energy
    const energy = this.calculateEnergy(int16Array);
    this.energyHistory.push(energy);
    
    // Keep only recent energy history
    if (this.energyHistory.length > 10) {
      this.energyHistory.shift();
    }
    
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const isSpeechDetected = avgEnergy > this.silenceThreshold;
    
    if (isSpeechDetected) {
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.speechStartTime = Date.now();
        console.log('Speech detected, energy:', avgEnergy.toFixed(4));
      }
      this.silenceDuration = 0;
      this.audioBuffer.push(audioBuffer);
    } else {
      if (this.isSpeaking) {
        this.silenceDuration++;
        this.audioBuffer.push(audioBuffer); // Include some silence
        
        // Check for pause (end of speech)
        if (this.silenceDuration >= this.maxSilenceDuration && this.audioBuffer.length >= this.minSpeechDuration) {
          console.log('Pause detected after', this.silenceDuration, 'silent chunks');
          return this.flushBuffer();
        }
      }
    }
    
    return null;
  }

  calculateEnergy(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    return sum / samples.length / 32768; // Normalize to 0-1
  }

  flushBuffer() {
    if (this.audioBuffer.length === 0) return null;
    
    const combinedBuffer = Buffer.concat(this.audioBuffer);
    const duration = this.speechStartTime ? Date.now() - this.speechStartTime : 0;
    
    console.log('Flushing buffer:', combinedBuffer.length, 'bytes,', this.audioBuffer.length, 'chunks, duration:', duration + 'ms');
    
    // Reset state
    this.audioBuffer = [];
    this.isSpeaking = false;
    this.silenceDuration = 0;
    this.speechStartTime = null;
    
    return combinedBuffer;
  }

  clear() {
    this.audioBuffer = [];
    this.energyHistory = [];
    this.isSpeaking = false;
    this.silenceDuration = 0;
  }
}

module.exports = BufferManager;