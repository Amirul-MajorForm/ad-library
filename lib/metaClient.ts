import type { MetaApiError } from './types';

export const GRAPH_VERSION = 'v20.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class MetaApiRequestError extends Error {
  status: number;
  fbError?: MetaApiError;

  constructor(message: string, status: number, fbError?: MetaApiError) {
    super(message);
    this.name = 'MetaApiRequestError';
    this.status = status;
    this.fbError = fbError;
  }
}

/**
 * Fetches a Graph API URL and throws MetaApiRequestError on any Graph-reported
 * error, normalizing the shape callers have to handle.
 */
export async function fetchGraph<T>(url: string): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new MetaApiRequestError('Network error reaching the Meta Graph API.', 502);
  }

  let data: unknown;
  try {
    data = await resp.json();
  } catch {
    throw new MetaApiRequestError('Meta returned an unreadable response.', 502);
  }

  const body = data as { error?: MetaApiError };
  if (body.error) {
    throw new MetaApiRequestError(body.error.message, resp.status >= 400 ? resp.status : 400, body.error);
  }

  return data as T;
}

export function buildUrl(path: string, params: Record<string, string>): string {
  const usp = new URLSearchParams(params);
  return `${GRAPH_BASE}${path}?${usp.toString()}`;
}
