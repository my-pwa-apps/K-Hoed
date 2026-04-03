import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const STATIC_JOIN_URL = "https://tinyurl.com/montanaquiz26";
function qrUrl(data) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=1e1b4b&margin=4`;
}
/**
 * Persistent join panel shown on all host screens.
 * Displays the short tinyurl, the session room code, and a QR code that
 * goes directly to the pre-filled join URL.
 */
export function JoinPanel({ roomCode, dark = false, compact = false }) {
    const directUrl = `${location.origin}/join/${roomCode}`;
    const qr = qrUrl(directUrl);
    const bg = dark ? "bg-white/10 backdrop-blur border border-white/20" : "bg-white border border-gray-100 shadow-sm";
    const text = dark ? "text-white" : "text-gray-900";
    const sub = dark ? "text-white/60" : "text-gray-500";
    const codeBg = dark ? "bg-white/15" : "bg-brand-50";
    const codeText = dark ? "text-white" : "text-brand-700";
    if (compact) {
        return (_jsxs("div", { className: `flex items-center gap-3 rounded-2xl px-4 py-2.5 ${bg}`, children: [_jsx("img", { src: qr, alt: "QR code to join", width: 50, height: 50, className: "rounded-lg shrink-0" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: `text-xs font-medium mb-0.5 ${sub}`, children: "Scan or visit" }), _jsx("p", { className: `text-xs ${sub} truncate hidden sm:block`, children: STATIC_JOIN_URL }), _jsx("div", { className: `inline-block font-mono font-extrabold text-xl tracking-widest rounded-lg px-2 py-0.5 mt-0.5 ${codeBg} ${codeText}`, children: roomCode })] })] }));
    }
    return (_jsxs("div", { className: `flex flex-col sm:flex-row items-center gap-5 rounded-3xl p-5 ${bg}`, children: [_jsx("img", { src: qr, alt: "QR code to join the game", width: 130, height: 130, className: "rounded-2xl shrink-0" }), _jsxs("div", { className: "text-center sm:text-left", children: [_jsx("p", { className: `text-sm font-semibold mb-1 ${text}`, children: "Join this game" }), _jsx("p", { className: `text-sm mb-3 ${sub}`, children: "Scan the code or go to:" }), _jsx("p", { className: `font-bold text-lg mb-3 ${text}`, children: STATIC_JOIN_URL }), _jsx("p", { className: `text-xs ${sub} mb-1`, children: "Room code" }), _jsx("div", { className: `inline-block font-mono font-extrabold text-4xl tracking-widest rounded-2xl px-5 py-2 ${codeBg} ${codeText}`, children: roomCode })] })] }));
}
