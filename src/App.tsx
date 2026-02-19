import { useEffect, useReducer, useState } from "react";
import { AssistantBar } from "./components/AssistantBar";
import { DetailsDrawer } from "./components/DetailsDrawer";
import { ExportBar } from "./components/ExportBar";
import { Keyboard } from "./components/Keyboard";
import { PatchPanels } from "./components/PatchPanels";
import { audioEngine } from "./audio/engine";
import { analyzeAudio } from "./patch/analyzeAudio";
import { applyTweak, generatePatch } from "./patch/generate";
import { ARCHETYPES, type Archetype, type AudioFeatures, type Patch, type PatchDelta } from "./patch/schema";
import { loadState, saveState } from "./utils/storage";

type State = {
  patch: Patch;
  archetype: Archetype;
  lastDelta: PatchDelta;
  explanation: string;
  features?: AudioFeatures;
};

type Action =
  | { type: "setArchetype"; archetype: Archetype }
  | { type: "setPatch"; patch: Patch }
  | { type: "generated"; patch: Patch; features?: AudioFeatures }
  | { type: "tweaked"; patch: Patch; delta: PatchDelta; explanation: string; features?: AudioFeatures };

function initialPatch(): Patch {
  return generatePatch({ archetype: "Deep House Pluck", promptText: "" });
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setArchetype":
      return { ...state, archetype: action.archetype };
    case "setPatch":
      return { ...state, patch: action.patch };
    case "generated":
      return { ...state, patch: action.patch, lastDelta: { changes: [] }, explanation: "Generated new patch.", features: action.features };
    case "tweaked":
      return { ...state, patch: action.patch, lastDelta: action.delta, explanation: action.explanation, features: action.features };
    default:
      return state;
  }
}

const persisted = loadState<State>();
const initState: State = persisted ?? {
  patch: initialPatch(),
  archetype: "Deep House Pluck",
  lastDelta: { changes: [] },
  explanation: "Ready.",
  features: undefined
};

export default function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initState);
  const [audioReady, setAudioReady] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [meter, setMeter] = useState(0);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [upload, setUpload] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    audioEngine.setPatch(state.patch);
  }, [state.patch]);

  useEffect(() => {
    const id = window.setInterval(() => setMeter(audioEngine.getOutputLevel()), 80);
    return () => window.clearInterval(id);
  }, []);

  const ensureAudio = async () => {
    if (!audioReady) {
      await audioEngine.initAudio();
      audioEngine.setPatch(state.patch);
      setAudioReady(true);
    }
  };

  const onGenerate = async (promptText: string) => {
    setLoading(true);
    try {
      await ensureAudio();
      let features: AudioFeatures | undefined;
      if (upload) {
        try {
          features = await analyzeAudio(upload);
        } catch {
          features = undefined;
        }
      }
      const patch = generatePatch({ archetype: state.archetype, promptText, features });
      dispatch({ type: "generated", patch, features });
    } finally {
      setLoading(false);
    }
  };

  const onApply = (tweakText: string) => {
    const { next, delta, explanation } = applyTweak(state.patch, tweakText);
    dispatch({ type: "tweaked", patch: next, delta, explanation, features: state.features });
  };

  return (
    <main className="app-shell">
      <header>
        <h1>PatchPal</h1>
        <div className="meta">Vital-first habit builder for producer patches</div>
      </header>
      <div className="top-controls">
        <label>
          Archetype
          <select value={state.archetype} onChange={(e) => dispatch({ type: "setArchetype", archetype: e.target.value as Archetype })}>
            {ARCHETYPES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          MP3 Input (optional)
          <input type="file" accept="audio/mp3,audio/mpeg" onChange={(e) => setUpload(e.target.files?.[0] ?? null)} />
        </label>
        <label>
          Output
          <select>
            <option>Vital</option>
          </select>
        </label>
      </div>
      <AssistantBar onGenerate={onGenerate} onApply={onApply} loading={loading} />
      <PatchPanels patch={state.patch} onPatch={(p) => dispatch({ type: "setPatch", patch: p })} />
      <div className="bottom-strip">
        <div className="master">
          <label>
            Master Volume
            <input
              type="range"
              min={0}
              max={1.2}
              step={0.01}
              value={masterVolume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMasterVolume(v);
                audioEngine.setMasterVolume(v);
              }}
            />
          </label>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${Math.min(100, Math.round(meter * 260))}%` }} />
          </div>
        </div>
      </div>
      <Keyboard
        onNoteOn={async (midi, vel) => {
          await ensureAudio();
          audioEngine.noteOn(midi, vel, state.patch);
        }}
        onNoteOff={(midi) => audioEngine.noteOff(midi)}
      />
      <ExportBar patch={state.patch} onWarning={setWarnings} />
      {warnings.length > 0 && (
        <div className="warnings">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
      <DetailsDrawer
        open={openDrawer}
        onToggle={() => setOpenDrawer((v) => !v)}
        patch={state.patch}
        delta={state.lastDelta}
        explanation={state.explanation}
        features={state.features}
      />
      <footer>
        Last generated: {state.patch.meta.name} at {new Date(state.patch.meta.createdAt).toLocaleString()}
      </footer>
    </main>
  );
}
