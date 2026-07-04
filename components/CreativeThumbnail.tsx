'use client';

import { useState } from 'react';
import PlaceholderIcon from './PlaceholderIcon';

export default function CreativeThumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="card-creative-placeholder">
        <PlaceholderIcon />
        <span className="placeholder-text">No preview</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}
