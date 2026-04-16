import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { PHOTO_GUIDELINES } from '../knowledgeBase';

interface PhotoValidation {
  sizeOk: boolean;
  orientationOk: boolean;
  sizeMB: number;
  width: number;
  height: number;
}

export function validatePhoto(file: File): Promise<PhotoValidation> {
  return new Promise((resolve) => {
    const sizeMB = file.size / (1024 * 1024);
    const sizeOk = sizeMB <= PHOTO_GUIDELINES.maxSizeMB;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const orientationOk = img.width >= img.height; // landscape
      resolve({
        sizeOk,
        orientationOk,
        sizeMB: Math.round(sizeMB * 100) / 100,
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ sizeOk, orientationOk: true, sizeMB: Math.round(sizeMB * 100) / 100, width: 0, height: 0 });
    };
    img.src = url;
  });
}

interface Props {
  validation: PhotoValidation | null;
}

export const PhotoValidationBadge: React.FC<Props> = ({ validation }) => {
  if (!validation) return null;

  const warnings: string[] = [];
  if (!validation.sizeOk) warnings.push(`Tamanho: ${validation.sizeMB}MB (máx ${PHOTO_GUIDELINES.maxSizeMB}MB)`);
  if (!validation.orientationOk) warnings.push('Formato vertical — recomendado: horizontal (paisagem)');

  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <Check className="w-3 h-3" /> OK
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {warnings.map((w, i) => (
        <div key={i} className="flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {w}
        </div>
      ))}
    </div>
  );
};
