import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getGetListingsQueryKey, getListings } from '@workspace/api-client-react';
import type { GetListingsParams, Listing } from '@workspace/api-client-react';
import { SwipeCard, type SwipeDirection } from './SwipeCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Heart, RotateCcw } from 'lucide-react';

interface SwipeDeckProps {
  params: GetListingsParams;
  excludeVins: string[];
  onLike: (listing: Listing) => void;
  onFinished: () => void;
  onRetakeQuiz: () => void;
}

const PAGE_SIZE = 20;
/** Load the next page once this few cards are left, so the deck doesn't run dry mid-swipe. */
const PRELOAD_WHEN_REMAINING = 5;

export function SwipeDeck({ params, excludeVins, onLike, onFinished, onRetakeQuiz }: SwipeDeckProps) {
  // Use the shortlist as it was when the deck opened. Liking a car adds it to
  // excludeVins, and filtering on the live list would pull that card out from
  // under the current index, silently skipping the next car.
  const [excluded] = useState(() => new Set(excludeVins));
  const [index, setIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<SwipeDirection>('left');

  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [...getGetListingsQueryKey(params), 'swipe-deck'],
    queryFn: ({ pageParam, signal }) =>
      getListings({ ...params, limit: PAGE_SIZE, offset: pageParam }, { signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
  });

  const { deck, skipped } = useMemo(() => {
    const seen = new Set<string>();
    const cards: Listing[] = [];
    let skippedCount = 0;
    for (const page of data?.pages ?? []) {
      for (const listing of page.items) {
        if (excluded.has(listing.vin) || seen.has(listing.vin)) {
          skippedCount += 1;
          continue;
        }
        seen.add(listing.vin);
        cards.push(listing);
      }
    }
    return { deck: cards, skipped: skippedCount };
  }, [data, excluded]);

  const remaining = deck.length - index;

  useEffect(() => {
    if (remaining <= PRELOAD_WHEN_REMAINING && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [remaining, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  // Every card swiped and nothing left to load.
  const exhausted = !isLoading && !isError && remaining <= 0 && !hasNextPage;

  useEffect(() => {
    if (exhausted && deck.length > 0) {
      onFinished();
    }
  }, [exhausted, deck.length, onFinished]);

  const handleSwipe = (direction: SwipeDirection) => {
    const current = deck[index];
    if (!current) return;
    if (direction === 'right') {
      onLike(current);
    }
    setExitDirection(direction);
    setIndex(index + 1);
  };

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto py-12 px-4">
        <Skeleton className="h-[520px] w-full rounded-3xl" />
      </div>
    );
  }

  if (isError && deck.length === 0) {
    return (
      <div className="max-w-sm mx-auto py-20 px-4 text-center">
        <p className="text-muted-foreground mb-4">We couldn't load matches right now.</p>
        <Button variant="outline" onClick={() => void refetch()}>
          <RotateCcw size={16} className="mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  if (exhausted && deck.length === 0) {
    return (
      <div className="max-w-sm mx-auto py-20 px-4 text-center">
        <p className="text-lg font-semibold mb-2">No matches for those answers</p>
        <p className="text-muted-foreground mb-6">Try loosening your budget or mileage preferences.</p>
        <Button variant="outline" onClick={onRetakeQuiz}>
          <RotateCcw size={16} className="mr-2" />
          Retake quiz
        </Button>
      </div>
    );
  }

  if (remaining <= 0) {
    // Out of loaded cards: the next page is either on its way or failed to load.
    return (
      <div className="max-w-sm mx-auto py-12 px-4 text-center">
        {isFetchNextPageError ? (
          <>
            <p className="text-muted-foreground mb-4">We couldn't load more matches.</p>
            <Button variant="outline" onClick={() => void fetchNextPage()}>
              <RotateCcw size={16} className="mr-2" />
              Try again
            </Button>
          </>
        ) : (
          <Skeleton className="h-[520px] w-full rounded-3xl" />
        )}
      </div>
    );
  }

  const visible = deck.slice(index, index + 3);
  // The API's total counts cars already on the shortlist; subtract the ones found so far.
  const total = data?.pages[0]?.total ?? deck.length;
  const matchCount = Math.max(total - skipped, deck.length);

  return (
    <div className="flex flex-col items-center py-8 md:py-12 px-4">
      <p className="text-sm text-muted-foreground mb-4">
        {matchCount - index} of {matchCount} matches
      </p>
      <div className="relative w-full max-w-sm h-[520px]">
        <AnimatePresence custom={exitDirection}>
          {visible.map((listing, i) => (
            <SwipeCard
              key={listing.vin}
              listing={listing}
              isTop={i === 0}
              zIndex={visible.length - i}
              exitDirection={exitDirection}
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
