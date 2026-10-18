import { useNavigation } from "react-router";

export default function TopLoader() {
  const { state } = useNavigation();
  const busy = state !== "idle";

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden={!busy}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 transition-opacity duration-300 ${
        busy ? "delay-150 opacity-100" : "opacity-0"
      }`}
    >
      <div
        key={busy ? "busy" : "idle"}
        className={`h-full rounded-r-full bg-primary shadow-[0_0_8px] shadow-primary/60 ${
          busy ? "animate-top-loader" : "w-full"
        }`}
      />
    </div>
  );
}
