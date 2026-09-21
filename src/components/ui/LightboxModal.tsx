import { AnimatePresence, m } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useCallback, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface LightboxModalProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  alt?: string;
}

export function LightboxModal({ images, currentIndex, isOpen, onClose, onNavigate, alt }: LightboxModalProps) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const prev = useCallback(() => {
    if (hasPrev && onNavigate) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const next = useCallback(() => {
    if (hasNext && onNavigate) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose, prev, next]);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      closeButtonRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out p-4"
          onClick={onClose}
        >
          {/* Close */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close lightbox"
            className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {hasPrev && onNavigate && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous image"
              className="absolute left-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <m.img
            key={images[currentIndex]}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            src={images[currentIndex]}
            alt={alt ?? `Image ${currentIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl cursor-zoom-in"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {hasNext && onNavigate && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next image"
              className="absolute right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1" role="tablist" aria-label="Image navigation">
              {images.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === currentIndex}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  onClick={(e) => { e.stopPropagation(); onNavigate?.(i); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${i === currentIndex ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                >
                  <span className={`block rounded-full transition-all ${i === currentIndex ? 'w-2.5 h-2.5 bg-white scale-125' : 'w-2 h-2 bg-current'}`} />
                </button>
              ))}
            </div>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
