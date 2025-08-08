class BufferManagerFast {
  constructor() {
    this.audioBuffer = [];
    this.energyHistory = [];
    this.silenceThreshold = 0.025;
    this.minSpeechDuration = 4; // Reduced from 8
    this.silenceDuration = 0;
    this.maxSilenceDuration = 2; // Reduced from 6 - faster detection
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.processingStarted = false;
  }

  addChunk(audioData) {
    const audioBuffer = Buffer.from(audioData, 'base64');
    const int16Array = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 2);
    
    const energy = this.calculateEnergy(int16Array);
    this.energyHistory.push(energy);
    
    if (this.energyHistory.length > 5) { // Reduced history
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
      
      // Disable early processing to prevent overlapping
      // if (this.audioBuffer.length >= 8 && !this.processingStarted) {
      //   this.processingStarted = true;
      //   return { type: 'early', buffer: Buffer.concat(this.audioBuffer) };
      // }
    } else {
      if (this.isSpeaking) {
        this.silenceDuration++;
        this.audioBuffer.push(audioBuffer);
        
        if (this.silenceDuration >= this.maxSilenceDuration && this.audioBuffer.length >= this.minSpeechDuration) {
          console.log('Pause detected after', this.silenceDuration, 'chunks');
          return { type: 'complete', buffer: this.flushBuffer() };
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
    return sum / samples.length / 32768;
  }

  flushBuffer() {
    if (this.audioBuffer.length === 0) return null;
    
    const combinedBuffer = Buffer.concat(this.audioBuffer);
    const duration = this.speechStartTime ? Date.now() - this.speechStartTime : 0;
    
    console.log('Flushing buffer:', combinedBuffer.length, 'bytes, duration:', duration + 'ms');
    
    this.audioBuffer = [];
    this.isSpeaking = false;
    this.silenceDuration = 0;
    this.speechStartTime = null;
    this.processingStarted = false;
    
    return combinedBuffer;
  }

  clear() {
    this.audioBuffer = [];
    this.energyHistory = [];
    this.isSpeaking = false;
    this.silenceDuration = 0;
    this.processingStarted = false;
  }
}

module.exports = BufferManagerFast;