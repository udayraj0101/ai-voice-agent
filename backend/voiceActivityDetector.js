class VoiceActivityDetector {
  constructor() {
    this.energyThreshold = 0.03;
    this.silenceFrames = 0;
    this.maxSilenceFrames = 8; // 1.6 seconds at 200ms chunks
    this.minSpeechFrames = 3; // 600ms minimum speech
    this.speechFrames = 0;
    this.isSpeaking = false;
    this.energyHistory = [];
  }

  processChunk(audioBuffer) {
    const energy = this.calculateEnergy(audioBuffer);
    this.energyHistory.push(energy);
    
    // Keep last 10 frames for adaptive threshold
    if (this.energyHistory.length > 10) {
      this.energyHistory.shift();
    }
    
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const isSpeechFrame = energy > this.energyThreshold && energy > avgEnergy * 1.5;
    
    if (isSpeechFrame) {
      this.speechFrames++;
      this.silenceFrames = 0;
      
      if (!this.isSpeaking && this.speechFrames >= this.minSpeechFrames) {
        this.isSpeaking = true;
        console.log('🎤 Speech started, energy:', energy.toFixed(4));
        return { type: 'speech_start', energy };
      }
      
      if (this.isSpeaking) {
        return { type: 'speech_continue', energy };
      }
    } else {
      this.speechFrames = 0;
      
      if (this.isSpeaking) {
        this.silenceFrames++;
        
        if (this.silenceFrames >= this.maxSilenceFrames) {
          this.isSpeaking = false;
          this.silenceFrames = 0;
          console.log('🔇 Speech ended after', this.maxSilenceFrames, 'silence frames');
          return { type: 'speech_end', energy };
        }
        
        return { type: 'speech_pause', energy };
      }
    }
    
    return { type: 'silence', energy };
  }

  calculateEnergy(audioBuffer) {
    try {
      const int16Array = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 2);
      let sum = 0;
      
      for (let i = 0; i < int16Array.length; i++) {
        sum += Math.abs(int16Array[i]);
      }
      
      return sum / int16Array.length / 32768;
    } catch (error) {
      return 0;
    }
  }

  reset() {
    this.silenceFrames = 0;
    this.speechFrames = 0;
    this.isSpeaking = false;
    this.energyHistory = [];
  }
}

module.exports = VoiceActivityDetector;