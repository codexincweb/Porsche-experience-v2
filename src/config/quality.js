// Quality presets. The tier names match the Phase 1 device profile so the
// existing detection keeps working.

export const TIERS = ["high", "balanced", "performance"];

export const PRESETS = {
  high: {
    maxPixelRatio: 1.75,
    antialias: true,
    particleSide: 192, // 36,864 particles
  },
  balanced: {
    maxPixelRatio: 1.25,
    antialias: false,
    particleSide: 128, // 16,384
  },
  performance: {
    maxPixelRatio: 1,
    antialias: false,
    particleSide: 80, // 6,400
  },
};

// Frame-time governor settings (DeviceQualityManager).
export const GOVERNOR = {
  window: 90, // frames per measurement window
  slowMs: 26, // average frame time that counts as "slow"
  strikes: 2, // consecutive slow windows before dropping a tier
  warmupFrames: 120,
  minPixelRatio: 0.75,
};
