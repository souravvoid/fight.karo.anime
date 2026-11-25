import { useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { resetTouchInput, setTouchInput } from "../services/bus";
import type { InputState } from "../services/bus";

type Key = keyof InputState;

function usePress(key: Key) {
  const on = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setTouchInput(key, true);
  };
  const off = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setTouchInput(key, false);
  };
  return {
    onPointerDown: on,
    onPointerUp: off,
    onPointerCancel: off,
    onLostPointerCapture: off,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

export function TouchControls() {
  useEffect(() => resetTouchInput, []);
  const left = usePress("left");
  const right = usePress("right");
  const up = usePress("up");
  const down = usePress("down");
  const punch = usePress("punch");
  const kick = usePress("kick");
  const special = usePress("special");
  const grab = usePress("grab");
  const superKey = usePress("super");

  return (
    <div className="touch-controls">
      <div className="dpad">
        <button type="button" className="touch-btn dpad-up" aria-label="Jump" {...up}>
          <ChevronUp size={22} />
        </button>
        <button type="button" className="touch-btn dpad-left" aria-label="Move left" {...left}>
          <ChevronLeft size={22} />
        </button>
        <button type="button" className="touch-btn dpad-right" aria-label="Move right" {...right}>
          <ChevronRight size={22} />
        </button>
        <button type="button" className="touch-btn dpad-down" aria-label="Crouch" {...down}>
          <ChevronDown size={22} />
        </button>
      </div>

      <div className="attack-pad">
        <button type="button" className="touch-btn attack-btn attack-grab" aria-label="Grab" {...grab}>
          GRAB
        </button>
        <button type="button" className="touch-btn attack-btn attack-special" aria-label="Special" {...special}>
          SPECIAL
        </button>
        <button type="button" className="touch-btn attack-btn attack-kick" aria-label="Kick" {...kick}>
          KICK
        </button>
        <button type="button" className="touch-btn attack-btn attack-punch" aria-label="Punch" {...punch}>
          PUNCH
        </button>
        <button type="button" className="touch-btn attack-btn attack-super" aria-label="Super attack" {...superKey}>
          SUPER
        </button>
      </div>
    </div>
  );
}
