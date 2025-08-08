const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const WhisperClient = require('./whisperClient');
const GPTClient = require('./gptClient');
const TTSClient = require('./ttsClient');
const BufferManagerFast = require('./utils/bufferManagerFast');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize clients
const whisperClient = new WhisperClient();
const gptClient = new GPTClient();
const ttsClient = new TTSClient();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend'));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.render('index');
});

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  const bufferManager = new BufferManagerFast();
  let isProcessing = false;
  
  async function processAudio(audioBuffer) {
    if (isProcessing) return;
    isProcessing = true;
    
    const startTime = Date.now();
    console.log('Processing started...');
    
    try {
      // Skip audio processing for speed
      const processedAudio = audioBuffer;
      
      // Whisper transcription
      const whisperStart = Date.now();
      const transcript = await whisperClient.transcribe(processedAudio);
      const whisperLatency = Date.now() - whisperStart;
      
      if (transcript) {
        console.log('Transcript:', transcript);
        
        // GPT response
        const gptStart = Date.now();
        const response = await gptClient.chat(transcript);
        const gptLatency = Date.now() - gptStart;
        console.log('GPT Response:', response);
        
        // TTS conversion
        const ttsStart = Date.now();
        await ttsClient.streamSpeech(response, (audioChunk) => {
          const ttsLatency = Date.now() - ttsStart;
          console.log('TTS conversion:', ttsLatency + 'ms');
          
          ws.send(JSON.stringify({
            type: 'audio_chunk',
            data: audioChunk.toString('base64')
          }));
        });
        
        const totalLatency = Date.now() - startTime;
        console.log('Total latency:', totalLatency + 'ms');
        console.log('Breakdown - Whisper:', whisperLatency + 'ms, GPT:', gptLatency + 'ms');
      }
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      isProcessing = false;
    }
  }
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'audio') {
        const result = bufferManager.addChunk(message.data);
        
        if (result && result.type === 'complete') {
          processAudio(result.buffer);
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    bufferManager.clear();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Working server running on port ${PORT}`);
});