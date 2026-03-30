import React from 'react';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
}

/**
 * Simple QR Code display using a public API.
 * For production, consider a client-side library like qrcode.react
 */
export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({ value, size = 200 }) => {
  const encodedValue = encodeURIComponent(value);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&format=png&margin=8`;

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        className="rounded-lg border"
      />
    </div>
  );
};
