const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const GPTClient = require('./gptClient');
const TTSClient = require('./ttsClient');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
  
  let isProcessing = false;
  let deepgram, connection;
  
  try {
    deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      smart_format: true,
      interim_results: false,
      endpointing: 300
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('✅ Deepgram connected');
    });

    connection.on(LiveTranscriptionEvents.Transcript, async (data) => {
      if (isProcessing) return;
      
      const transcript = data.channel.alternatives[0]?.transcript;
      if (!transcript || transcript.length < 3) return;
      
      isProcessing = true;
      const startTime = Date.now();
      
      console.log('Transcript:', transcript);
      
      try {
        // GPT response
        const gptStart = Date.now();
        const response = await gptClient.chat(transcript);
        const gptLatency = Date.now() - gptStart;
        console.log('GPT Response:', response);
        
        // TTS conversion
        const ttsStart = Date.now();
        await ttsClient.streamSpeech(response, (audioChunk) => {
          const ttsLatency = Date.now() - ttsStart;
          
          ws.send(JSON.stringify({
            type: 'audio_chunk',
            data: audioChunk.toString('base64')
          }));
          
          const totalLatency = Date.now() - startTime;
          console.log('🚀 Total latency:', totalLatency + 'ms');
          console.log('Breakdown - GPT:', gptLatency + 'ms, TTS:', ttsLatency + 'ms');
        });
        
      } catch (error) {
        console.error('Processing error:', error);
      } finally {
        isProcessing = false;
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('❌ Deepgram error:', error.message);
    });
    
    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('🔴 Deepgram connection closed');
    });
    
    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log('📊 Deepgram metadata:', data);
    });

  } catch (error) {
    console.error('❌ Failed to initialize Deepgram:', error.message);
  }
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'audio' && connection) {
        const audioBuffer = Buffer.from(message.data, 'base64');
        
        // Convert to PCM format for Deepgram
        const pcmBuffer = convertToPCM(audioBuffer);
        connection.send(pcmBuffer);
        
        // Debug: Log audio data being sent
        if (Math.random() < 0.1) { // Log 10% of chunks
          console.log('📡 Sending audio chunk:', pcmBuffer.length, 'bytes');
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });
  
  function convertToPCM(buffer) {
    try {
      // Simple conversion - assume input is already close to PCM
      const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
      return Buffer.from(int16Array.buffer);
    } catch (error) {
      console.log('PCM conversion failed, using original');
      return buffer;
    }
  }

  ws.on('close', () => {
    console.log('Client disconnected');
    if (connection) {
      connection.finish();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Deepgram server running on port ${PORT}`);
});