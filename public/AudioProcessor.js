class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this._bufferSize = 2048;
      this._buffer = new Int16Array(this._bufferSize);
      this._bufferIndex = 0;
    }
  
    process(inputs) {
      const input = inputs[0];
      if (!input || !input[0]) return true;
  
      const channelData = input[0]; // Mono input
      
      // Calculate real-time volume for the Ocean Waves
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        const sample = channelData[i];
        
        // Convert Float32 (-1.0 to 1.0) to Int16 for Gemini
        const pcmSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        
        this._buffer[this._bufferIndex++] = pcmSample;
        sum += sample * sample;
  
        // When buffer is full, send it to the main thread (VoiceAdvisor.jsx)
        if (this._bufferIndex >= this._bufferSize) {
          this.port.postMessage({
            pcm: this._buffer,
            volume: Math.sqrt(sum / channelData.length) // Root Mean Square for volume
          });
          this._bufferIndex = 0;
          sum = 0;
        }
      }
  
      return true;
    }
  }
  
  registerProcessor('audio-processor', AudioProcessor);