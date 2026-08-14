import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGetListings } from '@workspace/api-client-react';
import type { GetListingsParams, Listing } from '@workspace/api-client-react';
import { SwipeCard } from './SwipeCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Heart, RotateCcw } from 'lucide-react';

interface SwipeDeckProps {
  params: GetListingsParams;
  excludeVins: string[];
  onLike: (listing: Listing) => void;
  onFinished: () => void;
  onRestart: () => void;
}

export function SwipeDeck({ params, excludeVins, onLike, onFinished, onRestart }: SwipeDeckProps) {
  const { data, isLoading, isError } = useGetListings(params);
  const [index, setIndex] = useState(0);

  const deck = useMemo(() => {
    const excluded = new Set(excludeVins);
    return (data?.items ?? []).filter((l) => !excluded.has(l.vin));
  }, [data, excludeVins]);

  const handleSwipe = (direction: 'left' | 'right') => {
    const current = deck[index];
    if (direction === 'right' && current) {
      onLike(current);
    }
    const next = index + 1;
    if (next >= deck.length) {
      onFinished();
    } else {
      setIndex(next);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto py-12 px-4">
        <Skeleton className="h-[520px] w-full rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-sm mx-auto py-20 px-4 text-center">
        <p className="text-muted-foreground mb-4">We couldn't load matches right now.</p>
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw size={16} className="mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  if (deck.length === 0) {
    return (
      <div className="max-w-sm mx-auto py-20 px-4 text-center">
        <p className="text-lg font-semibold mb-2">No matches for those answers</p>
        <p className="text-muted-foreground mb-6">Try loosening your budget or mileage preferences.</p>
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw size={16} className="mr-2" />
          Retake quiz
        </Button>
      </div>
    );
  }

  const visible = deck.slice(index, index + 3);

  return (
    <div className="flex flex-col items-center py-8 md:py-12 px-4">
      <p className="text-sm text-muted-foreground mb-4">
        {deck.length - index} of {deck.length} matches
      </p>
      <div className="relative w-full max-w-sm h-[520px]">
        <AnimatePresence>
          {visible.map((listing, i) => (
            <SwipeCard
              key={listing.vin}
              listing={listing}
              isTop={i === 0}
              zIndex={visible.length - i}
              onSwipe={handleSwipe}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-6 mt-8">
        <Button
          size="icon"
          variant="outline"
          className="h-14 w-14 rounded-full border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          onClick={() => handleSwipe('left')}
        >
          <X size={26} />
        </Button>
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600"
          onClick={() => handleSwipe('right')}
        >
          <Heart size={24} fill="currentColor" />
        </Button>
      </div>
    </div>
  );
}
