const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const DeepgramFast = require('./deepgramFast');
const PremiumGPTClient = require('./premiumGptClient');
const TTSClient = require('./ttsClient');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize clients
const whisperClient = new DeepgramFast();
const gptClient = new PremiumGPTClient();
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
    
    const overallStart = Date.now();
    console.log('\n🚀 === PROCESSING STARTED ===');
    console.log('📊 Audio buffer size:', audioBuffer.length, 'chunks');
    
    try {
      // Step 1: Audio preparation
      const prepStart = Date.now();
      const combinedBuffer = Buffer.concat(audioBuffer);
      const compressedAudio = compressAudio(combinedBuffer);
      const prepLatency = Date.now() - prepStart;
      console.log('⏱️  STEP 1 - Audio prep:', prepLatency + 'ms');
      
      // Reset buffer immediately
      audioBuffer = [];
      speechDetected = false;
      silenceCount = 0;
      
      // Step 2: STT (Deepgram/Whisper)
      const sttStart = Date.now();
      console.log('🎤 STEP 2 - Starting STT...');
      const transcript = await whisperClient.transcribe(compressedAudio);
      const sttLatency = Date.now() - sttStart;
      console.log('⏱️  STEP 2 - STT completed:', sttLatency + 'ms');
      
      if (transcript && transcript.length > 3) {
        console.log('📝 Transcript:', transcript);
        
        // Step 3: GPT processing
        const gptStart = Date.now();
        console.log('🧠 STEP 3 - Starting GPT...');
        const response = await gptClient.chat(transcript);
        const gptLatency = Date.now() - gptStart;
        console.log('⏱️  STEP 3 - GPT completed:', gptLatency + 'ms');
        console.log('💬 GPT Response:', response.substring(0, 100) + '...');
        
        // Step 4: TTS conversion
        const ttsStart = Date.now();
        console.log('🔊 STEP 4 - Starting TTS...');
        await ttsClient.streamSpeech(response, (audioChunk) => {
          const ttsLatency = Date.now() - ttsStart;
          const totalLatency = Date.now() - overallStart;
          
          ws.send(JSON.stringify({
            type: 'audio_chunk',
            data: audioChunk.toString('base64')
          }));
          
          console.log('⏱️  STEP 4 - TTS completed:', ttsLatency + 'ms');
          console.log('\n⚡ === TOTAL LATENCY BREAKDOWN ===');
          console.log('📊 Audio prep:', prepLatency + 'ms (' + ((prepLatency/totalLatency)*100).toFixed(1) + '%)');
          console.log('🎤 STT:', sttLatency + 'ms (' + ((sttLatency/totalLatency)*100).toFixed(1) + '%)');
          console.log('🧠 GPT:', gptLatency + 'ms (' + ((gptLatency/totalLatency)*100).toFixed(1) + '%)');
          console.log('🔊 TTS:', ttsLatency + 'ms (' + ((ttsLatency/totalLatency)*100).toFixed(1) + '%)');
          console.log('🏁 TOTAL:', totalLatency + 'ms');
          console.log('='.repeat(40) + '\n');
        });
      } else {
        console.log('❌ No valid transcript received');
      }
    } catch (error) {
      console.error('❌ Processing error:', error);
    } finally {
      isProcessing = false;
    }
  }
  
  function compressAudio(buffer) {
    try {
      // Aggressive 75% compression for much faster Whisper
      const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
      const compressed = new Int16Array(Math.floor(int16Array.length / 4));
      
      for (let i = 0; i < compressed.length; i++) {
        compressed[i] = int16Array[i * 4]; // Take every 4th sample
      }
      
      console.log('Audio compressed:', buffer.length, '->', Buffer.from(compressed.buffer).length, 'bytes');
      return Buffer.from(compressed.buffer);
    } catch (error) {
      return buffer;
    }
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
      return energy > 0.02; // Speech threshold
    } catch (error) {
      return false;
    }
  }
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'audio') {
        const isSpeech = detectSpeech(message.data);
        
        if (isSpeech) {
          if (!speechDetected) {
            console.log('Speech detected');
            speechDetected = true;
          }
          silenceCount = 0;
          audioBuffer.push(Buffer.from(message.data, 'base64'));
        } else if (speechDetected) {
          silenceCount++;
          audioBuffer.push(Buffer.from(message.data, 'base64'));
          
          // Process after 2 chunks of silence
          if (silenceCount >= 2 && audioBuffer.length >= 4) {
            console.log('Silence detected, processing...');
            processAudio();
          }
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Fast server running on port ${PORT}`);
});