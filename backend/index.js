const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

// Set FFmpeg path for OpenAI library
process.env.FFMPEG_PATH = 'D:\\ffmpeg-7.1.1-full_build\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe';
process.env.PATH = process.env.PATH + ';D:\\ffmpeg-7.1.1-full_build\\ffmpeg-7.1.1-full_build\\bin';

const WhisperClient = require('./whisperClient');
const GPTClient = require('./gptClient');
const TTSClient = require('./ttsClient');
const AudioProcessor = require('./audioProcessor');
const BufferManager = require('./utils/bufferManager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize clients
const whisperClient = new WhisperClient();
const gptClient = new GPTClient();
const ttsClient = new TTSClient();
const audioProcessor = new AudioProcessor();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend'));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.render('index');
});

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  const bufferManager = new BufferManager();
  let isProcessing = false;
  
  async function processAudio(audioBuffer) {
    if (isProcessing) return;
    isProcessing = true;
    
    const startTime = Date.now();
    console.log('\nStarting processing pipeline...');
    
    try {
      // Skip audio processing for speed
      const processedAudio = audioBuffer;
      const audioLatency = 0;
      console.log('Audio processing: SKIPPED');
      
      // Step 2: Whisper Transcription
      const whisperStart = Date.now();
      const transcript = await whisperClient.transcribe(processedAudio);
      const whisperLatency = Date.now() - whisperStart;
      console.log('Whisper transcription:', whisperLatency + 'ms');
      
      if (transcript) {
        console.log('Transcript:', transcript);
        
        // Step 3: GPT Response
        const gptStart = Date.now();
        const response = await gptClient.chat(transcript);
        const gptLatency = Date.now() - gptStart;
        console.log('GPT response:', gptLatency + 'ms');
        console.log('GPT Response:', response);
        
        // Step 4: TTS Conversion
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
        console.log('Total pipeline latency:', totalLatency + 'ms');
        console.log('Breakdown - Audio:', audioLatency + 'ms, Whisper:', whisperLatency + 'ms, GPT:', gptLatency + 'ms');
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
        // Use BufferManager for intelligent audio processing
        const readyBuffer = bufferManager.addChunk(message.data);
        
        if (readyBuffer) {
          processAudio(readyBuffer);
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
  console.log(`Server running on port ${PORT}`);
});