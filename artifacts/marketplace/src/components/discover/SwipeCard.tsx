import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Gauge, Settings, ShieldCheck, Fuel } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Listing } from '@workspace/api-client-react';

interface SwipeCardProps {
  listing: Listing;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
  zIndex: number;
}

const formatPrice = (price: number | null | undefined) => {
  if (price === null || price === undefined) return 'Call for Price';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatMileage = (miles: number | null | undefined) => {
  if (miles === null || miles === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US').format(miles) + ' mi';
};

const SWIPE_THRESHOLD = 120;

export function SwipeCard({ listing, onSwipe, isTop, zIndex }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);

  const heroImage =
    listing.photo_urls?.[0] ||
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800';
  const title = `${listing.year ?? ''} ${listing.make ?? ''} ${listing.model ?? ''}`.trim();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe('right');
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={{ x, rotate, zIndex, touchAction: 'none' }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      animate={isTop ? { scale: 1, y: 0 } : { scale: 0.96, y: 12 }}
      exit={(dir: any) => ({
        x: dir === 'right' ? 500 : -500,
        rotate: dir === 'right' ? 25 : -25,
        opacity: 0,
        transition: { duration: 0.3 },
      })}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl border border-border/50 bg-card">
        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute top-6 left-6 z-20 rotate-[-12deg] border-4 border-emerald-500 text-emerald-500 rounded-lg px-3 py-1 text-xl font-bold uppercase tracking-wider bg-background/80"
            >
              Like
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="absolute top-6 right-6 z-20 rotate-[12deg] border-4 border-rose-500 text-rose-500 rounded-lg px-3 py-1 text-xl font-bold uppercase tracking-wider bg-background/80"
            >
              Pass
            </motion.div>
          </>
        )}

        <div className="relative h-[62%] bg-muted">
          {listing.certified && (
            <Badge className="absolute top-3 right-3 z-10 bg-primary/90 text-primary-foreground gap-1 shadow-sm">
              <ShieldCheck size={14} />
              Certified
            </Badge>
          )}
          <img
            src={heroImage}
            alt={title}
            className="object-cover w-full h-full pointer-events-none"
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="p-5 flex flex-col h-[38%]">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {listing.body || 'Vehicle'}
          </div>
          <h3 className="font-serif text-xl font-bold leading-tight mb-1 line-clamp-1">{title}</h3>
          <div className="text-xl font-medium tracking-tight mb-3 text-foreground">
            {formatPrice(listing.price)}
          </div>
          <div className="mt-auto grid grid-cols-2 gap-y-2 gap-x-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Gauge size={16} className="opacity-70" />
              <span className="truncate">{formatMileage(listing.odometer)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Settings size={16} className="opacity-70" />
              <span className="truncate">{listing.transmission || 'Auto'}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <Fuel size={16} className="opacity-70" />
              <span className="truncate">{listing.engine || 'Standard Engine'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
