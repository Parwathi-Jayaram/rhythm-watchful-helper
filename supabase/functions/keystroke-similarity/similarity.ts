export interface KeystrokeFeatures {
  dwellTimes: number[];
  flightTimes: number[];
  keyPressDurations?: number[];
  interKeyLatencies?: number[];
  pressure?: number[];
  typingSpeed?: number;
  totalDuration?: number;
}

export interface BaselineProfile {
  features: KeystrokeFeatures;
  createdAt: string;
  version: number;
}

export interface SimilarityResult {
  score: number;
  passed: boolean;
  threshold: number;
  details?: {
    dwellSimilarity: number;
    flightSimilarity: number;
    speedSimilarity: number;
  };
}

export interface SimilarityConfig {
  threshold: number;
  weights: {
    dwell: number;
    flight: number;
    speed: number;
  };
  minSamples: number;
}

export const DEFAULT_CONFIG: SimilarityConfig = {
  threshold: 0.75,
  weights: {
    dwell: 0.4,
    flight: 0.4,
    speed: 1.0,
  },
  minSamples: 5,
};

function normalizeArray(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max === min) return arr.map(() => 0.5);
  return arr.map((v) => (v - min) / (max - min));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function manhattanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / a.length;
}

function compareArrays(baseline: number[], sample: number[]): number {
  const normBaseline = normalizeArray(baseline);
  const normSample = normalizeArray(sample);
  const cosSim = cosineSimilarity(normBaseline, normSample);
  const manhattan = manhattanDistance(normBaseline, normSample);
  const manhattanSim = 1 / (1 + manhattan);
  return (cosSim + manhattanSim) / 2;
}

export function extractFeatures(keystrokeData: {
  events: Array<{ key: string; type: "down" | "up"; timestamp: number; pressure?: number }>;
  text: string;
}): KeystrokeFeatures {
  const events = keystrokeData.events.sort((a, b) => a.timestamp - b.timestamp);
  const dwellTimes: number[] = [];
  const flightTimes: number[] = [];
  const keyPressDurations: number[] = [];
  const interKeyLatencies: number[] = [];
  const pressure: number[] = [];

  const keyDownTimes = new Map<string, number>();

  for (const event of events) {
    if (event.type === "down") {
      keyDownTimes.set(event.key, event.timestamp);
      if (event.pressure !== undefined) {
        pressure.push(event.pressure);
      }
    } else if (event.type === "up") {
      const downTime = keyDownTimes.get(event.key);
      if (downTime !== undefined) {
        const dwell = event.timestamp - downTime;
        dwellTimes.push(dwell);
        keyPressDurations.push(dwell);
        keyDownTimes.delete(event.key);
      }
    }
  }

  for (let i = 1; i < events.length; i++) {
    if (events[i].type === "down" && events[i - 1].type === "up") {
      const flight = events[i].timestamp - events[i - 1].timestamp;
      flightTimes.push(flight);
      interKeyLatencies.push(flight);
    }
  }

  const totalDuration = events.length > 0
    ? events[events.length - 1].timestamp - events[0].timestamp
    : 0;
  const typingSpeed = totalDuration > 0 ? keystrokeData.text.length / (totalDuration / 1000) : 0;

  return {
    dwellTimes,
    flightTimes,
    keyPressDurations,
    interKeyLatencies,
    pressure: pressure.length > 0 ? pressure : undefined,
    typingSpeed,
    totalDuration,
  };
}

export function computeSimilarity(
  baseline: BaselineProfile,
  sample: KeystrokeFeatures,
  config: SimilarityConfig = DEFAULT_CONFIG
): SimilarityResult {
  const b = baseline.features;
  const s = sample;

  if (b.dwellTimes.length < config.minSamples || s.dwellTimes.length < config.minSamples) {
    return {
      score: 0,
      passed: false,
      threshold: config.threshold,
      details: { dwellSimilarity: 0, flightSimilarity: 0, speedSimilarity: 0 },
    };
  }

  const dwellSim = compareArrays(b.dwellTimes, s.dwellTimes);
  const flightSim = compareArrays(b.flightTimes, s.flightTimes);

  const bSpeed = b.typingSpeed || 0;
  const sSpeed = s.typingSpeed || 0;
  const speedSim = bSpeed > 0 && sSpeed > 0
    ? 1 - Math.abs(bSpeed - sSpeed) / Math.max(bSpeed, sSpeed)
    : 0;

  const weightedScore =
    (dwellSim * config.weights.dwell +
      flightSim * config.weights.flight +
      speedSim * config.weights.speed) /
    (config.weights.dwell + config.weights.flight + config.weights.speed);

  return {
    score: Math.max(0, Math.min(1, weightedScore)),
    passed: weightedScore >= config.threshold,
    threshold: config.threshold,
    details: {
      dwellSimilarity: dwellSim,
      flightSimilarity: flightSim,
      speedSimilarity: speedSim,
    },
  };
}

export function updateBaseline(
  currentBaseline: BaselineProfile,
  newSample: KeystrokeFeatures,
  alpha: number = 0.3
): BaselineProfile {
  const updatedFeatures: KeystrokeFeatures = {
    dwellTimes: blendArrays(currentBaseline.features.dwellTimes, newSample.dwellTimes, alpha),
    flightTimes: blendArrays(currentBaseline.features.flightTimes, newSample.flightTimes, alpha),
    keyPressDurations: blendArrays(
      currentBaseline.features.keyPressDurations || [],
      newSample.keyPressDurations || [],
      alpha
    ),
    interKeyLatencies: blendArrays(
      currentBaseline.features.interKeyLatencies || [],
      newSample.interKeyLatencies || [],
      alpha
    ),
    pressure: currentBaseline.features.pressure && newSample.pressure
      ? blendArrays(currentBaseline.features.pressure, newSample.pressure, alpha)
      : currentBaseline.features.pressure || newSample.pressure,
    typingSpeed: blendValue(
      currentBaseline.features.typingSpeed || 0,
      newSample.typingSpeed || 0,
      alpha
    ),
    totalDuration: blendValue(
      currentBaseline.features.totalDuration || 0,
      newSample.totalDuration || 0,
      alpha
    ),
  };

  return {
    features: updatedFeatures,
    createdAt: new Date().toISOString(),
    version: currentBaseline.version + 1,
  };
}

function blendArrays(a: number[], b: number[], alpha: number): number[] {
  const maxLen = Math.max(a.length, b.length);
  const result: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    result.push(va * (1 - alpha) + vb * alpha);
  }
  return result;
}

function blendValue(a: number, b: number, alpha: number): number {
  return a * (1 - alpha) + b * alpha;
}