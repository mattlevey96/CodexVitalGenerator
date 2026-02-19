import type { AudioFeatures } from "./schema";

export async function analyzeAudio(file: File): Promise<AudioFeatures> {
  const buffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    const ch0 = decoded.getChannelData(0);
    const sampleRate = decoded.sampleRate;

    let sumSq = 0;
    for (let i = 0; i < ch0.length; i += 1) sumSq += ch0[i] * ch0[i];
    const rms = Math.sqrt(sumSq / Math.max(1, ch0.length));

    const frame = Math.min(2048, ch0.length);
    const bins = frame / 2;
    let weighted = 0;
    let total = 0;
    for (let i = 0; i < bins; i += 1) {
      const mag = Math.abs(ch0[i]);
      const freq = (i * sampleRate) / frame;
      weighted += mag * freq;
      total += mag;
    }
    const spectralCentroid = total > 0 ? weighted / total : 0;

    const window = Math.max(64, Math.floor(sampleRate * 0.01));
    let attackTime = 0.02;
    const target = rms * 0.8;
    let env = 0;
    for (let i = 0; i < ch0.length; i += window) {
      let local = 0;
      for (let j = i; j < Math.min(ch0.length, i + window); j += 1) local += Math.abs(ch0[j]);
      env = local / window;
      if (env >= target) {
        attackTime = i / sampleRate;
        break;
      }
    }

    let absMean = 0;
    let geoLog = 0;
    const n = Math.min(4096, ch0.length);
    for (let i = 0; i < n; i += 1) {
      const v = Math.abs(ch0[i]) + 1e-6;
      absMean += v;
      geoLog += Math.log(v);
    }
    absMean /= n;
    const geoMean = Math.exp(geoLog / n);
    const noisiness = Math.max(0, Math.min(1, 1 - geoMean / absMean));

    return { rms, spectralCentroid, attackTime, noisiness };
  } finally {
    await ctx.close();
  }
}
