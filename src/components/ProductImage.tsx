import { useState } from 'react';
import { IceCreamCone } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#dceeff] via-[#eef6ff] to-[#cfe5ff] text-[#2563eb] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/90 shadow-sm flex items-center justify-center mb-2">
          <IceCreamCone className="w-6 h-6 text-[#2563eb]" />
        </div>
        <span className="text-xs font-semibold text-[#173b67] line-clamp-2 max-w-[160px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
