
export class AudioEngine {
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  
  // Processing Nodes
  private preAmpGain: GainNode | null = null;
  
  // SPATIAL / 8D NODES
  private panner: StereoPannerNode | null = null;
  private panOscillator: OscillatorNode | null = null; 
  private panGain: GainNode | null = null; 
  
  // EQ
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  
  // Effects
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  
  // ECHO
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWetGain: GainNode | null = null; 
  private delayFilter: BiquadFilterNode | null = null;

  // MAX POWER STAGE (Distortion + Saturation)
  private distortionNode: WaveShaperNode | null = null;
  private ultraMaxPreGain: GainNode | null = null;

  // DYNAMICS & FINAL OUTPUT
  private limiter: DynamicsCompressorNode | null = null;
  private postLimiterBoost: GainNode | null = null; // The "Nuclear" Option
  private analyser: AnalyserNode | null = null;
  
  public mediaElement: HTMLMediaElement | null = null;
  private static sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  
  // State
  private isDolbyEnabled: boolean = false;
  private userBassLevel: number = 20.0; 

  private isEchoEnabled: boolean = false;
  private userEchoLevel: number = 20.0; 

  private isMaxModeEnabled: boolean = false;
  private userMaxLevel: number = 50.0; 

  private beatCallbacks: Set<() => void> = new Set();
  private lastBeatTime: number = 0;
  private beatThreshold: number = 0.5;
  private beatDecayRate: number = 0.95;
  private isRunning: boolean = false;
  private dataArray: Uint8Array | null = null;
  private isFadingOut: boolean = false;

  constructor() {
    this.detectBeat = this.detectBeat.bind(this);
  }

