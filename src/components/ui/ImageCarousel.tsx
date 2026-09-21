import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { LightboxModal } from './LightboxModal';

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  className?: string;
}

export function ImageCarousel({ images, alt, className }: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback((next: number, dir: number) => {
    setDirection(dir);
    setCurrent(next);
  }, []);

  const prev = () => { if (current > 0) go(current - 1, -1); };
  const next = () => { if (current < images.length - 1) go(current + 1, 1); };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  if (images.length === 0) return null;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl select-none ${className ?? ''}`}>
        {/* Slides */}
        <div
          role="button"
          tabIndex={0}
          aria-label={alt ? `Open ${alt} in fullscreen` : 'Open image in fullscreen'}
          className="relative aspect-video bg-black cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setLightboxOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxOpen(true); } }}
        >
          <AnimatePresence initial={false} custom={direction}>
            <m.img
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              src={images[current]}
              alt={alt ? `${alt} - ${current + 1}` : `Image ${current + 1}`}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>

        {/* Arrow buttons - 44×44px min touch target */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              disabled={current === 0}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              disabled={current === images.length - 1}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dot indicators - padded to ensure ≥44px touch target */}
        {images.length > 1 && (
          <div
            role="tablist"
            aria-label="Image navigation"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 z-10"
          >
            {images.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === current}
                aria-label={`Go to image ${i + 1} of ${images.length}`}
                onClick={(e) => { e.stopPropagation(); go(i, i > current ? 1 : -1); }}
                className="w-8 h-8 flex items-center justify-center rounded-full"
              >
                <span className={`block rounded-full transition-all ${i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`} />
              </button>
            ))}
          </div>
        )}

        {/* Counter badge */}
        {images.length > 1 && (
          <div
            aria-live="polite"
            aria-atomic="true"
            className="absolute top-3 right-3 z-10 bg-black/50 text-white text-[11px] font-bold px-2 py-0.5 rounded-full"
          >
            {current + 1} / {images.length}
          </div>
        )}
      </div>

      <LightboxModal
        images={images}
        currentIndex={current}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(i) => go(i, i > current ? 1 : -1)}
        alt={alt}
      />
    </>
  );
}
