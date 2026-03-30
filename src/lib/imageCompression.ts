/**
 * Client-side image compression using Canvas API.
 * Resizes and compresses images before upload to reduce storage and bandwidth.
 */

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;
const DEFAULT_QUALITY = 0.8;

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, JPEG quality
  outputType?: 'image/jpeg' | 'image/webp';
}

/**
 * Compress an image File, returning a new compressed File.
 * Non-image files are returned as-is.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    outputType = 'image/jpeg',
  } = options;

  // Only compress raster images
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  // Skip if already small (< 200KB)
  if (file.size < 200 * 1024) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback to original
        return;
      }

      // White background (for PNGs with transparency → JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help, use original
            resolve(file);
            return;
          }

          const ext = outputType === 'image/webp' ? 'webp' : 'jpg';
          const compressedName = file.name.replace(/\.[^.]+$/, `.${ext}`);
          const compressed = new File([blob], compressedName, {
            type: outputType,
            lastModified: Date.now(),
          });

          console.log(
            `[ImageCompression] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((1 - compressed.size / file.size) * 100)}% reduction)`,
          );

          resolve(compressed);
        },
        outputType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original
    };

    img.src = url;
  });
}

/**
 * Compress multiple image files in parallel.
 */
export async function compressImages(
  files: File[],
  options?: CompressOptions,
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, options)));
}
