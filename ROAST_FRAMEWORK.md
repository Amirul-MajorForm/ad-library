# ROAST by MajorForm — Framework Reference

**ROAST** = Rapid Output Assessment & Strategy Tool  
A two-layer creative scoring system for paid media ads, powered by Claude.

---

## What it does

Accepts up to 5 image or video ad creatives (or TikTok / Instagram URLs) and returns a structured analysis covering scores, diagnosis, creative positioning, and rewritten copy recommendations.

---

## Scoring framework

### Layer 1: Creative Power (predicts long-term effectiveness)

| Dimension | What it measures |
|---|---|
| **Hook Strength** | Does the opening frame/second stop the scroll and create immediate intrigue? |
| **Emotional Pull** | Does the creative make the viewer feel something connected to the brand or product? |
| **Brand Linkage** | Would someone know who this ad is for without the logo? |

### Layer 2: Message Mechanics (predicts short-term activation and conversion)

| Dimension | What it measures |
|---|---|
| **Message Clarity** | Can a viewer state the core offer in one sentence after seeing this? |
| **Audience Fit** | Does the language match how the target audience describes their own problem, or does it sound like the brand talking about itself? |
| **CTA Logic** | Is the next step obvious, motivated, and proportionate to the ask? |

---

## Funnel-weighted ROAST Score

The overall score shifts weighting based on the campaign objective:

| Objective | Layer 1 weight | Layer 2 weight |
|---|---|---|
| Reach / Video Views | 65% | 35% |
| Traffic | 50% | 50% |
| Purchase / Leads / Installs | 40% | 60% |
| Not set | 50% | 50% |

---

## What is woven into the diagnosis (not shown as separate scores)

- **Customer awareness stage** (Schwartz's five stages: Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware) — explained within the Audience Fit diagnosis item
- **Trust signal audit** (social proof, guarantees, authority markers, claim specificity) — explained within the CTA Logic diagnosis item

---

## Output JSON schema

```json
{
  "roast_score": 7,
  "roast_verdict": "One punchy sentence — the single most important insight about this creative.",
  "focus_response": "Direct answer to any user focus query, or null.",
  "layer1": {
    "label": "Creative Power",
    "score": 7.3,
    "hook_strength": 8,
    "emotional_pull": 7,
    "brand_linkage": 7
  },
  "layer2": {
    "label": "Message Mechanics",
    "score": 6.0,
    "message_clarity": 6,
    "audience_fit": 5,
    "cta_logic": 7
  },
  "diagnosis": [
    {
      "layer": "Message Mechanics",
      "dimension": "Audience fit",
      "issue": "2-3 sentences on what is happening and why it matters. For audience_fit: includes which awareness stage the creative targets and whether it matches the intended audience. For cta_logic: names which trust signals are present and which one addition would most improve the ask."
    }
  ],
  "quadrant": {
    "x_score": 8,
    "y_score": 7,
    "quadrant_name": "High Impact",
    "quadrant_implication": "One sentence on what this positioning means for how this creative will perform."
  },
  "recommendations": [
    { "strategy": "Outcome-led", "headline": "Rewritten headline", "rationale": "One sentence why." },
    { "strategy": "Pain-point", "headline": "Rewritten headline", "rationale": "One sentence why." },
    { "strategy": "Curiosity gap", "headline": "Rewritten headline", "rationale": "One sentence why." },
    { "type": "cta", "text": "CTA copy", "rationale": "Brief rationale." },
    { "type": "visual", "text": "Specific visual direction a designer can act on immediately." }
  ]
}
```

### Diagnosis — only dimensions scoring 7 or below are included

### Quadrant zones

| Quadrant name | X (Hook Strength) | Y (Emotional Pull) |
|---|---|---|
| High Impact | High | High |
| Emotionally Rich Low Clarity | Low | High |
| Strong Message Low Emotion | High | Low |
| Needs Work | Low | Low |

---

## Score colour banding

| Range | Meaning |
|---|---|
| 8–10 | Strong |
| 5–7 | Needs attention |
| 1–4 | Critical issue |

---

## Campaign context inputs (optional, all affect scoring)

| Field | Effect |
|---|---|
| **Platform** | Multi-select: Meta, TikTok, Google Display, LinkedIn, YouTube |
| **Objective** | Single-select: Reach, Video Views, Traffic, Purchase, Leads, Installs — changes funnel weighting |
| **Target audience** | Used to assess Audience Fit and awareness stage calibration |
| **Brand / product name** | Used for Brand Linkage and overall context |
| **Focus query** | Free text — Claude answers this directly in `focus_response` |

---

## Comparison mode (2–3 creatives)

When comparing, all creatives are assessed together and the output includes:

```json
{
  "winner": "Creative 1",
  "winner_summary": "2-3 sentences why this creative wins.",
  "recommendation": "Which to run and in what scenario.",
  "blend_recommendation": "Best elements from each to combine in the next iteration.",
  "creatives": [
    {
      "label": "Creative 1",
      "overall_score": 7,
      "scores": {
        "hook_strength": 8, "emotional_pull": 7, "brand_linkage": 6,
        "message_clarity": 7, "audience_fit": 5, "cta_logic": 6
      },
      "unique_strengths": ["What this creative does better than the others"],
      "key_weakness": "The single most important thing holding this creative back."
    }
  ],
  "dimension_winners": {
    "hook_strength": "Creative 1",
    "emotional_pull": "Creative 2",
    "brand_linkage": "Creative 1",
    "message_clarity": "Creative 2",
    "audience_fit": "Creative 1",
    "cta_logic": "Creative 1"
  }
}
```

---

## System prompt

> You are a senior creative strategist at a performance digital marketing agency with deep expertise in consumer psychology, copywriting frameworks, and paid media. You use the ROAST framework — a two-layer scoring system backed by creative effectiveness research. Respond with valid JSON only. Never use em dashes or en dashes in output.

---

## Key rules

- Scores are integers 1–10; layer scores are averages (can be decimal)
- Diagnosis only includes dimensions scoring 7 or below
- No em dashes or en dashes anywhere in output
- `focus_response` is null if no focus query was provided
- For video ads, `hook_strength` label changes to "Hook / opening frame"
- For image ads, a single compressed image is sent; for video, 6 evenly-spaced frames are extracted and sent in chronological order
