import type { AdFormat, MetaAd, ProcessedAd } from './types';

const CONVERSION_ACTION_TYPES = ['purchase', 'lead', 'complete_registration', 'submit_application'];
const CPA_ACTION_TYPES = ['purchase', 'lead', 'complete_registration'];

export function processAd(ad: MetaAd, campaignMap: Record<string, string>): ProcessedAd {
  const insights = ad.insights?.data?.[0] ?? {};
  const creative = ad.creative ?? {};

  let thumbnail: string | null = creative.thumbnail_url || creative.image_url || null;
  if (!thumbnail && creative.object_story_spec) {
    const spec = creative.object_story_spec;
    thumbnail = spec.link_data?.image_url || spec.photo_data?.images?.[0]?.url || null;
  }

  let body = creative.body || '';
  if (!body && creative.object_story_spec) {
    body = creative.object_story_spec.link_data?.message || creative.object_story_spec.photo_data?.caption || '';
  }
  if (!body && creative.snapshot?.cards?.[0]?.body) {
    body = creative.snapshot.cards[0].body;
  }

  let title = creative.title || '';
  if (!title && creative.object_story_spec) {
    title = creative.object_story_spec.link_data?.name || '';
  }
  if (!title && creative.snapshot?.cards?.[0]?.title) {
    title = creative.snapshot.cards[0].title;
  }

  let format: AdFormat = 'Image';
  if (creative.video_id) format = 'Video';
  if (creative.asset_feed_spec?.videos?.length) format = 'Video';
  if (creative.object_story_spec?.link_data?.child_attachments?.length) format = 'Carousel';
  if (creative.asset_feed_spec) format = 'Dynamic';

  const spend = parseFloat(insights.spend || '0');
  const impressions = parseInt(insights.impressions || '0', 10);
  const clicks = parseInt(insights.clicks || '0', 10);
  const ctr = parseFloat(insights.ctr || '0');
  const cpc = parseFloat(insights.cpc || '0');
  const reach = parseInt(insights.reach || '0', 10);
  const frequency = parseFloat(insights.frequency || '0');

  let conversions = 0;
  let costPerConversion = 0;
  if (insights.actions) {
    const convAction =
      insights.actions.find((a) => CONVERSION_ACTION_TYPES.includes(a.action_type)) ||
      insights.actions.find((a) => a.action_type.includes('purchase') || a.action_type.includes('lead'));
    if (convAction) conversions = parseInt(convAction.value || '0', 10);
  }
  if (insights.cost_per_action_type) {
    const cpa = insights.cost_per_action_type.find((a) => CPA_ACTION_TYPES.includes(a.action_type));
    if (cpa) costPerConversion = parseFloat(cpa.value || '0');
  }

  return {
    id: ad.id,
    name: ad.name,
    status: ad.effective_status || ad.status,
    format,
    thumbnail,
    body,
    title,
    cta: creative.call_to_action_type || '',
    campaignId: ad.campaign_id ?? null,
    campaignName: (ad.campaign_id && campaignMap[ad.campaign_id]) || 'Unknown Campaign',
    adsetId: ad.adset_id ?? null,
    spend,
    impressions,
    clicks,
    ctr,
    cpc,
    reach,
    frequency,
    conversions,
    costPerConversion,
  };
}
