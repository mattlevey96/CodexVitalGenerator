import type { AudioFeatures, Patch, PatchDelta } from "../patch/schema";
import { prettyDelta } from "../utils/diff";

interface DetailsDrawerProps {
  open: boolean;
  onToggle: () => void;
  patch: Patch;
  delta: PatchDelta;
  explanation: string;
  features?: AudioFeatures;
}

export function DetailsDrawer({ open, onToggle, patch, delta, explanation, features }: DetailsDrawerProps): JSX.Element {
  return (
    <aside className={`details ${open ? "open" : ""}`}>
      <button className="drawer-toggle" onClick={onToggle}>
        {open ? "Hide Details" : "Assistant / Details"}
      </button>
      {open && (
        <div className="drawer-body">
          <h4>Last Tweak</h4>
          <p>{explanation}</p>
          <pre>{prettyDelta(delta)}</pre>
          <h4>Audio Features</h4>
          <pre>{features ? JSON.stringify(features, null, 2) : "No uploaded MP3 analyzed."}</pre>
          <h4>Patch JSON</h4>
          <pre>{JSON.stringify(patch, null, 2)}</pre>
        </div>
      )}
    </aside>
  );
}
