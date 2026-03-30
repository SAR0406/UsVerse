export const floatUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as const },
  },
};

export const staggerChildren = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export const heartbeat = {
  animate: {
    scale: [1, 1.04, 1],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export const springPop = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 15 },
  },
};

export const orbitFloat = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export const stickerDrop = {
  hidden: { y: -30, rotate: -5, opacity: 0 },
  visible: {
    y: 0,
    rotate: Math.random() * 6 - 3,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 12 },
  },
};

export const polaroidFall = {
  hidden: { y: -100, rotate: -8, opacity: 0 },
  visible: {
    y: 0,
    rotate: Math.random() * 4 - 2,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 18, delay: 0.1 },
  },
};

export const glowPulse = {
  animate: {
    boxShadow: [
      "0 0 20px #FF6B9D44, 0 0 40px #FF6B9D22",
      "0 0 30px #FF6B9D66, 0 0 60px #FF6B9D33",
      "0 0 20px #FF6B9D44, 0 0 40px #FF6B9D22",
    ],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export const heartParticleConfig = {
  particles: {
    number: { value: 20 },
    color: { value: ["#FF6B9D", "#FFAB76", "#C8B6E2", "#FFF3B0"] },
    shape: { type: "char", options: { char: { value: ["💕", "✨", "🌸"] } } },
    opacity: {
      value: 1,
      animation: { enable: true, speed: 1, minimumValue: 0 },
    },
    size: { value: { min: 8, max: 20 } },
    move: {
      enable: true,
      speed: 4,
      direction: "top" as const,
      outModes: "out" as const,
      gravity: { enable: true, acceleration: 2 },
    },
    life: { count: 1, duration: { value: 1.5 } },
  },
};

export const countdownCardParticles = Array.from({ length: 14 }, (_, index) => ({
  id: `countdown-p-${index}`,
  symbol: index % 2 === 0 ? "💕" : "✨",
  left: `${6 + ((index * 7) % 88)}%`,
  delay: `${(index % 6) * 0.65}s`,
  duration: `${6 + (index % 4)}s`,
}));
