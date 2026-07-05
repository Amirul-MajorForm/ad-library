import { NextRequest, NextResponse } from 'next/server';
import { buildUrl, fetchGraph, MetaApiRequestError, GRAPH_BASE } from '@/lib/metaClient';
import { processAd } from '@/lib/processAd';
import type { MetaAd } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED_DAYS = new Set(['7', '14', '30']);
const MAX_ADS = 200;
const MAX_PAGES = 5; // safety cap on page fetches while walking toward MAX_ADS
const THUMBNAIL_SIZE = '1080'; // request larger creative thumbnails than Meta's small default
const BATCH_SIZE = 50; // chunk size for campaign/insights/image-hash/video batch lookups

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

  const fields = [
    'id',
    'name',
    'status',
    'effective_status',
    'adset_id',
    'campaign_id',
    'creative{id,name,title,body,image_url,thumbnail_url,image_hash,video_id,call_to_action_type,' +
      'object_story_spec{link_data{picture,image_hash,message,name,child_attachments{link}},photo_data{caption}},' +
      'asset_feed_spec{videos{video_id},images{hash}}}',
    `insights.date_preset(last_${days}d){spend,impressions,clicks,ctr,cpc,reach,frequency,actions,cost_per_action_type}`,
  ].join(',');

  try {
    const adsUrl = buildUrl(`/${accountId}/ads`, {
      fields,
      limit: '100',
      effective_status: effectiveStatus,
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

    // Drop ads with zero spend in the trailing 90 days, regardless of creation
    // date, so stale/dormant ads never show up. Fails open: if the lookup
    // itself errors for a batch, those ads are kept rather than silently
    // dropped (we don't want a transient API hiccup to empty the results).
    const adIds = ads.map((a) => a.id);
    const spend90ById: Record<string, number> = {};
    const spend90Unknown = new Set<string>();
    for (const idBatch of chunk(adIds, BATCH_SIZE)) {
      try {
        const url90 = buildUrl(`/${accountId}/insights`, {
          level: 'ad',
          date_preset: 'last_90d',
          fields: 'ad_id,spend',
          filtering: JSON.stringify([{ field: 'ad.id', operator: 'IN', value: idBatch }]),
          limit: String(BATCH_SIZE),
          access_token: token,
        });
        const data90 = await fetchGraph<{ data: { ad_id: string; spend?: string }[] }>(url90);
        idBatch.forEach((id) => (spend90ById[id] = 0));
        for (const row of data90.data || []) {
          spend90ById[row.ad_id] = parseFloat(row.spend || '0');
        }
      } catch {
        idBatch.forEach((id) => spend90Unknown.add(id));
      }
    }
    ads = ads.filter((a) => spend90Unknown.has(a.id) || (spend90ById[a.id] ?? 0) > 0);

    if (ads.length === 0) {
      return NextResponse.json({ ads: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Campaign name enrichment (best-effort)
    const campaignIds = [...new Set(ads.map((a) => a.campaign_id).filter((id): id is string => Boolean(id)))];
    let campaignMap: Record<string, string> = {};
    if (campaignIds.length) {
      try {
        const batchUrl = buildUrl('/', {
          ids: campaignIds.slice(0, BATCH_SIZE).join(','),
          fields: 'id,name',
          access_token: token,
        });
        const batchData = await fetchGraph<Record<string, { id: string; name: string }>>(batchUrl);
        campaignMap = Object.fromEntries(Object.entries(batchData).map(([id, obj]) => [id, obj.name]));
      } catch {
        // best-effort; ads still render with a fallback name
      }
    }

    // "Inactive" detection: ads Meta reports ACTIVE but with zero spend yesterday.
    const recentSpendById: Record<string, number> = {};
    const remainingIds = ads.map((a) => a.id);
    for (const idBatch of chunk(remainingIds, BATCH_SIZE)) {
      try {
        const recentUrl = buildUrl(`/${accountId}/insights`, {
          level: 'ad',
          date_preset: 'yesterday',
          fields: 'ad_id,spend',
          filtering: JSON.stringify([{ field: 'ad.id', operator: 'IN', value: idBatch }]),
          limit: String(BATCH_SIZE),
          access_token: token,
        });
        const recentData = await fetchGraph<{ data: { ad_id: string; spend?: string }[] }>(recentUrl);
        for (const row of recentData.data || []) {
          recentSpendById[row.ad_id] = parseFloat(row.spend || '0');
        }
      } catch {
        // best-effort; ads default to their Meta-reported status if this fails
      }
    }

    // High-res thumbnails: resolve image_hash -> original uploaded image URL
    // via the adimages library, since image_url/thumbnail_url are often
    // scaled-down placement renders rather than the source asset.
    const hashes = [
      ...new Set(
        ads
          .map(
            (a) =>
              a.creative?.image_hash ||
              a.creative?.object_story_spec?.link_data?.image_hash ||
              a.creative?.asset_feed_spec?.images?.[0]?.hash,
          )
          .filter((h): h is string => Boolean(h)),
      ),
    ];
    const hashToUrl: Record<string, string> = {};
    for (const hashBatch of chunk(hashes, BATCH_SIZE)) {
      try {
        const imagesUrl = buildUrl(`/${accountId}/adimages`, {
          hashes: JSON.stringify(hashBatch),
          fields: 'hash,url',
          access_token: token,
        });
        const imagesData = await fetchGraph<{ data: { hash: string; url?: string }[] }>(imagesUrl);
        for (const row of imagesData.data || []) {
          if (row.url) hashToUrl[row.hash] = row.url;
        }
      } catch {
        // best-effort; falls back to image_url/thumbnail_url
      }
    }

    // High-res video thumbnails + playable source: Meta's video object exposes
    // a range of generated thumbnails at different resolutions (pick the
    // largest instead of the small default thumbnail_url) and a direct
    // `source` URL for actual playback in the detail modal.
    const videoIds = [...new Set(ads.map((a) => a.creative?.video_id).filter((v): v is string => Boolean(v)))];
    const videoThumbMap: Record<string, string> = {};
    const videoSrcMap: Record<string, string> = {};
    for (const videoBatch of chunk(videoIds, BATCH_SIZE)) {
      try {
        const videosUrl = buildUrl('/', {
          ids: videoBatch.join(','),
          fields: 'thumbnails{uri,width},source',
          access_token: token,
        });
        const videosData = await fetchGraph<
          Record<string, { thumbnails?: { data?: { uri: string; width?: number }[] }; source?: string }>
        >(videosUrl);
        for (const [id, obj] of Object.entries(videosData)) {
          const candidates = obj.thumbnails?.data || [];
          if (candidates.length) {
            const best = candidates.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a));
            if (best.uri) videoThumbMap[id] = best.uri;
          }
          if (obj.source) videoSrcMap[id] = obj.source;
        }
      } catch {
        // best-effort; falls back to creative.thumbnail_url, no playback
      }
    }

    const processed = ads
      .map((ad) => processAd(ad, campaignMap, recentSpendById, hashToUrl, videoThumbMap, videoSrcMap))
      .sort((a, b) => b.spend - a.spend);

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