  public async init(element: HTMLMediaElement) {
    try {
        this.mediaElement = element;
        this.mediaElement.crossOrigin = "anonymous";
        this.mediaElement.volume = 1.0; 
        this.mediaElement.muted = false;

        if (!this.context) {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
                latencyHint: 'playback',
                sampleRate: 48000
            });
        }

        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        this.connectGraph();
        this.startAnalysis();
    } catch (e) {
        console.error("Audio Engine Init Failed:", e);
    }
  }

  // Helper: Create Soft Clipping Curve for "Max" Mode
  // This adds harmonics, making it sound LOUDER without just peaking the dB.
  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = i * 2 / n_samples - 1;
      // Sigmoid function for soft clipping
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createImpulseResponse(duration: number, decay: number, reverse: boolean): AudioBuffer | null {
      if(!this.context) return null;
      const sampleRate = this.context.sampleRate;
      const length = sampleRate * duration;
      const impulse = this.context.createBuffer(2, length, sampleRate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const n = reverse ? length - i : i;
        let alpha = (1 - n / length); 
        left[i] = (Math.random() * 2 - 1) * Math.pow(alpha, decay);
        right[i] = (Math.random() * 2 - 1) * Math.pow(alpha, decay);
      }
      return impulse;
  }

  private connectGraph() {
    if (!this.mediaElement || !this.context) return;

    try {
        if (AudioEngine.sourceMap.has(this.mediaElement)) {
            this.source = AudioEngine.sourceMap.get(this.mediaElement) || null;
        } else {
            this.source = this.context.createMediaElementSource(this.mediaElement);
            AudioEngine.sourceMap.set(this.mediaElement, this.source);
        }

        if (!this.source) return;

        try { this.source.disconnect(); } catch(e) {}
        if (this.analyser) try { this.analyser.disconnect(); } catch(e) {}

        // --- 1. INPUT STAGE ---
        this.preAmpGain = this.context.createGain();
        this.preAmpGain.gain.value = 1.0;

        // --- 2. 8D SPATIAL ENGINE (Dolby) ---
        this.panner = this.context.createStereoPanner();
        this.panner.pan.value = 0;
        
        // Use an LFO (Low Frequency Oscillator) to drive the Pan L <-> R
        this.panOscillator = this.context.createOscillator();
        this.panOscillator.type = 'sine';
        this.panOscillator.frequency.value = 0.08; // Slower, deeper rotation (approx 12s cycle)
        
        this.panGain = this.context.createGain(); 
        this.panGain.gain.value = 0; // Starts at 0 (Center), goes to 1 (Full 8D)
        
        this.panOscillator.connect(this.panGain);
        this.panGain.connect(this.panner.pan);
        this.panOscillator.start();

        // --- 3. EQ & TONE ---
        this.bassFilter = this.context.createBiquadFilter();
        this.bassFilter.type = 'lowshelf';
        this.bassFilter.frequency.value = 60; 
        this.bassFilter.gain.value = 0;

        this.midFilter = this.context.createBiquadFilter();
        this.midFilter.type = 'peaking';
        this.midFilter.frequency.value = 1000;
        this.midFilter.Q.value = 0.5;
        this.midFilter.gain.value = 0;

        this.trebleFilter = this.context.createBiquadFilter();
        this.trebleFilter.type = 'highshelf';
        this.trebleFilter.frequency.value = 8000;
        this.trebleFilter.gain.value = 0;

        // --- 4. EFFECTS LOOP ---
        // Echo
        this.delayNode = this.context.createDelay(1.0);
        this.delayNode.delayTime.value = 0.35; 
        this.delayFeedback = this.context.createGain();
        this.delayFeedback.gain.value = 0.0; 
        this.delayFilter = this.context.createBiquadFilter();
        this.delayFilter.type = 'lowpass';
        this.delayFilter.frequency.value = 1500; 
        this.delayWetGain = this.context.createGain();
        this.delayWetGain.gain.value = 0.0;

        this.delayNode.connect(this.delayFilter);
        this.delayFilter.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);

        // Reverb
        this.reverbNode = this.context.createConvolver();
        this.reverbNode.buffer = this.createImpulseResponse(2.5, 2.5, false); // Larger space for Dolby
        this.reverbGain = this.context.createGain();
        this.reverbGain.gain.value = 0; 

        // --- 5. "MAX POWER" SATURATION STAGE ---
        this.ultraMaxPreGain = this.context.createGain();
        this.ultraMaxPreGain.gain.value = 1.0;
        
        this.distortionNode = this.context.createWaveShaper();
        // Create a gentle saturation curve by default, will be boosted in M mode
        this.distortionNode.curve = this.makeDistortionCurve(0); 
        this.distortionNode.oversample = '4x'; // High quality processing

        // --- 6. DYNAMICS & OUTPUT BOOST ---
        this.limiter = this.context.createDynamicsCompressor();
        this.limiter.threshold.value = -0.5; // Allow signals closer to ceiling
        this.limiter.knee.value = 0; 
        this.limiter.ratio.value = 20.0; // Brickwall limiter
        this.limiter.attack.value = 0.001; 
        this.limiter.release.value = 0.1;

        // THE "NUCLEAR" GAIN STAGE (Post-Limiter)
        this.postLimiterBoost = this.context.createGain();
        this.postLimiterBoost.gain.value = 1.0;

        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 2048; 
        this.analyser.smoothingTimeConstant = 0.85;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // --- ROUTING GRAPH ---
        
        // Source -> PreAmp -> Panner (8D Movement happens here)
        this.source.connect(this.preAmpGain);
        this.preAmpGain.connect(this.panner);
        
        // Panner -> EQ Chain
        this.panner.connect(this.bassFilter);
        this.bassFilter.connect(this.midFilter);
        this.midFilter.connect(this.trebleFilter);
        
        // SPLIT: Dry vs Wet
        
        // A. Wet (Echo)
        this.trebleFilter.connect(this.delayNode);
        this.delayNode.connect(this.delayWetGain);
        this.delayWetGain.connect(this.ultraMaxPreGain); // Route to Max Stage
        
        // B. Wet (Reverb)
        this.trebleFilter.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.ultraMaxPreGain); // Route to Max Stage

        // C. Dry Signal
        this.trebleFilter.connect(this.ultraMaxPreGain);

        // MAX STAGE: PreGain -> Distortion -> Limiter -> PostBoost -> Analyser -> Out
        this.ultraMaxPreGain.connect(this.distortionNode);
        this.distortionNode.connect(this.limiter);
        this.limiter.connect(this.postLimiterBoost);
        this.postLimiterBoost.connect(this.analyser);
        this.analyser.connect(this.context.destination);

    } catch (e) {
        console.warn("Audio Graph Error:", e);
    }
  }

  // --- CONTROLS ---

  public setBassLevel(val: number) {
      this.userBassLevel = val;
      this.updateAudioParams();
  }

  public setEchoMode(enabled: boolean) {
      this.isEchoEnabled = enabled;
      this.updateAudioParams();
  }

  public setEchoLevel(val: number) {
      this.userEchoLevel = val;
      this.updateAudioParams();
  }

  public setMaxMode(enabled: boolean) {
      this.isMaxModeEnabled = enabled;
      this.updateAudioParams();
  }

  public setMaxLevel(val: number) {
      this.userMaxLevel = val;
      this.updateAudioParams();
  }

  public setDolbyMode(enabled: boolean) {
    this.isDolbyEnabled = enabled;
    this.updateAudioParams();
  }

  private updateAudioParams() {
      if (!this.context) return;
      const t = this.context.currentTime;
      
      // 1. ECHO
      if (this.isEchoEnabled) {
          const wetAmount = 0.2 + (this.userEchoLevel / 50) * 0.5; 
          const feedbackAmount = 0.3 + (this.userEchoLevel / 50) * 0.4; 
          if(this.delayWetGain) this.delayWetGain.gain.setTargetAtTime(wetAmount, t, 0.2);
          if(this.delayFeedback) this.delayFeedback.gain.setTargetAtTime(feedbackAmount, t, 0.2);
      } else {
          if(this.delayWetGain) this.delayWetGain.gain.setTargetAtTime(0, t, 0.2);
          if(this.delayFeedback) this.delayFeedback.gain.setTargetAtTime(0, t, 0.2);
      }

      // 2. ULTRA MAX POWER (The Fix)
      if (this.isMaxModeEnabled) {
          // A. ENGAGE DISTORTION:
          // We apply a distortion curve of '200' which creates heavy saturation/loudness
          // This mimics analog gear being pushed to the limit.
          if (this.distortionNode) {
              this.distortionNode.curve = this.makeDistortionCurve(100 + (this.userMaxLevel * 4));
          }
          
          // B. PRE-LIMITER DRIVE:
          // Push signal HARD into the limiter (Compression)
          if (this.ultraMaxPreGain) {
              this.ultraMaxPreGain.gain.setTargetAtTime(1.5, t, 0.1);
          }

          // C. POST-LIMITER BOOST (The "Nani Ghar Tak" Gain):
          // Standard is 1.0. We go up to 6.0x volume.
          // This effectively raises the noise floor and average volume massively.
          const boost = 2.0 + ((this.userMaxLevel / 50) * 4.0); // Range: 2x to 6x
          if (this.postLimiterBoost) {
              this.postLimiterBoost.gain.setTargetAtTime(boost, t, 0.2);
          }

      } else {
          // Reset to Clean / Safe
          if (this.distortionNode) this.distortionNode.curve = this.makeDistortionCurve(0); 
          if (this.ultraMaxPreGain) this.ultraMaxPreGain.gain.setTargetAtTime(1.0, t, 0.2);
          // If Dolby is on, we still need a little boost (1.6), otherwise 1.0
          const normalVol = this.isDolbyEnabled ? 1.4 : 1.0;
          if (this.postLimiterBoost) this.postLimiterBoost.gain.setTargetAtTime(normalVol, t, 0.2);
      }

      // 3. DOLBY ATMOS (True 8D Spatial)
      if (this.isDolbyEnabled) {
        // Activate full stereo panning rotation (Amplitude 1.0 = Full Left/Right)
        if (this.panGain) this.panGain.gain.setTargetAtTime(1.0, t, 2.0); 
        
        // EQ Profile for Spatial Clarity
        if (this.bassFilter) this.bassFilter.gain.setTargetAtTime(this.userBassLevel + 5, t, 0.1); 
        if (this.trebleFilter) this.trebleFilter.gain.setTargetAtTime(6.0, t, 0.2); // Air
        if (this.midFilter) this.midFilter.gain.setTargetAtTime(-3.0, t, 0.2); // Scoop for clarity

        // Spatial Reverb (Creates the "distance" when panning)
        if (this.reverbGain) this.reverbGain.gain.setTargetAtTime(0.3, t, 0.5);
        if (this.preAmpGain) this.preAmpGain.gain.setTargetAtTime(1.2, t, 0.2); 

    } else {
        // Disable Panning (Center)
        if (this.panGain) this.panGain.gain.setTargetAtTime(0, t, 0.5); 
        
        // Reset EQ
        if (this.bassFilter) this.bassFilter.gain.setTargetAtTime(0, t, 0.2);
        if (this.trebleFilter) this.trebleFilter.gain.setTargetAtTime(0, t, 0.2);
        if (this.midFilter) this.midFilter.gain.setTargetAtTime(0, t, 0.2);
        if (this.reverbGain) this.reverbGain.gain.setTargetAtTime(0, t, 0.2);
        if (this.preAmpGain) this.preAmpGain.gain.setTargetAtTime(1.0, t, 0.2);
    }
  }

  // --- FADE UTILITIES ---

  public async fadeOutAndPause() {
      if (!this.context || !this.mediaElement || this.isFadingOut) return;
      this.isFadingOut = true;
      const t = this.context.currentTime;
      const fadeDuration = 2.0; 

      if (this.postLimiterBoost) {
          this.postLimiterBoost.gain.cancelScheduledValues(t);
          this.postLimiterBoost.gain.setValueAtTime(this.postLimiterBoost.gain.value, t);
          this.postLimiterBoost.gain.exponentialRampToValueAtTime(0.001, t + fadeDuration);
      }

      setTimeout(() => {
          if (this.mediaElement) {
              this.mediaElement.pause();
          }
          this.isFadingOut = false;
      }, fadeDuration * 1000);
  }

  public fadeIn() {
      if (!this.context || !this.postLimiterBoost) return;
      this.isFadingOut = false;
      this.updateAudioParams(); // Restores gain based on current mode
  }

  public setVolume(val: number) {
      if (!this.preAmpGain) return;
      if (this.mediaElement) this.mediaElement.muted = false;

      // Logarithmic volume curve for smoother control
      let targetGain = 0;
      if (val > 0) {
        targetGain = Math.pow(val / 1000, 1.5); // 0-1 range roughly, boosted by preamp later
      }
      
      if(Number.isFinite(targetGain)) {
         try {
            if (this.preAmpGain) {
                // If Dolby/Max is on, the updateAudioParams handles the heavy lifting, 
                // but this acts as the "Master Fader" input.
                // We actually want to adjust the PRE-AMP here so distortion works correctly.
                this.preAmpGain.gain.setTargetAtTime(targetGain * 1.5, this.context?.currentTime || 0, 0.1);
            }
         } catch(e) {}
      }
  }
  
  // --- ANALYSIS & UTILS ---

  private startAnalysis() {
      if (this.isRunning) return;
      this.isRunning = true;
      requestAnimationFrame(this.detectBeat);
  }

  private detectBeat() {
      if (!this.isRunning) return;
      if (!this.analyser || !this.dataArray) {
          requestAnimationFrame(this.detectBeat);
          return;
      }
      this.analyser.getByteFrequencyData(this.dataArray);
      let bassSum = 0;
      for (let i = 0; i < 5; i++) {
          bassSum += this.dataArray[i];
      }
      const bassLevel = bassSum / 5 / 255; 
      if (bassLevel > this.beatThreshold && bassLevel > 0.4) {
          const now = Date.now();
          if (now - this.lastBeatTime > 200) {
              this.triggerBeat();
              this.lastBeatTime = now;
              this.beatThreshold = bassLevel * 1.15; 
          }
      } else {
          this.beatThreshold *= this.beatDecayRate;
          if (this.beatThreshold < 0.25) this.beatThreshold = 0.25; 
      }
      requestAnimationFrame(this.detectBeat);
  }

  public onBeat(callback: () => void) {
      this.beatCallbacks.add(callback);
      return () => this.beatCallbacks.delete(callback);
  }

  private triggerBeat() {
      this.beatCallbacks.forEach(cb => cb());
  }

  public getAnalyser() {
    return this.analyser;
  }
  
  public resumeContext() {
      if (this.context && this.context.state === 'suspended') {
          this.context.resume().catch(e => console.error("Resume failed", e));
          this.isRunning = true;
          this.startAnalysis();
      }
      this.fadeIn();
  }

  public suspend() {
      this.isRunning = false;
      if (this.mediaElement) {
          this.mediaElement.pause();
      }
  }

  public async playThunder() {
      if (!this.context) this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.context.state === 'suspended') await this.context.resume().catch(() => {});
      const t = this.context.currentTime;
      const duration = 7.0; 
      const masterComp = this.context.createDynamicsCompressor();
      masterComp.connect(this.context.destination);
      const thunderGain = this.context.createGain();
      thunderGain.gain.setValueAtTime(0, t);
      thunderGain.gain.linearRampToValueAtTime(3.0, t + 0.2); 
      thunderGain.gain.exponentialRampToValueAtTime(0.01, t + duration); 
      thunderGain.connect(masterComp);
      const bufferSize = this.context.sampleRate * 7;
      const rumbleBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const rumbleData = rumbleBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + (0.02 * white)) / 1.02;
          rumbleData[i] = lastOut * 3.5; 
          rumbleData[i] *= 1 - (i/bufferSize); 
      }
      const rumbleSource = this.context.createBufferSource();
      rumbleSource.buffer = rumbleBuffer;
      const rumbleFilter = this.context.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(200, t);
      rumbleFilter.frequency.exponentialRampToValueAtTime(50, t + duration); 
      rumbleSource.connect(rumbleFilter);
      rumbleFilter.connect(thunderGain);
      rumbleSource.start(t);
  }

  public playHoverSound() {
      if (!this.context) this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      const t = this.context.currentTime;
      const osc = this.context.createOscillator();
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(t);
      osc.stop(t + 0.2);
  }
}

export const audioEngine = new AudioEngine();
