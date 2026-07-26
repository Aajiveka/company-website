import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';

export interface ImageCropperProps {
  /** Object URL or data URL of the image to crop */
  src: string;
  /** Called with the cropped image as a Blob */
  onCrop: (blob: Blob) => void;
  /** Cancel cropping */
  onCancel: () => void;
  /** Aspect ratio (width / height). Default 1 for square */
  aspect?: number;
}

interface CropRect {
  x: number;
  y: number;
  size: number;
}

export function ImageCropper({ src, onCrop, onCancel, aspect = 1 }: ImageCropperProps) {
  const { t } = useTranslation('common');
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [cropError, setCropError] = useState('');
  const [, setContainerSize] = useState({ width: 0, height: 0 });
  const [imgDisplay, setImgDisplay] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, size: 50 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ startX: 0, startY: 0, cropX: 0, cropY: 0 });

  // Compute displayed image dimensions to fit container while maintaining aspect ratio
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const natW = imgRef.current.naturalWidth;
    const natH = imgRef.current.naturalHeight;

    const cW = container.width;
    const cH = container.height;

    const scale = Math.min(cW / natW, cH / natH);
    const dispW = natW * scale;
    const dispH = natH * scale;
    const offX = (cW - dispW) / 2;
    const offY = (cH - dispH) / 2;

    setContainerSize({ width: cW, height: cH });
    setImgDisplay({ width: dispW, height: dispH, offsetX: offX, offsetY: offY });

    // Initial crop: centered square covering 60% of the smaller dimension
    const minDim = Math.min(dispW, dispH);
    const cropSize = minDim * 0.6;
    setCrop({
      x: offX + (dispW - cropSize) / 2,
      y: offY + (dispH - cropSize / aspect) / 2,
      size: cropSize,
    });
  }, [imgLoaded, aspect]);

  // Clamp crop rect within image bounds
  const clampCrop = useCallback(
    (c: CropRect): CropRect => {
      const cropH = c.size / aspect;
      const x = Math.max(imgDisplay.offsetX, Math.min(c.x, imgDisplay.offsetX + imgDisplay.width - c.size));
      const y = Math.max(imgDisplay.offsetY, Math.min(c.y, imgDisplay.offsetY + imgDisplay.height - cropH));
      return { ...c, x, y };
    },
    [imgDisplay, aspect],
  );

  // Mouse / touch dragging
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = {
        startX: e.clientX,
        startY: e.clientY,
        cropX: crop.x,
        cropY: crop.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [crop],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.startX;
      const dy = e.clientY - dragStart.current.startY;
      setCrop((prev) =>
        clampCrop({
          ...prev,
          x: dragStart.current.cropX + dx,
          y: dragStart.current.cropY + dy,
        }),
      );
    },
    [dragging, clampCrop],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Update preview canvas
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const scaleX = natW / imgDisplay.width;
    const scaleY = natH / imgDisplay.height;

    const cropH = crop.size / aspect;

    const srcX = (crop.x - imgDisplay.offsetX) * scaleX;
    const srcY = (crop.y - imgDisplay.offsetY) * scaleY;
    const srcW = crop.size * scaleX;
    const srcH = cropH * scaleY;

    const previewSize = 120;
    canvas.width = previewSize;
    canvas.height = previewSize / aspect;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
  }, [crop, imgLoaded, imgDisplay, aspect]);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current) return;

    const img = imgRef.current;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const scaleX = natW / imgDisplay.width;
    const scaleY = natH / imgDisplay.height;

    const cropH = crop.size / aspect;

    const srcX = (crop.x - imgDisplay.offsetX) * scaleX;
    const srcY = (crop.y - imgDisplay.offsetY) * scaleY;
    const srcW = crop.size * scaleX;
    const srcH = cropH * scaleY;

    const outputSize = 400;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize / aspect;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCropError('');
          onCrop(blob);
        } else {
          setCropError('Failed to generate cropped image. Please try a different image.');
        }
      },
      'image/jpeg',
      0.9,
    );
  }, [crop, imgDisplay, aspect, onCrop]);

  const cropH = crop.size / aspect;

  return (
    <div className="space-y-4">
      {/* Image with crop overlay */}
      <div
        ref={containerRef}
        className="relative mx-auto h-60 sm:h-80 w-full max-w-lg select-none overflow-hidden rounded-lg bg-gray-900"
      >
        {imgError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            <AlertTriangle className="h-10 w-10" />
            <p className="text-sm font-medium">Failed to load image</p>
            <p className="text-xs">The file may be corrupted or in an unsupported format.</p>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={src}
            alt="Image to crop"
            className="absolute h-full w-full object-contain"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            draggable={false}
          />
        )}

        {imgLoaded && !imgError && (
          <>
            {/* Dimmed overlay */}
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${crop.x}px ${crop.y}px, ${crop.x}px ${crop.y + cropH}px, ${crop.x + crop.size}px ${crop.y + cropH}px, ${crop.x + crop.size}px ${crop.y}px, ${crop.x}px ${crop.y}px)` }} />

            {/* Crop rectangle */}
            <div
              role="application"
              aria-label="Crop area. Use arrow keys to move."
              tabIndex={0}
              className={cn(
                'absolute border-2 border-white focus:outline-none focus:ring-2 focus:ring-primary/70',
                dragging ? 'cursor-grabbing' : 'cursor-grab',
              )}
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.size,
                height: cropH,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onKeyDown={(e) => {
                const step = 5;
                let dx = 0;
                let dy = 0;
                switch (e.key) {
                  case 'ArrowLeft': dx = -step; break;
                  case 'ArrowRight': dx = step; break;
                  case 'ArrowUp': dy = -step; break;
                  case 'ArrowDown': dy = step; break;
                  default: return;
                }
                e.preventDefault();
                setCrop((prev) => clampCrop({ ...prev, x: prev.x + dx, y: prev.y + dy }));
              }}
            >
              {/* Corner indicators */}
              <div className="absolute -left-1 -top-1 h-3 w-3 border-l-2 border-t-2 border-white" />
              <div className="absolute -right-1 -top-1 h-3 w-3 border-r-2 border-t-2 border-white" />
              <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-white" />
              <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-white" />
            </div>
          </>
        )}
      </div>

      {/* Preview + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="text-sm font-medium text-navy dark:text-gray-200">{t('imageCropper.preview')}</p>
          <canvas
            ref={previewCanvasRef}
            role="img"
            aria-label="Crop preview"
            className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-gray-200 object-cover dark:border-gray-600"
            style={{ aspectRatio: `${aspect}` }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" />
            {t('imageCropper.cancel')}
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={imgError || !imgLoaded}>
            <Check className="mr-1 h-4 w-4" />
            {t('imageCropper.cropSave')}
          </Button>
        </div>
      </div>

      {cropError && (
        <p className="text-center text-sm text-red-600 dark:text-red-400">{cropError}</p>
      )}
    </div>
  );
}
