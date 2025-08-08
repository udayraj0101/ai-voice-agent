// index.js (node example)

const { createClient } = require("@deepgram/sdk");
const fs = require("fs");
require('dotenv').config({ path: '../../.env' });

const transcribeFile = async () => {
    // STEP 1: Create a Deepgram client using the API key
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // STEP 2: Call the transcribeFile method with the audio payload and options
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        // path to the audio file
        fs.readFileSync("audio_gettysburg.wav"),
        // STEP 3: Configure Deepgram options for audio analysis
        {
            model: "nova-3",
            smart_format: true,
        }
    );

    if (error) throw error;
    // STEP 4: Print the results
    if (!error) console.dir(result, { depth: null });
};

transcribeFile();
