const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const WhisperClient = require('./whisperClient');
const GPTClient = require('./gptClient');
const TTSClient = require('./ttsClient');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
  
  let audioBuffer = [];
  let silenceCount = 0;
  let isProcessing = false;
  let speechDetected = false;
  
  async function processAudio() {
    if (isProcessing || audioBuffer.length === 0) return;
    isProcessing = true;
    
    const startTime = Date.now();
    console.log('🚀 Processing started...');
    
    try {
      const combinedBuffer = Buffer.concat(audioBuffer);
      
      // Ultra-aggressive compression for speed
      const compressedAudio = ultraCompress(combinedBuffer);
      
      audioBuffer = [];
      speechDetected = false;
      silenceCount = 0;
      
      // Optimized Whisper
      const whisperStart = Date.now();
      const transcript = await whisperClient.transcribe(compressedAudio);
      const whisperLatency = Date.now() - whisperStart;
      
      if (transcript && transcript.length > 3 && !isGarbage(transcript)) {
        console.log('Transcript:', transcript);
        
        // Fast GPT
        const gptStart = Date.now();
        const response = await gptClient.chat(transcript);
        const gptLatency = Date.now() - gptStart;
        console.log('GPT Response:', response);
        
        // Fast TTS
        const ttsStart = Date.now();
        await ttsClient.streamSpeech(response, (audioChunk) => {
          const ttsLatency = Date.now() - ttsStart;
          
          ws.send(JSON.stringify({
            type: 'audio_chunk',
            data: audioChunk.toString('base64')
          }));
          
          const totalLatency = Date.now() - startTime;
          console.log('⚡ Total latency:', totalLatency + 'ms');
          console.log('Breakdown - Whisper:', whisperLatency + 'ms, GPT:', gptLatency + 'ms, TTS:', ttsLatency + 'ms');
        });
      }
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      isProcessing = false;
    }
  }
  
  function ultraCompress(buffer) {
    try {
      // 80% compression for maximum speed
      const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
      const compressed = new Int16Array(Math.floor(int16Array.length / 5));
      
      for (let i = 0; i < compressed.length; i++) {
        compressed[i] = int16Array[i * 5];
      }
      
      return Buffer.from(compressed.buffer);
    } catch (error) {
      return buffer;
    }
  }
  
  function isGarbage(text) {
    return text.includes('अपने अपने') || 
           text.includes('करते हैं करते हैं') ||
           text.match(/(.{1,10})\1{3,}/) ||
           text.length > 150;
  }
  
  function detectSpeech(audioData) {
    try {
      const buffer = Buffer.from(audioData, 'base64');
      const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
      
      let sum = 0;
      for (let i = 0; i < int16Array.length; i++) {
        sum += Math.abs(int16Array[i]);
      }
      
      const energy = sum / int16Array.length / 32768;
      return energy > 0.025;
    } catch (error) {
      return false;
    }
  }
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'audio') {
        const isSpeech = detectSpeech(message.data);
        
        if (isSpeech) {
          if (!speechDetected) {
            console.log('🎤 Speech detected');
            speechDetected = true;
          }
          silenceCount = 0;
          audioBuffer.push(Buffer.from(message.data, 'base64'));
        } else if (speechDetected) {
          silenceCount++;
          audioBuffer.push(Buffer.from(message.data, 'base64'));
          
          // Process after 2 silence chunks, minimum 3 audio chunks
          if (silenceCount >= 2 && audioBuffer.length >= 3) {
            console.log('🔇 Silence detected, processing...');
            processAudio();
          }
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`⚡ Hybrid server running on port ${PORT}`);
});