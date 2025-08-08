const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

class DeepgramClient {
  constructor() {
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    this.connection = null;
    this.isConnected = false;
  }

  startRealTimeTranscription(onTranscript) {
    try {
      this.connection = this.deepgram.listen.live({
        model: 'nova-2',
        language: 'hi-en',
        smart_format: true,
        interim_results: false,
        endpointing: 300,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1
      });

      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened');
        this.isConnected = true;
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel.alternatives[0]?.transcript;
        if (transcript && transcript.trim()) {
          console.log('Deepgram transcript:', transcript);
          onTranscript(transcript);
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram error:', error.message);
        this.isConnected = false;
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
        this.isConnected = false;
      });

      // Simple connection check without timeout
      setTimeout(() => {
        if (!this.isConnected) {
          console.log('Deepgram connection may have failed');
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to start Deepgram:', error);
    }
  }

  sendAudio(audioBuffer) {
    if (this.connection && this.isConnected) {
      this.connection.send(audioBuffer);
    }
  }

  close() {
    if (this.connection) {
      this.connection.finish();
      this.isConnected = false;
    }
  }
}

module.exports = DeepgramClient;