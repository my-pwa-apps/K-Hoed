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
    return { kind: "youtube", embed: `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&rel=0&modestbranding=1` };
  }
  if (/\.(mp3|wav|ogg|aac|flac)(\?|$)/i.test(url)) return { kind: "audio", embed: url };
  return { kind: "video", embed: url };
}

export function MediaEmbed({ url, type }: MediaEmbedProps) {
  const { kind, embed } = getEmbedInfo(url);

  if (kind === "youtube") {
    // Both Audio and Video clips use the zoomed-in container hack to hide the YouTube title bar automatically!
    // For audio clips, we constrain the height to a narrow slit so it feels more like an "audio player"
    // instead of taking up massive screen space, but they still get to see the zoomed/cropped music video playing!
    const heightClass = type === "audioclip" ? "h-32" : "aspect-video";
    
    return (
      <div className={`w-full ${heightClass} rounded-xl overflow-hidden bg-black shadow-lg mb-2 relative pointer-events-none`}>
        <iframe
          src={embed}
          allow="autoplay; encrypted-media"
          title={type === "audioclip" ? "Music clip" : "Video clip"}
          className="absolute inset-0 w-[110%] h-[120%] -left-[5%] -top-[10%] border-0 pointer-events-none"
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
