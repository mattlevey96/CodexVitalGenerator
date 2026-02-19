import { useEffect, useMemo, useState } from "react";

interface KeyboardProps {
  onNoteOn: (midi: number, velocity: number) => void;
  onNoteOff: (midi: number) => void;
}

const MAPPING: Record<string, number> = {
  a: 48,
  w: 49,
  s: 50,
  e: 51,
  d: 52,
  f: 53,
  t: 54,
  g: 55,
  y: 56,
  h: 57,
  u: 58,
  j: 59,
  k: 60,
  o: 61,
  l: 62,
  p: 63,
  ";": 64
};

const isBlack = (midi: number): boolean => [1, 3, 6, 8, 10].includes(midi % 12);

export function Keyboard({ onNoteOn, onNoteOff }: KeyboardProps): JSX.Element {
  const notes = useMemo(() => Array.from({ length: 24 }, (_, i) => 48 + i), []);
  const [active, setActive] = useState<Set<number>>(new Set());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const midi = MAPPING[e.key.toLowerCase()];
      if (midi == null || active.has(midi)) return;
      setActive((prev) => new Set(prev).add(midi));
      onNoteOn(midi, 0.9);
    };
    const up = (e: KeyboardEvent) => {
      const midi = MAPPING[e.key.toLowerCase()];
      if (midi == null) return;
      setActive((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
      onNoteOff(midi);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [active, onNoteOn, onNoteOff]);

  return (
    <section className="keyboard">
      {notes.map((m) => (
        <button
          key={m}
          className={`key ${isBlack(m) ? "black" : "white"} ${active.has(m) ? "active" : ""}`}
          onMouseDown={() => {
            setActive((prev) => new Set(prev).add(m));
            onNoteOn(m, 0.9);
          }}
          onMouseUp={() => {
            setActive((prev) => {
              const next = new Set(prev);
              next.delete(m);
              return next;
            });
            onNoteOff(m);
          }}
          onMouseLeave={() => {
            if (!active.has(m)) return;
            setActive((prev) => {
              const next = new Set(prev);
              next.delete(m);
              return next;
            });
            onNoteOff(m);
          }}
        >
          <span>{m}</span>
        </button>
      ))}
    </section>
  );
}
