import { motion } from "framer-motion";

const MotionDiv = motion.div;

const THEME_MAP = {
  default: {
    radialOverlay:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(23,38,96,0.56),rgba(5,8,22,0.92)_38%,#03040b_100%)]",
    linearOverlay:
      "bg-[linear-gradient(180deg,rgba(4,8,26,0.04)_0%,rgba(4,8,26,0.14)_40%,rgba(4,8,26,0.78)_100%)]",
    ambientGlows: [
      {
        className:
          "absolute left-[-12%] top-[18%] h-[18rem] w-[18rem] rounded-full bg-[#365bff]/20 blur-[7rem] md:h-[24rem] md:w-[24rem]",
        animate: { x: [0, 18, 0], y: [0, -12, 0], scale: [1, 1.08, 1] },
        transition: { duration: 11, repeat: Infinity, ease: "easeInOut" },
      },
      {
        className:
          "absolute right-[-10%] top-[16%] h-[20rem] w-[20rem] rounded-full bg-[#ff1c91]/16 blur-[7rem] md:h-[27rem] md:w-[27rem]",
        animate: { x: [0, -18, 0], y: [0, 16, 0], scale: [1, 1.06, 1] },
        transition: { duration: 13, repeat: Infinity, ease: "easeInOut" },
      },
      {
        className:
          "absolute left-[32%] top-[30%] h-[10rem] w-[18rem] rounded-full bg-[#6d56ff]/14 blur-[5rem]",
        animate: { x: [0, 10, 0], y: [0, -10, 0], scale: [1, 1.05, 1] },
        transition: { duration: 9, repeat: Infinity, ease: "easeInOut" },
      },
    ],
    waveLayers: [
      {
        key: "blue-base",
        className:
          "left-[-20%] bottom-[-16%] h-[34vh] min-h-[12rem] w-[72%] rounded-[50%] opacity-90 md:h-[40vh]",
        dotColor: "rgba(86, 134, 255, 0.92)",
        glowStart: "rgba(40, 89, 255, 0.26)",
        glowEnd: "rgba(126, 74, 255, 0.08)",
        backgroundSize: "0.95rem 0.95rem, 100% 100%",
        transform: "perspective(72rem) rotateX(69deg) rotateZ(-8deg)",
        animate: { x: [0, 22, 0], y: [0, -12, 0], scale: [1, 1.03, 1], rotate: [-8, -6.5, -8] },
        transition: { duration: 11, repeat: Infinity, ease: "easeInOut" },
      },
      {
        key: "violet-mid",
        className:
          "left-[12%] bottom-[-10%] h-[28vh] min-h-[10rem] w-[52%] rounded-[50%] opacity-62 md:h-[32vh]",
        dotColor: "rgba(135, 105, 255, 0.84)",
        glowStart: "rgba(116, 89, 255, 0.22)",
        glowEnd: "rgba(255, 59, 174, 0.05)",
        backgroundSize: "1rem 1rem, 100% 100%",
        transform: "perspective(65rem) rotateX(70deg) rotateZ(4deg)",
        animate: { x: [0, -18, 0], y: [0, -10, 0], scale: [1, 1.025, 1], rotate: [4, 6, 4] },
        transition: { duration: 13, repeat: Infinity, ease: "easeInOut" },
      },
      {
        key: "pink-front",
        className:
          "right-[-16%] bottom-[-14%] h-[36vh] min-h-[12rem] w-[68%] rounded-[50%] opacity-92 md:h-[42vh]",
        dotColor: "rgba(255, 73, 185, 0.98)",
        glowStart: "rgba(153, 72, 255, 0.18)",
        glowEnd: "rgba(255, 28, 145, 0.34)",
        backgroundSize: "0.95rem 0.95rem, 100% 100%",
        transform: "perspective(74rem) rotateX(70deg) rotateZ(8deg)",
        animate: { x: [0, -24, 0], y: [0, -14, 0], scale: [1, 1.035, 1], rotate: [8, 5.5, 8] },
        transition: { duration: 10, repeat: Infinity, ease: "easeInOut" },
      },
    ],
    shimmerLines: [
      {
        key: "blue-line",
        className: "left-[-6%] bottom-[28%] h-[0.7rem] w-[26%] rotate-[2deg]",
        gradient:
          "linear-gradient(90deg, rgba(93,131,222,0), rgba(93,131,222,0.92), rgba(93,131,222,0))",
        animate: { x: [0, 16, 0], opacity: [0.5, 0.95, 0.5] },
        transition: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
      },
      {
        key: "pink-line",
        className: "right-[-4%] bottom-[25%] h-[0.78rem] w-[30%] rotate-[-4deg]",
        gradient:
          "linear-gradient(90deg, rgba(255,28,145,0), rgba(255,28,145,0.96), rgba(255,28,145,0))",
        animate: { x: [0, -18, 0], opacity: [0.42, 0.88, 0.42] },
        transition: { duration: 8.5, repeat: Infinity, ease: "easeInOut" },
      },
    ],
  },
  campus: {
    radialOverlay:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(126,217,87,0.18),rgba(5,8,12,0.92)_36%,#020403_100%)]",
    linearOverlay:
      "bg-[linear-gradient(180deg,rgba(11,15,9,0.06)_0%,rgba(11,15,9,0.18)_42%,rgba(11,15,9,0.82)_100%)]",
    ambientGlows: [
      {
        className:
          "absolute left-[-12%] top-[18%] h-[18rem] w-[18rem] rounded-full bg-[#7ED957]/18 blur-[7rem] md:h-[24rem] md:w-[24rem]",
        animate: { x: [0, 18, 0], y: [0, -12, 0], scale: [1, 1.08, 1] },
        transition: { duration: 11, repeat: Infinity, ease: "easeInOut" },
      },
      {
        className:
          "absolute right-[-10%] top-[16%] h-[20rem] w-[20rem] rounded-full bg-[#ffd95a]/16 blur-[7rem] md:h-[27rem] md:w-[27rem]",
        animate: { x: [0, -18, 0], y: [0, 16, 0], scale: [1, 1.06, 1] },
        transition: { duration: 13, repeat: Infinity, ease: "easeInOut" },
      },
      {
        className:
          "absolute left-[32%] top-[30%] h-[10rem] w-[18rem] rounded-full bg-[#7ED957]/12 blur-[5rem]",
        animate: { x: [0, 10, 0], y: [0, -10, 0], scale: [1, 1.05, 1] },
        transition: { duration: 9, repeat: Infinity, ease: "easeInOut" },
      },
    ],
    waveLayers: [
      {
        key: "campus-left",
        className:
          "left-[-20%] bottom-[-16%] h-[34vh] min-h-[12rem] w-[72%] rounded-[50%] opacity-88 md:h-[40vh]",
        dotColor: "rgba(126, 217, 87, 0.9)",
        glowStart: "rgba(126, 217, 87, 0.24)",
        glowEnd: "rgba(255, 217, 90, 0.08)",
        backgroundSize: "0.95rem 0.95rem, 100% 100%",
        transform: "perspective(72rem) rotateX(69deg) rotateZ(-8deg)",
        animate: { x: [0, 22, 0], y: [0, -12, 0], scale: [1, 1.03, 1], rotate: [-8, -6.5, -8] },
        transition: { duration: 11, repeat: Infinity, ease: "easeInOut" },
      },
      {
        key: "campus-mid",
        className:
          "left-[12%] bottom-[-10%] h-[28vh] min-h-[10rem] w-[52%] rounded-[50%] opacity-60 md:h-[32vh]",
        dotColor: "rgba(126, 217, 87, 0.82)",
        glowStart: "rgba(126, 217, 87, 0.22)",
        glowEnd: "rgba(255, 217, 90, 0.05)",
        backgroundSize: "1rem 1rem, 100% 100%",
        transform: "perspective(65rem) rotateX(70deg) rotateZ(4deg)",
        animate: { x: [0, -18, 0], y: [0, -10, 0], scale: [1, 1.025, 1], rotate: [4, 6, 4] },
        transition: { duration: 13, repeat: Infinity, ease: "easeInOut" },
      },
      {
        key: "campus-right",
        className:
          "right-[-16%] bottom-[-14%] h-[36vh] min-h-[12rem] w-[68%] rounded-[50%] opacity-92 md:h-[42vh]",
        dotColor: "rgba(255, 217, 90, 0.96)",
        glowStart: "rgba(126, 217, 87, 0.18)",
        glowEnd: "rgba(255, 217, 90, 0.3)",
        backgroundSize: "0.95rem 0.95rem, 100% 100%",
        transform: "perspective(74rem) rotateX(70deg) rotateZ(8deg)",
        animate: { x: [0, -24, 0], y: [0, -14, 0], scale: [1, 1.035, 1], rotate: [8, 5.5, 8] },
        transition: { duration: 10, repeat: Infinity, ease: "easeInOut" },
      },
    ],
    shimmerLines: [
      {
        key: "campus-green-line",
        className: "left-[-6%] bottom-[28%] h-[0.7rem] w-[26%] rotate-[2deg]",
        gradient:
          "linear-gradient(90deg, rgba(126,217,87,0), rgba(126,217,87,0.92), rgba(126,217,87,0))",
        animate: { x: [0, 16, 0], opacity: [0.5, 0.95, 0.5] },
        transition: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
      },
      {
        key: "campus-yellow-line",
        className: "right-[-4%] bottom-[25%] h-[0.78rem] w-[30%] rotate-[-4deg]",
        gradient:
          "linear-gradient(90deg, rgba(255,217,90,0), rgba(255,217,90,0.96), rgba(255,217,90,0))",
        animate: { x: [0, -18, 0], opacity: [0.42, 0.88, 0.42] },
        transition: { duration: 8.5, repeat: Infinity, ease: "easeInOut" },
      },
    ],
  },
};

