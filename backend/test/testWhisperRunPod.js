const axios = require('axios');
const fs = require('fs');
const OpenAI = require('openai');
require('dotenv').config({ path: '../../.env' });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const API_URL = 'https://api.runpod.ai/v2/8bueq9cenmedud';
const API_KEY = process.env.RUNPOD_API_KEY;
const FILE_PATH = 'audio_gettysburg.wav';

const models = ['tiny', 'tiny', 'base', 'medium', 'large-v2'];

async function testModel(model, audio_base64) {
    console.log(`\n🧪 Testing model: ${model}`);
    const start = Date.now();

    try {
        const res = await axios.post(`${API_URL}/runsync`, {
            input: {
                audio_base64,
                model,
                language: 'en'
            }
        }, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const end = Date.now();
        const roundTrip = end - start;
        const execTime = res.data.executionTime;

        console.log(`✔️ Transcription: ${res.data.output.transcription?.slice(0, 80)}...`);
        console.log(`⏱️ RunPod executionTime: ${execTime} ms`);
        console.log(`⏱️ Total round-trip time: ${roundTrip} ms`);
    } catch (err) {
        console.error(`❌ Model ${model} failed:`, err.response?.data || err.message);
    }
}

async function testOpenAIWhisper() {
    console.log(`\n🧪 Testing OpenAI Whisper API`);
    const start = Date.now();

    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(FILE_PATH),
            model: 'whisper-1',
            response_format: 'text',
            temperature: 0
        });

        const end = Date.now();
        const roundTrip = end - start;

        console.log(`✔️ Transcription: ${transcription.slice(0, 80)}...`);
        console.log(`⏱️ OpenAI Whisper round-trip time: ${roundTrip} ms`);
    } catch (err) {
        console.error(`❌ OpenAI Whisper failed:`, err.message);
    }
}

async function main() {
    const audioBuffer = fs.readFileSync(FILE_PATH);
    const audio_base64 = audioBuffer.toString('base64');

    // Test OpenAI Whisper first
    await testOpenAIWhisper();

    console.log('\n' + '='.repeat(50));
    console.log('🚀 RunPod Faster-Whisper Models:');

    // Test RunPod models
    for (const model of models) {
        await testModel(model, audio_base64);
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 LATENCY COMPARISON COMPLETE');
}

main();