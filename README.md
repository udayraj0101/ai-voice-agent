# AI Voice Agent

Real-time AI voice assistant using **Deepgram STT**, **GPT-4o Mini**, and **Sarvam AI TTS** with optimized streaming.

## Current Architecture

- **Speech-to-Text**: Deepgram Nova-2 (fast, accurate Hindi-English)
- **AI Chat**: GPT-4o Mini with premium context (no token limits)
- **Text-to-Speech**: Sarvam AI real-time TTS
- **WebSocket Communication**: 200ms audio chunks with VAD

## 🚀 ACTIVE FILES (Current Working System)

### Backend Core:
- `backend/indexFast.js` - **MAIN SERVER** (current entry point)
- `backend/deepgramFast.js` - **STT CLIENT** (Deepgram Nova-2)
- `backend/premiumGptClient.js` - **GPT CLIENT** (Premium context)
- `backend/ttsClient.js` - **TTS CLIENT** (Sarvam AI)

### Frontend:
- `frontend/index.ejs` - Main HTML interface
- `frontend/script.js` - WebSocket audio handling
- `frontend/style.css` - UI styling

### Configuration:
- `.env` - API keys configuration
- `package.json` - Dependencies and scripts

## 🗂️ Test Files (For Reference/Testing):
- `backend/test/testWhisperRunPod.js` - Latency comparison
- `backend/test/testDeepGramTts.js` - Deepgram API testing

## 🗑️ Unused Files (Can be deleted):
- `backend/indexOptimized.js` - Old optimized version
- `backend/indexRunPod.js` - RunPod version (poor quality)
- `backend/indexDeepgram.js` - Old Deepgram streaming
- `backend/deepgramWorking.js` - Deepgram streaming attempt
- `backend/runpodWhisperClient.js` - RunPod client
- `backend/whisperClient.js` - OpenAI Whisper (slower)
- `backend/gptClient.js` - Basic GPT client
- `DELETE_THESE_FILES.md` - Cleanup instructions

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Edit .env file
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   SARVAM_API_KEY=your_sarvam_api_key_here
   PORT=4500
   ```

3. **Run the Application**
   ```bash
   npm start
   ```

4. **Access the App**
   Open http://localhost:4500 in your browser

## API Keys Required

- **Deepgram API Key**: Get from https://console.deepgram.com/
- **OpenAI API Key**: Get from https://platform.openai.com/api-keys
- **Sarvam AI API Key**: Get from https://www.sarvam.ai/

## Performance Metrics

- **STT Latency**: ~2-3s (Deepgram vs 7-9s Whisper)
- **GPT Latency**: ~2-3s (Premium context)
- **TTS Latency**: ~2-3s (Sarvam AI)
- **Total**: ~6-9s end-to-end

## Browser Requirements

- Chrome/Edge (recommended for Web Audio API)
- Microphone permissions required
- HTTPS for production deployment

## 🚀 Deploy to Render

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/ai-voice-agent.git
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to https://render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Node Version**: 18+

3. **Add Environment Variables**
   ```
   DEEPGRAM_API_KEY=your_deepgram_key
   OPENAI_API_KEY=your_openai_key
   SARVAM_API_KEY=your_sarvam_key
   PORT=4500
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Access your app at: `https://your-app-name.onrender.com`

**Note**: Render provides HTTPS by default, which is required for microphone access.