export const WaveBackground = ({ variant = "default" }) => {
  const theme = THEME_MAP[variant] || THEME_MAP.default;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050816]">
      <div className={`absolute inset-0 ${theme.radialOverlay}`} />
      <div className={`absolute inset-0 ${theme.linearOverlay}`} />

      {theme.ambientGlows.map((glow, index) => (
        <MotionDiv
          key={`ambient-${variant}-${index}`}
          className={glow.className}
          animate={glow.animate}
          transition={glow.transition}
        />
      ))}

      {theme.waveLayers.map((layer) => (
        <MotionDiv
          key={layer.key}
          className={`absolute ${layer.className} overflow-hidden blur-[0.4px]`}
          animate={layer.animate}
          transition={layer.transition}
          style={{
            transform: layer.transform,
            transformOrigin: "center center",
            backgroundImage: [
              `radial-gradient(circle, ${layer.dotColor} 0 1.55px, transparent 2px)`,
              `linear-gradient(90deg, ${layer.glowStart}, ${layer.glowEnd})`,
            ].join(","),
            backgroundSize: layer.backgroundSize,
            backgroundPosition: "0 0, center",
            boxShadow: `0 0 5rem ${layer.glowEnd}`,
          }}
        >
          <MotionDiv
            className="absolute inset-0"
            animate={{ backgroundPositionX: ["0rem", "1rem", "0rem"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0))",
              mixBlendMode: "screen",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.24),rgba(255,255,255,0)_55%)] opacity-60 mix-blend-screen" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.2)_48%,rgba(0,0,0,0.64)_100%)]" />
        </MotionDiv>
      ))}

      {theme.shimmerLines.map((line) => (
        <MotionDiv
          key={line.key}
          className={`absolute ${line.className} rounded-full blur-[0.7rem]`}
          animate={line.animate}
          transition={line.transition}
          style={{ background: line.gradient }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,rgba(5,8,22,0)_0%,rgba(5,8,22,0.2)_35%,rgba(5,8,22,0.88)_100%)]" />
    </div>
  );
};
