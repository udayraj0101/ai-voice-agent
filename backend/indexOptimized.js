const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const VoiceActivityDetector = require('./voiceActivityDetector');
const AudioProcessor = require('./audioProcessor');
const WhisperClient = require('./whisperClient');
const TextBufferManager = require('./textBufferManager');
const PremiumGPTClient = require('./premiumGptClient');
const TTSClient = require('./ttsClient');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend'));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.render('index');
});

wss.on('connection', (ws) => {
  console.log('🔗 Client connected');
  
  const vad = new VoiceActivityDetector();
  const audioProcessor = new AudioProcessor();
  const whisperClient = new WhisperClient();
  const textBuffer = new TextBufferManager();
  const gptClient = new PremiumGPTClient();
  const ttsClient = new TTSClient();
  
  let audioChunks = [];
  let isProcessing = false;
  
  async function processCompleteAudio() {
    if (isProcessing || audioChunks.length === 0) return;
    isProcessing = true;
    
    const startTime = Date.now();
    console.log('🚀 Processing complete audio...');
    
    try {
      // Combine audio without processing to preserve quality
      const combinedAudio = Buffer.concat(audioChunks);
      const processedAudio = combinedAudio; // No processing - send raw audio
      
      // Clear chunks immediately
      audioChunks = [];
      
      // Transcribe with Whisper
      const whisperStart = Date.now();
      const transcript = await whisperClient.transcribe(processedAudio);
      const whisperLatency = Date.now() - whisperStart;
      
      if (transcript && transcript.length > 2) {
        console.log('📝 Transcript:', transcript);
        
        // Get premium GPT response
        const gptStart = Date.now();
        const response = await gptClient.chat(transcript);
        const gptLatency = Date.now() - gptStart;
        
        // Convert to speech
        const ttsStart = Date.now();
        await ttsClient.streamSpeech(response, (audioChunk) => {
          const ttsLatency = Date.now() - ttsStart;
          
          ws.send(JSON.stringify({
            type: 'audio_chunk',
            data: audioChunk.toString('base64')
          }));
          
          const totalLatency = Date.now() - startTime;
          console.log('⚡ Total latency:', totalLatency + 'ms');
          console.log('📊 Breakdown - Whisper:', whisperLatency + 'ms, GPT:', gptLatency + 'ms, TTS:', ttsLatency + 'ms');
        });
      }
    } catch (error) {
      console.error('❌ Processing error:', error);
    } finally {
      isProcessing = false;
      vad.reset();
    }
  }
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'audio_chunk') {
        const audioBuffer = Buffer.from(message.data, 'base64');
        const vadResult = vad.processChunk(audioBuffer);
        
        switch (vadResult.type) {
          case 'speech_start':
          case 'speech_continue':
          case 'speech_pause':
            audioChunks.push(audioBuffer);
            break;
            
          case 'speech_end':
            audioChunks.push(audioBuffer);
            console.log('🎯 Speech complete, processing...');
            processCompleteAudio();
            break;
            
          case 'silence':
            // Do nothing during silence
            break;
        }
      }
    } catch (error) {
      console.error('❌ WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Optimized server running on port ${PORT}`);
});