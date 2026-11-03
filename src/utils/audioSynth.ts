/**
 * Web Audio API Synthesizer for Arcade Sound FX and Procedural Background Music
 * Zero external mp3 dependencies - instant, latency-free, works seamlessly everywhere.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGain: GainNode | null = null;
  private bgmOscs: OscillatorNode[] = [];
  private bgmTimer: number | null = null;
  public destinationNode: MediaStreamAudioDestinationNode | null = null;

  private initCtx() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.bgmGain) {
      this.bgmGain.gain.value = muted ? 0 : 0.3;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Coin Flip clink
  public playCoinFlip() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Win / Success Chime
  public playWin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  // Big Jackpot / Hitarth Redeem Fanfare!
  public playJackpot() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Ascending arpeggio with celebratory horn-like chords
    const chordSeq = [
      [440, 554.37, 659.25], // A
      [554.37, 659.25, 830.61], // C#
      [659.25, 830.61, 987.77], // E
      [880, 1108.73, 1318.51], // A high
    ];

    chordSeq.forEach((chord, step) => {
      chord.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + step * 0.12;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.45);
      });
    });
  }

  // Loss sound
  public playLoss() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Slot Reel Tick
  public playSlotTick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Slot Spin or Reel Whirl
  public playSlotSpin() {
    if (this.isMuted) return;
    this.playCoinFlip();
  }

  // Coin Sound
  public playCoin() {
    if (this.isMuted) return;
    this.playCoinFlip();
  }

  // Battle Hit / Slash
  public playAttack(isCrit: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 580 : 350, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    gain.gain.setValueAtTime(isCrit ? 0.3 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Hunt Catch Jingle
  public playCatch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554, 659, 880];
    notes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.09;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // --- Procedural Background Music Generator ---
  public startMusic(genre: string, volume: number = 0.4, recordDestination?: MediaStreamAudioDestinationNode) {
    this.stopMusic();
    this.initCtx();
    if (!this.ctx) return;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : volume * 0.35, this.ctx.currentTime);
    this.bgmGain.connect(this.ctx.destination);

    if (recordDestination) {
      this.bgmGain.connect(recordDestination);
    }

    // Genre-specific chord progressions & tempo
    let chords: number[][] = [];
    let beatInterval = 600; // ms

    if (genre.includes('Synthwave')) {
      // 80s D minor / F / C / G
      chords = [
        [146.83, 220.0, 261.63], // Dm
        [174.61, 261.63, 349.23], // F
        [130.81, 196.0, 261.63], // C
        [196.0, 246.94, 293.66], // G
      ];
      beatInterval = 450;
    } else if (genre.includes('Epic') || genre.includes('Dramatic')) {
      // Epic C minor / Ab / Eb / Bb
      chords = [
        [130.81, 196.0, 311.13], // Cm
        [103.83, 164.81, 207.65], // Ab
        [155.56, 233.08, 311.13], // Eb
        [116.54, 174.61, 233.08], // Bb
      ];
      beatInterval = 800;
    } else if (genre.includes('Lo-Fi')) {
      // Jazzy 7th chords
      chords = [
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [164.81, 207.65, 246.94, 311.13], // E7
        [146.83, 174.61, 220.0, 261.63], // Dm7
        [130.81, 164.81, 196.0, 246.94], // Cmaj7
      ];
      beatInterval = 750;
    } else {
      // Ambient Calm / Upbeat
      chords = [
        [261.63, 329.63, 392.0], // C
        [220.0, 261.63, 329.63], // Am
        [174.61, 220.0, 261.63], // F
        [196.0, 246.94, 293.66], // G
      ];
      beatInterval = 700;
    }

    let step = 0;
    const playChordStep = () => {
      if (!this.ctx || !this.bgmGain) return;
      const currentChord = chords[step % chords.length];
      const t = this.ctx.currentTime;

      currentChord.forEach((freq, i) => {
        if (!this.ctx || !this.bgmGain) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = genre.includes('Synthwave') ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const chordDuration = (beatInterval / 1000) * 1.8;
        noteGain.gain.setValueAtTime(0.08 / currentChord.length, t);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + chordDuration);

        osc.connect(noteGain);
        noteGain.connect(this.bgmGain);

        osc.start(t);
        osc.stop(t + chordDuration);
        this.bgmOscs.push(osc);
      });

      // Bass note pulse
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(currentChord[0] / 2, t);
      bassGain.gain.setValueAtTime(0.12, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + (beatInterval / 1000) * 0.9);
      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGain);
      bassOsc.start(t);
      bassOsc.stop(t + (beatInterval / 1000) * 0.9);
      this.bgmOscs.push(bassOsc);

      step++;
    };

    playChordStep();
    this.bgmTimer = window.setInterval(playChordStep, beatInterval);
  }

  public stopMusic() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmOscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        // ignore already stopped
      }
    });
    this.bgmOscs = [];
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
  }

  public setMusicVolume(vol: number) {
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : vol * 0.35, this.ctx.currentTime);
    }
  }
}

export const sound = new SoundEngine();
