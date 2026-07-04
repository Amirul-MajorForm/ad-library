export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string;
}

export interface MetaActionValue {
  action_type: string;
  value: string;
}

export interface MetaInsights {
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  reach?: string;
  frequency?: string;
  actions?: MetaActionValue[];
  cost_per_action_type?: MetaActionValue[];
}

export interface MetaLinkData {
  picture?: string;
  message?: string;
  name?: string;
  child_attachments?: unknown[];
}

export interface MetaPhotoData {
  caption?: string;
}

export interface MetaObjectStorySpec {
  link_data?: MetaLinkData;
  photo_data?: MetaPhotoData;
}

export interface MetaCreativeCard {
  title?: string;
  body?: string;
}

export interface MetaCreative {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  image_url?: string;
  thumbnail_url?: string;
  object_story_spec?: MetaObjectStorySpec;
  asset_feed_spec?: {
    videos?: unknown[];
  };
  video_id?: string;
  call_to_action_type?: string;
  snapshot?: {
    cards?: MetaCreativeCard[];
  };
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  adset_id?: string;
  campaign_id?: string;
  creative?: MetaCreative;
  insights?: {
    data?: MetaInsights[];
  };
}

export interface MetaApiError {
  message: string;
  type?: string;
  code?: number;
  fbtrace_id?: string;
}

export type AdFormat = 'Image' | 'Video' | 'Carousel' | 'Dynamic';

export interface ProcessedAd {
  id: string;
  name: string;
  status: string;
  format: AdFormat;
  thumbnail: string | null;
  body: string;
  title: string;
  cta: string;
  campaignId: string | null;
  campaignName: string;
  adsetId: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  reach: number;
  frequency: number;
  conversions: number;
  costPerConversion: number;
}

export type AdStatusFilter = 'ACTIVE' | 'ALL';
export type DateRangeDays = 7 | 14 | 30;

export interface AdsApiResponse {
  ads: ProcessedAd[];
}
