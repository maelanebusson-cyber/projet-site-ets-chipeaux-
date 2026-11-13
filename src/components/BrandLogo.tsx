import { useState } from 'react';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export function BrandLogo({
  className = 'logo',
  alt = "ETS Chipeaux, installation d'équipements thermiques et de climatisation",
}: BrandLogoProps) {
  const [src, setSrc] = useState('/assets/logo-ets-chipeaux.svg');

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      width={1024}
      height={348}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== '/assets/logo-ets-chipeaux.png') {
          setSrc('/assets/logo-ets-chipeaux.png');
        }
      }}
    />
  );
}
