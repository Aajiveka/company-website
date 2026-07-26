import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Image, Upload, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FileUploadProps {
  /** Comma-separated accepted file types, e.g. ".pdf,.doc,.docx" or "image/*" */
  accept?: string;
  /** Max file size in bytes */
  maxSize?: number;
  /** Allow selecting multiple files */
  multiple?: boolean;
  /** Called with validated files ready for upload */
  onUpload: (files: File[]) => void;
  /** Label displayed above the drop zone */
  label?: string;
  /** Hint text displayed below the drop zone */
  hint?: string;
  /** External error message */
  error?: string;
  /** Show a loading state during upload */
  isUploading?: boolean;
  /** Upload progress 0–100 */
  progress?: number;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase());
  return tokens.some((token) => {
    if (token.endsWith('/*')) {
      const prefix = token.slice(0, -2);
      return file.type.toLowerCase().startsWith(prefix);
    }
    if (token.startsWith('.')) {
      return file.name.toLowerCase().endsWith(token);
    }
    return file.type.toLowerCase() === token;
  });
}

interface SelectedFile {
  file: File;
  preview?: string;
}

export function FileUpload({
  accept,
  maxSize,
  multiple = false,
  onUpload,
  label,
  hint,
  error: externalError,
  isUploading = false,
  progress,
  className,
}: FileUploadProps) {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayError = externalError ?? validationError;

  const validate = useCallback(
    (files: File[]): { valid: File[]; error: string | null } => {
      const rejected: string[] = [];
      const valid: File[] = [];

      for (const file of files) {
        if (!matchesAccept(file, accept)) {
          rejected.push(t('fileUpload.invalidType', { name: file.name }));
          continue;
        }
        if (maxSize && file.size > maxSize) {
          rejected.push(t('fileUpload.maxSize', { name: file.name, size: formatBytes(maxSize) }));
          continue;
        }
        valid.push(file);
      }

      return {
        valid,
        error: rejected.length > 0 ? rejected.join('. ') : null,
      };
    },
    [accept, maxSize, t],
  );

  const processFiles = useCallback(
    (files: File[]) => {
      const { valid, error } = validate(files);
      setValidationError(error);

      if (valid.length === 0) return;

      const items: SelectedFile[] = valid.map((file) => ({
        file,
        preview: isImageFile(file) ? URL.createObjectURL(file) : undefined,
      }));

      setSelected(items);
      onUpload(valid);
    },
    [validate, onUpload],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (!multiple && files.length > 1) {
        processFiles([files[0]]);
      } else {
        processFiles(files);
      }
    },
    [multiple, processFiles],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) processFiles(files);
      e.target.value = '';
    },
    [processFiles],
  );

  const removeFile = (index: number) => {
    setSelected((prev) => {
      const item = prev[index];
      if (item.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
    setValidationError(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <p className="text-sm font-medium text-navy dark:text-gray-200">{label}</p>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files here or click to browse"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 sm:p-8 transition',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
          dragOver
            ? 'border-primary bg-primary/5 dark:bg-primary/10'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500',
          displayError && 'border-red-400 dark:border-red-600',
          isUploading && 'pointer-events-none opacity-60',
        )}
      >
        <Upload className="mb-2 h-6 w-6 sm:h-8 sm:w-8 text-gray-400 dark:text-gray-500" />
        <p className="text-sm font-medium text-navy dark:text-gray-200">
          {t('fileUpload.dragDrop')}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('fileUpload.clickBrowse')}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
        aria-label={label ?? 'File upload'}
      />

      {hint && !displayError && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}

      {displayError && (
        <p className="text-xs text-red-600 dark:text-red-400">{displayError}</p>
      )}

      {/* Progress bar */}
      {isUploading && typeof progress === 'number' && (
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={Math.min(100, Math.max(0, progress))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Upload progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* Selected file previews */}
      {selected.length > 0 && (
        <ul className="space-y-2" aria-label="Selected files">
          {selected.map((item, i) => (
            <li
              key={`${item.file.name}-${i}`}
              className="flex items-center gap-2 sm:gap-3 rounded-lg border border-gray-200 p-2 dark:border-gray-700 max-w-full overflow-hidden"
            >
              {item.preview ? (
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                  {isImageFile(item.file) ? (
                    <Image className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy dark:text-gray-200">
                  {item.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(item.file.size)}
                </p>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="rounded p-2 sm:p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  aria-label={t('fileUpload.removeFile')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
