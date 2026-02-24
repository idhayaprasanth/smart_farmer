import { useEffect, useRef } from "react";

export default function usePolling(callback, delay = 5000, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !delay) return undefined;

    const tick = () => {
      savedCallback.current();
    };

    tick();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay, enabled]);
}
