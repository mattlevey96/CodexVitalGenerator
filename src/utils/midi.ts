export function createDemoMidi(): Blob {
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96];
  const events: number[] = [];
  const push = (...vals: number[]) => events.push(...vals);
  push(0x00, 0xc0, 0x00);
  const notes = [48, 55, 60, 55, 52, 60, 64, 67];
  notes.forEach((n, i) => {
    push(i === 0 ? 0x00 : 0x18, 0x90, n, 0x64);
    push(0x18, 0x80, n, 0x00);
  });
  push(0x00, 0xff, 0x2f, 0x00);
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b];
  const len = events.length;
  const lenBytes = [(len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255];
  const bytes = new Uint8Array([...header, ...trackHeader, ...lenBytes, ...events]);
  return new Blob([bytes], { type: "audio/midi" });
}
