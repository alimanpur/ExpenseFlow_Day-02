import { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Trash2 } from 'lucide-react';

/**
 * ReceiptPreview Component
 * Displays receipt preview with zoom, rotate, download, delete
 */
export default function ReceiptPreview({
  receipt,
  onClose,
  onDelete,
  onReplace,
  isOCRReady = false,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!receipt) return null;

  const isImage = receipt.mimetype?.startsWith('image/');
  const isPDF = receipt.mimetype === 'application/pdf';

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = receipt.url;
    link.download = receipt.filename || 'receipt';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-paper border-2 border-ink hover:bg-paper-deep transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Toolbar */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-paper border-2 border-ink p-2">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-paper-deep transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs px-2">{Math.round(zoom * 100)}%</span>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-paper-deep transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-rule mx-1" />
        <button
          onClick={handleRotate}
          className="p-2 hover:bg-paper-deep transition-colors"
          title="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-paper-deep transition-colors"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
        {onDelete && (
          <>
            <div className="w-px h-6 bg-rule mx-1" />
            <button
              onClick={onDelete}
              className="p-2 hover:bg-paper-deep transition-colors text-vermilion"
              title="Delete receipt"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Receipt content */}
      <div className="max-w-5xl max-h-[90vh] overflow-auto bg-paper border-2 border-ink p-4">
        {isImage && (
          <div
            className="flex items-center justify-center"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s',
            }}
          >
            <img
              src={receipt.url}
              alt={receipt.filename || 'Receipt'}
              className="max-w-full h-auto"
            />
          </div>
        )}

        {isPDF && (
          <div className="w-full h-[80vh]">
            <iframe
              src={receipt.url}
              title={receipt.filename || 'Receipt PDF'}
              className="w-full h-full border-0"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s',
                transformOrigin: 'top center',
              }}
            />
          </div>
        )}

        {!isImage && !isPDF && (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-ink-muted">Unsupported file type</p>
            <button
              onClick={handleDownload}
              className="mt-4 px-4 py-2 bg-vermilion text-paper font-mono text-xs uppercase tracking-wider hover:bg-ink transition-colors"
            >
              Download File
            </button>
          </div>
        )}
      </div>

      {/* OCR Ready Badge */}
      {isOCRReady && (
        <div className="absolute bottom-4 right-4 bg-paper border-2 border-ink px-3 py-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">
            OCR Ready
          </span>
        </div>
      )}

      {/* File info */}
      <div className="absolute bottom-4 left-4 bg-paper border-2 border-ink px-3 py-2">
        <div className="font-mono text-[10px] text-ink-muted">
          {receipt.filename && <div>File: {receipt.filename}</div>}
          {receipt.mimetype && <div>Type: {receipt.mimetype}</div>}
          {receipt.size && <div>Size: {(receipt.size / 1024).toFixed(2)} KB</div>}
          {receipt.uploadedAt && <div>Uploaded: {new Date(receipt.uploadedAt).toLocaleDateString()}</div>}
        </div>
      </div>
    </div>
  );
}