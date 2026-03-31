/**
 * Keyword Scoring Engine for Deep Research.
 * Computes scores from ads data — no external API needed.
 */

export interface KeywordMetrics {
  adCount: number;
  activeAds: number;
  activeRatio: number;
  avgDaysRunning: number;
  geoCount: number;
  platformCount: number;
  avgAiScore: number;
  newAds7d: number;
  growthRate: number; // (newAds7d / adCount) * 100
}

export interface KeywordScores {
  demandScore: number;
  growthScore: number;
  stabilityScore: number;
  geoScore: number;
  qualityScore: number;
  opportunityScore: number;
  beginnerScore: number;
  evergreenScore: number;
  testNowScore: number;
  signal: "go" | "wait" | "risk";
}

// Normalize value to 0-100 range
function norm(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export function computeScores(m: KeywordMetrics): KeywordScores {
  // Individual scores (0-100)
  const demandScore = norm(m.adCount, 0, 200);              // 200+ ads = max demand
  const growthScore = norm(m.growthRate, 0, 50);             // 50%+ growth = max
  const stabilityScore = norm(m.avgDaysRunning, 0, 120);     // 120+ days avg = max stable
  const geoScore = norm(m.geoCount, 0, 8);                   // 8+ countries = max
  const platformScore = norm(m.platformCount, 0, 4);          // 4+ platforms = max
  const qualityScore = norm(m.activeRatio * m.avgAiScore, 0, 70); // active_ratio * ai_score

  // Composite scores
  const opportunityScore = Math.round(
    demandScore * 0.25 +
    growthScore * 0.20 +
    stabilityScore * 0.20 +
    geoScore * 0.10 +
    platformScore * 0.05 +
    qualityScore * 0.20
  );

  const beginnerScore = Math.round(
    stabilityScore * 0.40 +
    demandScore * 0.30 +
    (100 - norm(m.adCount, 0, 500)) * 0.30 // lower competition = better for beginners
  );

  const evergreenScore = Math.round(
    stabilityScore * 0.50 +
    demandScore * 0.30 +
    geoScore * 0.20
  );

  const testNowScore = Math.round(
    growthScore * 0.50 +
    demandScore * 0.30 +
    qualityScore * 0.20
  );

  // Signal: go (score >= 65 + growth > 0), risk (high growth but low stability = spike), wait (otherwise)
  let signal: "go" | "wait" | "risk" = "wait";
  if (opportunityScore >= 65 && stabilityScore >= 40) {
    signal = "go";
  } else if (growthScore >= 70 && stabilityScore < 30) {
    signal = "risk"; // hype spike
  } else if (opportunityScore >= 50) {
    signal = "wait";
  }

  return {
    demandScore: Math.round(demandScore),
    growthScore: Math.round(growthScore),
    stabilityScore: Math.round(stabilityScore),
    geoScore: Math.round(geoScore),
    qualityScore: Math.round(qualityScore),
    opportunityScore,
    beginnerScore,
    evergreenScore,
    testNowScore,
    signal,
  };
}

/**
 * Generate AI verdict text based on scores.
 */
export function generateVerdict(scores: KeywordScores): string {
  if (scores.signal === "go" && scores.testNowScore >= 70) {
    return "Test now — strong demand + growing";
  }
  if (scores.signal === "go" && scores.evergreenScore >= 70) {
    return "Evergreen opportunity — stable & proven";
  }
  if (scores.signal === "go") {
    return "Good opportunity — worth testing";
  }
  if (scores.signal === "risk") {
    return "Hype spike — high risk, may drop fast";
  }
  if (scores.beginnerScore >= 65) {
    return "Safe for beginners — low risk entry";
  }
  if (scores.opportunityScore >= 40) {
    return "Monitor — needs more data";
  }
  return "Low opportunity — limited signals";
}
