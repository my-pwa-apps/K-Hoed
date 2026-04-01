interface MediaEmbedProps {
  url: string;
  /** Used to constrain iframe height for audio-only clips */
  type?: "audioclip" | "videoclip";
}

function getEmbedInfo(url: string): { kind: "youtube" | "audio" | "video"; embed: string } {
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([A-Za-z0-9_-]{8,})/
  );
  if (ytMatch) {
    const id = ytMatch[1]!;
    return { kind: "youtube", embed: `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=0` };
  }
  if (/\.(mp3|wav|ogg|aac|flac)(\?|$)/i.test(url)) return { kind: "audio", embed: url };
  return { kind: "video", embed: url };
}

export function MediaEmbed({ url, type }: MediaEmbedProps) {
  const { kind, embed } = getEmbedInfo(url);

  if (kind === "youtube") {
    const maxH = type === "audioclip" ? "120px" : "220px";
    return (
      <div
        className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg mb-2"
        style={{ maxHeight: maxH }}
      >
        <iframe
          src={embed}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="Media clip"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="w-full flex justify-center my-2">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio autoPlay controls src={embed} className="w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg mb-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video autoPlay controls src={embed} className="w-full h-full object-contain" />
    </div>
  );
}
