import { useState } from "react";

interface AssistantBarProps {
  onGenerate: (promptText: string) => void;
  onApply: (tweakText: string) => void;
  loading?: boolean;
}

const QUICK = ["brighter", "more pluck", "wider", "less detune", "more movement"];

export function AssistantBar({ onGenerate, onApply, loading }: AssistantBarProps): JSX.Element {
  const [prompt, setPrompt] = useState("");
  const [tweak, setTweak] = useState("");

  return (
    <section className="assistant-strip">
      <div className="row">
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe a sound..." />
        <button onClick={() => onGenerate(prompt)} disabled={loading}>
          {loading ? "Analyzing..." : "Generate"}
        </button>
      </div>
      <div className="row">
        <input value={tweak} onChange={(e) => setTweak(e.target.value)} placeholder="Tweak this sound..." />
        <button
          onClick={() => {
            onApply(tweak);
            setTweak("");
          }}
        >
          Apply
        </button>
      </div>
      <div className="chips">
        {QUICK.map((c) => (
          <button key={c} className="chip" onClick={() => onApply(c)}>
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}
