/**
 * Tiny original synth engine — no audio files, no licensed material.
 * Every sound is generated at runtime with the Web Audio API.
 */

type Wave = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private sfxOn = true;
  private musicOn = true;
  private musicTimer: number | null = null;
  private step = 0;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 0.5 : 0;
    this.sfxBus.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.16 : 0;
    this.musicBus.connect(this.master);

    const length = Math.floor(ctx.sampleRate * 0.6);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    }
    this.noise = buffer;
  }

  configure(sfx: boolean, music: boolean): void {
    this.sfxOn = sfx;
    this.musicOn = music;
    if (this.sfxBus && this.ctx) this.sfxBus.gain.setTargetAtTime(sfx ? 0.5 : 0, this.ctx.currentTime, 0.05);
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(music ? 0.16 : 0, this.ctx.currentTime, 0.08);
    if (!music) this.stopMusic();
  }

  private tone(
    freq: number,
    duration: number,
    wave: Wave,
    gain: number,
    opts: { to?: number; delay?: number; bus?: GainNode | null } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const bus = opts.bus ?? this.sfxBus;
    if (!bus) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + duration);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(env).connect(bus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  private burst(duration: number, frequency: number, q: number, gain: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.sfxBus) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(env).connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  ui(): void {
    this.tone(520, 0.07, "triangle", 0.12, { to: 760 });
  }

  confirm(): void {
    this.tone(440, 0.09, "square", 0.1, { to: 660 });
    this.tone(880, 0.12, "triangle", 0.08, { to: 1320, delay: 0.06 });
  }

  back(): void {
    this.tone(320, 0.1, "triangle", 0.1, { to: 180 });
  }

  whiff(): void {
    this.burst(0.12, 900, 1.4, 0.16);
  }

  punch(): void {
    this.burst(0.08, 1600, 2.2, 0.2);
    this.tone(150, 0.09, "sine", 0.18, { to: 60 });
  }

  kick(): void {
    this.burst(0.11, 900, 1.5, 0.22);
    this.tone(110, 0.13, "sine", 0.24, { to: 45 });
  }

  hit(heavy = false): void {
    this.burst(heavy ? 0.16 : 0.1, heavy ? 600 : 1100, 1.1, heavy ? 0.34 : 0.24);
    this.tone(heavy ? 90 : 150, heavy ? 0.18 : 0.1, "sawtooth", heavy ? 0.22 : 0.14, {
      to: heavy ? 38 : 70,
    });
  }

  block(): void {
    this.burst(0.09, 2400, 3.5, 0.2);
    this.tone(700, 0.06, "square", 0.1, { to: 420 });
  }

  special(): void {
    this.tone(240, 0.35, "sawtooth", 0.14, { to: 900 });
    this.tone(480, 0.3, "triangle", 0.1, { to: 1500, delay: 0.05 });
    this.burst(0.35, 2200, 0.8, 0.16);
  }

  superFlash(): void {
    this.tone(70, 0.7, "sine", 0.32, { to: 40 });
    this.tone(220, 0.55, "sawtooth", 0.16, { to: 880 });
    this.tone(330, 0.6, "triangle", 0.12, { to: 1320, delay: 0.08 });
    this.burst(0.6, 1200, 0.6, 0.3);
  }

  ko(): void {
    this.tone(300, 0.5, "sawtooth", 0.2, { to: 60 });
    this.burst(0.4, 400, 0.7, 0.28);
    this.tone(150, 0.9, "sine", 0.16, { to: 40, delay: 0.1 });
  }

  gong(): void {
    this.tone(146, 1.2, "sine", 0.24, { to: 120 });
    this.tone(292, 0.9, "triangle", 0.12, { to: 260 });
    this.burst(0.5, 700, 0.9, 0.12);
  }

  countdown(final = false): void {
    this.tone(final ? 880 : 440, final ? 0.25 : 0.1, "square", 0.14);
  }

  /** 16-step arcade loop, two voices. */
  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return;
    const bass = [55, 55, 65.41, 55, 49, 49, 58.27, 49, 55, 55, 65.41, 73.42, 82.41, 73.42, 65.41, 55];
    const lead = [0, 0, 440, 0, 523.25, 0, 440, 392, 0, 0, 440, 0, 659.25, 587.33, 523.25, 392];
    this.step = 0;
    const tick = () => {
      if (!this.ctx) return;
      const i = this.step % 16;
      this.tone(bass[i], 0.22, "triangle", 0.34, { bus: this.musicBus });
      if (lead[i]) this.tone(lead[i], 0.18, "sine", 0.14, { bus: this.musicBus, delay: 0.02 });
      if (i % 4 === 0) this.tone(60, 0.12, "sine", 0.4, { bus: this.musicBus, to: 40, delay: 0.001 });
      this.step += 1;
    };
    tick();
    this.musicTimer = window.setInterval(tick, 190);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioEngine();
