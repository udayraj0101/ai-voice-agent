class VoiceAgent {
    constructor() {
        this.ws = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.isRecording = false;
        this.audioChunks = [];
        
        this.initElements();
        this.initWebSocket();
        this.initAudioVisualizer();
    }

    initElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.status = document.getElementById('status');
        this.conversation = document.getElementById('conversation');
        this.visualizer = document.getElementById('visualizer');
        this.canvas = this.visualizer.getContext('2d');

        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }

    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);

        this.ws.onopen = () => {
            this.updateStatus('Connected', 'ready');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.type === 'audio_chunk') {
                this.playAudioChunk(message.data);
            } else if (message.type === 'error') {
                this.addMessage('system', `Error: ${message.message}`);
            }
        };

        this.ws.onclose = () => {
            this.updateStatus('Disconnected', 'error');
        };
    }

    initAudioVisualizer() {
        this.canvas.fillStyle = '#667eea';
        this.canvas.fillRect(0, 0, 400, 100);
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });

            this.audioContext = new AudioContext({ sampleRate: 16000 });
            const source = this.audioContext.createMediaStreamSource(stream);
            
            // Audio worklet for real-time processing
            await this.audioContext.audioWorklet.addModule(this.createAudioWorklet());
            const processor = new AudioWorkletNode(this.audioContext, 'audio-processor');
            
            source.connect(processor);
            processor.connect(this.audioContext.destination);

            processor.port.onmessage = (event) => {
                if (event.data.type === 'audio') {
                    this.sendAudioChunk(event.data.buffer);
                    this.visualizeAudio(event.data.buffer);
                }
            };

            this.isRecording = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.updateStatus('Listening...', 'listening');

        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateStatus('Microphone access denied', 'error');
        }
    }

    stopRecording() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // Send stop signal to trigger processing
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'stop_recording' }));
        }
        
        this.isRecording = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('Processing...', 'processing');
    }

    createAudioWorklet() {
        const workletCode = `
            class AudioProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.bufferSize = 3200; // 200ms at 16kHz
                    this.buffer = new Float32Array(this.bufferSize);
                    this.bufferIndex = 0;
                }

                process(inputs) {
                    const input = inputs[0];
                    if (input.length > 0) {
                        const channelData = input[0];
                        
                        for (let i = 0; i < channelData.length; i++) {
                            this.buffer[this.bufferIndex++] = channelData[i];
                            
                            if (this.bufferIndex >= this.bufferSize) {
                                this.port.postMessage({
                                    type: 'audio',
                                    buffer: Array.from(this.buffer)
                                });
                                this.bufferIndex = 0;
                            }
                        }
                    }
                    return true;
                }
            }
            registerProcessor('audio-processor', AudioProcessor);
        `;
        
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }

    sendAudioChunk(audioBuffer) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Convert float32 to int16
            const int16Buffer = new Int16Array(audioBuffer.length);
            for (let i = 0; i < audioBuffer.length; i++) {
                int16Buffer[i] = Math.max(-32768, Math.min(32767, audioBuffer[i] * 32768));
            }
            
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(int16Buffer.buffer)));
            
            this.ws.send(JSON.stringify({
                type: 'audio',
                data: base64Audio
            }));
        }
    }

    playAudioChunk(base64Audio) {
        try {
            // Create audio element and play directly from base64
            const audio = new Audio();
            audio.src = `data:audio/wav;base64,${base64Audio}`;
            audio.play().catch(error => {
                console.error('Audio play failed:', error);
            });
            
            console.log('🔊 Playing audio chunk');
            
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    }

    visualizeAudio(audioBuffer) {
        this.canvas.clearRect(0, 0, 400, 100);
        this.canvas.fillStyle = '#667eea';
        
        const barWidth = 400 / audioBuffer.length;
        for (let i = 0; i < audioBuffer.length; i += 10) {
            const barHeight = Math.abs(audioBuffer[i]) * 100;
            this.canvas.fillRect(i * barWidth, 50 - barHeight/2, barWidth, barHeight);
        }
    }

    updateStatus(text, type = 'ready') {
        this.status.textContent = text;
        this.status.className = `status ${type}`;
    }

    addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.innerHTML = `<span class="label">${sender.charAt(0).toUpperCase() + sender.slice(1)}:</span><span class="text">${text}</span>`;
        
        this.conversation.appendChild(messageDiv);
        this.conversation.scrollTop = this.conversation.scrollHeight;
    }
}

// Initialize the voice agent when page loads
document.addEventListener('DOMContentLoaded', () => {
    new VoiceAgent();
});