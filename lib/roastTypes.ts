export interface RoastDiagnosisItem {
  layer: string;
  dimension: string;
  issue: string;
}

export interface RoastQuadrant {
  x_score: number;
  y_score: number;
  quadrant_name: string;
  quadrant_implication: string;
}

export interface RoastHeadlineRecommendation {
  strategy: string;
  headline: string;
  rationale: string;
}

export interface RoastCtaRecommendation {
  type: 'cta';
  text: string;
  rationale: string;
}

export interface RoastVisualRecommendation {
  type: 'visual';
  text: string;
}

export type RoastRecommendation = RoastHeadlineRecommendation | RoastCtaRecommendation | RoastVisualRecommendation;

export interface RoastResult {
  roast_score: number;
  roast_verdict: string;
  focus_response: string | null;
  layer1: {
    label: string;
    score: number;
    hook_strength: number;
    emotional_pull: number;
    brand_linkage: number;
  };
  layer2: {
    label: string;
    score: number;
    message_clarity: number;
    audience_fit: number;
    cta_logic: number;
  };
  diagnosis: RoastDiagnosisItem[];
  quadrant: RoastQuadrant;
  recommendations: RoastRecommendation[];
}

export interface Categorization {
  creative_type: string;
  messaging_angle: string;
  target_audience: string;
}

export interface CreativeAnalysis {
  roast: RoastResult;
  categorization: Categorization;
}
