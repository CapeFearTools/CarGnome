import { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';

interface PhotoGalleryProps {
  photos: string[];
  title: string;
}

export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-muted flex items-center justify-center rounded-xl overflow-hidden">
        <span className="text-muted-foreground">No photos available</span>
      </div>
    );
  }

  const nextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="space-y-4">
      {/* Main Image View */}
      <Dialog>
        <DialogTrigger asChild>
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-xl overflow-hidden bg-muted group cursor-zoom-in">
            <img 
              src={photos[currentIndex]} 
              alt={`${title} - Photo ${currentIndex + 1}`} 
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Controls */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/10"
                  onClick={prevPhoto}
                >
                  <ChevronLeft size={24} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/10"
                  onClick={nextPhoto}
                >
                  <ChevronRight size={24} />
                </Button>
              </>
            )}
            
            <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 flex items-center gap-2">
              <Maximize2 size={14} />
              {currentIndex + 1} / {photos.length}
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 border-none bg-black/95 flex flex-col justify-center">
          <DialogTitle className="sr-only">Photo Gallery View</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img 
              src={photos[currentIndex]} 
              alt={`${title} - Fullscreen`} 
              className="max-w-full max-h-full object-contain"
            />
            
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-14 w-14 rounded-full"
                  onClick={prevPhoto}
                >
                  <ChevronLeft size={36} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-14 w-14 rounded-full"
                  onClick={nextPhoto}
                >
                  <ChevronRight size={36} />
                </Button>
              </>
            )}
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm tracking-widest font-medium">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {photos.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative aspect-[4/3] rounded-md overflow-hidden transition-all ${
                currentIndex === idx 
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              }`}
            >
              <img src={photo} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
