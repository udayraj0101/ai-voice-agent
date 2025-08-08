const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const DeepgramClient = require('./deepgramClient');
const WhisperClient = require('./whisperClient');
const GPTClient = require('./gptClient');
const TTSClient = require('./ttsClient');

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
  
  const deepgramClient = new DeepgramClient();
  let isProcessing = false;
  let useDeepgram = true;
  let audioBuffer = [];
  
  // Try to start Deepgram
  deepgramClient.startRealTimeTranscription(async (transcript) => {
    if (isProcessing) return;
    isProcessing = true;
    
    const startTime = Date.now();
    console.log('Processing transcript:', transcript);
    
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
        console.log('Total latency:', totalLatency + 'ms');
        console.log('Breakdown - GPT:', gptLatency + 'ms, TTS:', ttsLatency + 'ms');
      });
      
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      isProcessing = false;
    }
  });
  
  // Set fallback after delay if Deepgram doesn't connect
  setTimeout(() => {
    if (!deepgramClient.isConnected) {
      console.log('Deepgram failed, using Whisper fallback');
      useDeepgram = false;
    }
  }, 3000);
  
  let speechDetected = false;
  let silenceCount = 0;
  
  function detectSpeech(audioData) {
    try {
      const int16Array = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);
      let sum = 0;
      for (let i = 0; i < int16Array.length; i++) {
        sum += Math.abs(int16Array[i]);
      }
      const energy = sum / int16Array.length / 32768;
      return energy > 0.02;
    } catch (error) {
      return false;
    }
  }
  
  async function processWithWhisper() {
    if (isProcessing || audioBuffer.length === 0) return;
    isProcessing = true;
    
    const startTime = Date.now();
    console.log('Processing with Whisper fallback...');
    
    try {
      const combinedBuffer = Buffer.concat(audioBuffer);
      audioBuffer = [];
      speechDetected = false;
      silenceCount = 0;
      
      const transcript = await whisperClient.transcribe(combinedBuffer);
      
      // Filter out garbage transcripts
      if (transcript && 
          transcript.length > 5 && 
          transcript.length < 200 &&
          !transcript.includes('अपर अपर') &&
          !transcript.includes('करते हैं करते हैं') &&
          !transcript.match(/(.{1,10})\1{3,}/)) { // Repeated patterns
        
        console.log('Transcript:', transcript);
        
        const response = await gptClient.chat(transcript);
        console.log('GPT Response:', response);
        
        await ttsClient.streamSpeech(response, (audioChunk) => {
          ws.send(JSON.stringify({
            type: 'audio_chunk',
            data: audioChunk.toString('base64')
          }));
          
          const totalLatency = Date.now() - startTime;
          console.log('Total latency (Whisper):', totalLatency + 'ms');
        });
      } else {
        console.log('Filtered out garbage transcript:', transcript?.substring(0, 50));
      }
    } catch (error) {
      console.error('Whisper processing error:', error);
    } finally {
      isProcessing = false;
    }
  }
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'audio') {
        const audioData = Buffer.from(message.data, 'base64');
        
        if (useDeepgram) {
          // Send to Deepgram
          deepgramClient.sendAudio(audioData);
        } else {
          // Use Whisper fallback with proper speech detection
          const isSpeech = detectSpeech(audioData);
          
          if (isSpeech) {
            if (!speechDetected) {
              console.log('Speech detected (Whisper mode)');
              speechDetected = true;
            }
            silenceCount = 0;
            audioBuffer.push(audioData);
          } else if (speechDetected) {
            silenceCount++;
            audioBuffer.push(audioData);
            
            // Process after 2 chunks of silence and minimum 6 chunks total
            if (silenceCount >= 2 && audioBuffer.length >= 6) {
              console.log('Silence detected, processing...');
              processWithWhisper();
            }
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
    deepgramClient.close();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Deepgram server running on port ${PORT}`);
});