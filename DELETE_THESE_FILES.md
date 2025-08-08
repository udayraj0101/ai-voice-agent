# Files to Delete (Unnecessary/Old)

## Backend Files - DELETE THESE:
- `backend/indexFast.js` - Old fast version
- `backend/indexRunPod.js` - RunPod version (poor quality)
- `backend/indexDeepgram.js` - Deepgram version (connection issues)
- `backend/deepgramWorking.js` - Deepgram working version
- `backend/deepgramClient.js` - Deepgram client
- `backend/runpodWhisperClient.js` - RunPod client
- `backend/gptClientFast.js` - Old fast GPT client
- `backend/ttsClientFast.js` - Old fast TTS client
- `backend/audioProcessorFast.js` - Old audio processor
- `backend/utils/bufferManagerFast.js` - Old buffer manager
- `backend/responseCache.js` - Response cache (not needed)

## Test Files - KEEP FOR REFERENCE:
- `backend/test/testWhisperRunPod.js` - Keep for latency testing

## Current Active Files:
- `backend/indexOptimized.js` - MAIN SERVER
- `backend/voiceActivityDetector.js` - Real-time VAD
- `backend/audioProcessor.js` - Audio enhancement
- `backend/textBufferManager.js` - Text accumulation
- `backend/premiumGptClient.js` - High-quality GPT
- `backend/whisperClient.js` - OpenAI Whisper
- `backend/ttsClient.js` - TTS client
- `backend/gptClient.js` - Keep as backup

## To Delete Later:
Run this command to clean up:
```bash
rm backend/indexFast.js backend/indexRunPod.js backend/indexDeepgram.js backend/deepgramWorking.js backend/deepgramClient.js backend/runpodWhisperClient.js backend/gptClientFast.js backend/ttsClientFast.js backend/audioProcessorFast.js backend/utils/bufferManagerFast.js backend/responseCache.js
```