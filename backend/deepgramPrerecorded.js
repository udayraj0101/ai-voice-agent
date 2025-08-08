const { createClient } = require('@deepgram/sdk');
const fs = require('fs');
const path = require('path');

class DeepgramPrerecorded {
  constructor() {
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  }

  async transcribe(audioBuffer) {
    try {
      // Save audio to temp file
      const tempPath = path.join(__dirname, 'temp_audio.wav');
      fs.writeFileSync(tempPath, audioBuffer);

      // Transcribe using prerecorded API
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        fs.readFileSync(tempPath),
        {
          model: 'nova-3',
          language: 'hi-en',
          smart_format: true,
          punctuate: true,
          diarize: false
        }
      );

      // Clean up temp file
      fs.unlinkSync(tempPath);

      if (error) {
        console.error('Deepgram error:', error);
        return null;
      }

      const transcript = result.results.channels[0].alternatives[0].transcript;
      console.log('🎯 Deepgram transcript:', transcript);
      return transcript.trim();

    } catch (error) {
      console.error('Deepgram transcription error:', error);
      return null;
    }
  }
}

module.exports = DeepgramPrerecorded;