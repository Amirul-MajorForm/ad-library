import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const APIFY_ACTOR = 'apify~instagram-profile-scraper';
const POST_LIMIT = 30;

interface ApifyPost {
  type?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  timestamp?: string;
  url?: string;
  hashtags?: string[];
  mentions?: string[];
  locationName?: string;
  alt?: string;
  productType?: string;
}

interface ApifyProfile {
  username?: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  isVerified?: boolean;
  profilePicUrl?: string;
  latestPosts?: ApifyPost[];
}

async function runApifyScraper(profileUrl: string, apifyKey: string): Promise<ApifyProfile> {
  const username = extractUsername(profileUrl);
  if (!username) throw new Error('Could not extract username from URL.');

  const runResp = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apifyKey}&timeout=120&memory=512`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [username],
        resultsLimit: POST_LIMIT,
      }),
    },
  );

  if (!runResp.ok) {
    const text = await runResp.text();
    throw new Error(`Apify error ${runResp.status}: ${text.slice(0, 300)}`);
  }

  const items: ApifyProfile[] = await runResp.json();
  if (!items || items.length === 0) throw new Error('No data returned from Apify. The profile may be private or the username is incorrect.');

  return items[0];
}

function extractUsername(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\/|\/$/g, '').split('/');
    return parts[0] || null;
  } catch {
    const match = url.match(/instagram\.com\/([A-Za-z0-9._]+)/);
    return match ? match[1] : null;
  }
}

function buildPostsSummary(posts: ApifyPost[]): string {
  return posts
    .slice(0, POST_LIMIT)
    .map((p, i) => {
      const type = p.productType || p.type || 'unknown';
      const caption = (p.caption || '').slice(0, 500);
      const likes = p.likesCount ?? '?';
      const comments = p.commentsCount ?? '?';
      const views = p.videoViewCount ?? p.videoPlayCount ?? null;
      const hashtags = (p.hashtags || []).join(' ');
      const date = p.timestamp ? new Date(p.timestamp).toISOString().split('T')[0] : 'unknown';
      return [
        `Post ${i + 1} [${type.toUpperCase()}] — ${date}`,
        `Engagement: ${likes} likes, ${comments} comments${views ? `, ${views} views` : ''}`,
        `Caption: ${caption || '(no caption)'}`,
        hashtags ? `Hashtags: ${hashtags}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n---\n\n');
}

function buildAnalysisPrompt(profile: ApifyProfile, postsSummary: string): string {
  const meta = [
    `Username: @${profile.username || 'unknown'}`,
    profile.fullName ? `Name: ${profile.fullName}` : '',
    profile.biography ? `Bio: ${profile.biography}` : '',
    profile.followersCount != null ? `Followers: ${profile.followersCount.toLocaleString()}` : '',
    profile.postsCount != null ? `Total posts: ${profile.postsCount}` : '',
    profile.isVerified ? 'Verified: yes' : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `You are a senior creative strategist specialising in social media content and paid advertising. Analyse the following Instagram profile and its last ${POST_LIMIT} posts. Return a structured, actionable report in the exact JSON format specified below. Be specific and evidence-based — reference actual posts, captions, and patterns you observe in the data.

## Profile
${meta}

## Last ${POST_LIMIT} Posts
${postsSummary}

## Required JSON Output

Return ONLY valid JSON matching this exact structure:

{
  "profileSnapshot": {
    "handle": "@username",
    "niche": "one-line niche description",
    "followerCount": 0,
    "postsAnalysed": 0,
    "overallTone": "2-3 word tone summary",
    "aestheticSummary": "2 sentences on visual style and aesthetic consistency across posts"
  },
  "contentPillars": [
    {
      "name": "Pillar Name",
      "description": "What this pillar covers and why it exists",
      "frequency": "X out of 30 posts",
      "topPost": "Brief description of the strongest example post",
      "strategicPurpose": "What this pillar does for the audience and brand"
    }
  ],
  "hookAnalysis": {
    "dominantHookTypes": ["list", "of", "hook", "types", "observed"],
    "hookStrength": "strong | moderate | weak",
    "bestHookExample": "Quote or describe the best opening line/visual hook observed",
    "weaknesses": "What hook patterns are missing or underperforming",
    "recommendation": "Specific actionable advice on improving hooks"
  },
  "copyStrategy": {
    "avgCaptionLength": "short | medium | long",
    "writingStyle": "Describe the voice, tone, and writing patterns",
    "ctaUsage": "How and how often CTAs appear",
    "emojiUsage": "heavy | moderate | minimal | none",
    "hashtagStrategy": "Describe hashtag volume and targeting approach",
    "copyStrengths": "What the copy does well",
    "copyGaps": "What is missing or underperforming in the copy"
  },
  "engagementPatterns": {
    "avgLikesPerPost": 0,
    "avgCommentsPerPost": 0,
    "bestPerformingFormat": "image | video | reel | carousel",
    "bestPerformingPillar": "Which content pillar drives most engagement",
    "engagementInsight": "2-3 sentences on what the engagement data tells us about what the audience responds to"
  },
  "creativeOpportunities": [
    {
      "opportunity": "Title of the opportunity",
      "rationale": "Why this is an opportunity based on what you see in the data",
      "howTo": "Concrete steps to execute this"
    }
  ],
  "paidAdPotential": {
    "topOrganicToTest": "Which type of organic content from this profile would likely translate best to paid ads",
    "suggestedAdFormats": ["list", "of", "formats"],
    "audienceSignals": "What the organic content signals about the audience's interests and pain points",
    "creativeAngle": "The single strongest creative angle this brand should lead with in ads"
  },
  "strategistVerdict": "3-4 sentence overall verdict on this account's content strategy — be direct and honest about both strengths and the most important thing they need to fix."
}

Return ONLY the JSON. No markdown fences, no preamble.`;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const apifyKey = process.env.APIFY_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!apifyKey) return NextResponse.json({ error: 'APIFY_API_KEY not configured on server.' }, { status: 500 });
    if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured on server.' }, { status: 500 });

    const profile = await runApifyScraper(url, apifyKey);
    const posts = profile.latestPosts || [];
    if (posts.length === 0) throw new Error('No posts found. The account may be private or have no posts.');

    const postsSummary = buildPostsSummary(posts);
    const prompt = buildAnalysisPrompt(profile, postsSummary);

    const client = new Anthropic({ apiKey: anthropicKey });
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let report;
    try {
      report = JSON.parse(rawText);
    } catch {
      throw new Error('Claude returned invalid JSON. Raw: ' + rawText.slice(0, 200));
    }

    return NextResponse.json({
      report,
      meta: {
        username: profile.username,
        postsScraped: posts.length,
        followersCount: profile.followersCount,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
