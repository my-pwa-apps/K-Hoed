interface JoinPanelProps {
  roomCode: string;
  /** If true, render dark-mode version (for host game screen) */
  dark?: boolean;
  compact?: boolean;
}

const STATIC_JOIN_URL = "https://tinyurl.com/montanaquiz26";

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=1e1b4b&margin=4`;
}

/**
 * Persistent join panel shown on all host screens.
 * Displays the short tinyurl, the session room code, and a QR code that
 * goes directly to the pre-filled join URL.
 */
export function JoinPanel({ roomCode, dark = false, compact = false }: JoinPanelProps) {
  const directUrl = `${location.origin}/join/${roomCode}`;
  const qr = qrUrl(directUrl);

  const bg = dark ? "bg-white/10 backdrop-blur border border-white/20" : "bg-white border border-gray-100 shadow-sm";
  const text = dark ? "text-white" : "text-gray-900";
  const sub = dark ? "text-white/60" : "text-gray-500";
  const codeBg = dark ? "bg-white/15" : "bg-brand-50";
  const codeText = dark ? "text-white" : "text-brand-700";

  if (compact) {
    return (
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${bg}`}>
        <img
          src={qr}
          alt="QR code to join"
          width={50}
          height={50}
          className="rounded-lg shrink-0"
        />
        <div className="min-w-0">
          <p className={`text-xs font-medium mb-0.5 ${sub}`}>Scan or visit</p>
          <p className={`text-xs ${sub} truncate hidden sm:block`}>{STATIC_JOIN_URL}</p>
          <div className={`inline-block font-mono font-extrabold text-xl tracking-widest rounded-lg px-2 py-0.5 mt-0.5 ${codeBg} ${codeText}`}>
            {roomCode}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-5 rounded-3xl p-5 ${bg}`}>
      <img
        src={qr}
        alt="QR code to join the game"
        width={130}
        height={130}
        className="rounded-2xl shrink-0"
      />
      <div className="text-center sm:text-left">
        <p className={`text-sm font-semibold mb-1 ${text}`}>Join this game</p>
        <p className={`text-sm mb-3 ${sub}`}>Scan the code or go to:</p>
        <p className={`font-bold text-lg mb-3 ${text}`}>{STATIC_JOIN_URL}</p>
        <p className={`text-xs ${sub} mb-1`}>Room code</p>
        <div className={`inline-block font-mono font-extrabold text-4xl tracking-widest rounded-2xl px-5 py-2 ${codeBg} ${codeText}`}>
          {roomCode}
        </div>
      </div>
    </div>
  );
}
