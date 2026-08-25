const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.82;

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });

// Downscales a raster image to at most MAX_DIMENSION on its longest side and
// re-encodes as JPEG, so a full-resolution phone photo doesn't get stored
// verbatim (as base64, ~33% larger than the original) for what only ever
// renders as a thumbnail or a guided-workout preview image.
export const resizeImageToDataUrl = (
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY
): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(objectUrl);
      if (!ctx) { reject(new Error('Canvas is not supported in this browser.')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read that image.')); };
    img.src = objectUrl;
  });
