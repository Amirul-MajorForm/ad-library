import { NextRequest, NextResponse } from 'next/server';
import { buildUrl, fetchGraph, MetaApiRequestError, GRAPH_BASE } from '@/lib/metaClient';
import { processAd } from '@/lib/processAd';
import type { MetaAd } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED_DAYS = new Set(['7', '14', '30']);
const MAX_ADS = 200;
const MAX_PAGES = 5; // safety cap on page fetches while walking toward MAX_ADS
const MIN_CREATED_TIME = '2026-01-01'; // only pull ads created on/after this date
const THUMBNAIL_SIZE = '600'; // request larger creative thumbnails than Meta's small default

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-meta-token')?.trim();
  if (!token || token.length < 10) {
    return NextResponse.json(
      { error: { message: 'Missing or invalid Meta API token.' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId')?.trim();
  const days = searchParams.get('days')?.trim() || '14';
  const status = searchParams.get('status')?.trim() === 'ALL' ? 'ALL' : 'ACTIVE';

  if (!accountId) {
    return NextResponse.json(
      { error: { message: 'Missing accountId.' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json(
      { error: { message: 'Invalid days parameter. Must be 7, 14, or 30.' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const effectiveStatus = status === 'ACTIVE' ? '["ACTIVE"]' : '["ACTIVE","PAUSED","ARCHIVED"]';
  const filtering = JSON.stringify([{ field: 'created_time', operator: 'GREATER_THAN', value: MIN_CREATED_TIME }]);

  const fields = [
    'id',
    'name',
    'status',
    'effective_status',
    'adset_id',
    'campaign_id',
    'creative{id,name,title,body,image_url,thumbnail_url,video_id,call_to_action_type,' +
      'object_story_spec{link_data{picture,message,name,child_attachments{link}},photo_data{caption}},' +
      'asset_feed_spec{videos{video_id}}}',
    `insights.date_preset(last_${days}d).as(insightsRange){spend,impressions,clicks,ctr,cpc,reach,frequency,actions,cost_per_action_type}`,
    'insights.date_preset(yesterday).as(insightsRecent){spend}',
  ].join(',');

  try {
    const adsUrl = buildUrl(`/${accountId}/ads`, {
      fields,
      limit: '100',
      effective_status: effectiveStatus,
      filtering,
      thumbnail_width: THUMBNAIL_SIZE,
      thumbnail_height: THUMBNAIL_SIZE,
      access_token: token,
    });

    const first = await fetchGraph<{ data: MetaAd[]; paging?: { next?: string } }>(adsUrl);
    let ads: MetaAd[] = first.data || [];

    let nextUrl = first.paging?.next;
    let pagesFetched = 0;
    while (nextUrl && ads.length < MAX_ADS && pagesFetched < MAX_PAGES) {
      if (!nextUrl.startsWith(GRAPH_BASE) && !nextUrl.startsWith('https://graph.facebook.com/')) break;
      const next = await fetchGraph<{ data: MetaAd[]; paging?: { next?: string } }>(nextUrl);
      ads = ads.concat(next.data || []);
      nextUrl = next.paging?.next;
      pagesFetched++;
    }

    ads = ads.slice(0, MAX_ADS);

    if (ads.length === 0) {
      return NextResponse.json({ ads: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const campaignIds = [...new Set(ads.map((a) => a.campaign_id).filter((id): id is string => Boolean(id)))];
    let campaignMap: Record<string, string> = {};
    if (campaignIds.length) {
      try {
        const batchUrl = buildUrl('/', {
          ids: campaignIds.slice(0, 50).join(','),
          fields: 'id,name',
          access_token: token,
        });
        const batchData = await fetchGraph<Record<string, { id: string; name: string }>>(batchUrl);
        campaignMap = Object.fromEntries(Object.entries(batchData).map(([id, obj]) => [id, obj.name]));
      } catch {
        // Campaign name enrichment is best-effort; ads still render with a fallback name.
      }
    }

    const processed = ads.map((ad) => processAd(ad, campaignMap)).sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ ads: processed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof MetaApiRequestError) {
      return NextResponse.json(
        { error: { message: err.message, code: err.fbError?.code, fbtrace_id: err.fbError?.fbtrace_id } },
        { status: err.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(
      { error: { message: 'Unexpected error fetching ads.' } },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
