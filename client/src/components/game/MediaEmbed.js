import { jsx as _jsx } from "react/jsx-runtime";
function getEmbedInfo(url) {
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([A-Za-z0-9_-]{8,})/);
    if (ytMatch) {
        const id = ytMatch[1];
        return { kind: "youtube", embed: `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=0` };
    }
    if (/\.(mp3|wav|ogg|aac|flac)(\?|$)/i.test(url))
        return { kind: "audio", embed: url };
    return { kind: "video", embed: url };
}
export function MediaEmbed({ url, type }) {
    const { kind, embed } = getEmbedInfo(url);
    if (kind === "youtube") {
        const maxH = type === "audioclip" ? "120px" : "220px";
        return (_jsx("div", { className: "w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg mb-2", style: { maxHeight: maxH }, children: _jsx("iframe", { src: embed, allow: "autoplay; encrypted-media", allowFullScreen: true, title: "Media clip", className: "w-full h-full border-0", sandbox: "allow-scripts allow-same-origin allow-presentation" }) }));
    }
    if (kind === "audio") {
        return (_jsx("div", { className: "w-full flex justify-center my-2", children: _jsx("audio", { autoPlay: true, controls: true, src: embed, className: "w-full max-w-sm" }) }));
    }
    return (_jsx("div", { className: "w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg mb-2", children: _jsx("video", { autoPlay: true, controls: true, src: embed, className: "w-full h-full object-contain" }) }));
}
