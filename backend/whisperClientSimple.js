class WhisperClientSimple {
  async transcribe(audioBuffer) {
    // Bypass Whisper for testing - return mock transcript
    console.log('📝 Mock transcription: received audio buffer of', audioBuffer.length, 'bytes');
    return "Hello, this is a test message from the voice agent.";
  }
}

module.exports = WhisperClientSimple;