import type { Listing } from '@workspace/api-client-react';
import { ListingCard } from '@/components/ListingCard';
import { Button } from '@/components/ui/button';
import { Heart, RotateCcw, Search } from 'lucide-react';

interface ShortlistProps {
  liked: Listing[];
  onRemove: (vin: string) => void;
  onFindMore: () => void;
  onStartOver: () => void;
}

export function Shortlist({ liked, onRemove, onFindMore, onStartOver }: ShortlistProps) {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-3 text-primary">
          <Heart size={22} fill="currentColor" />
          <span className="text-sm font-semibold uppercase tracking-wider">Your Shortlist</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
          {liked.length > 0 ? `${liked.length} car${liked.length === 1 ? '' : 's'} you liked` : 'No likes yet'}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {liked.length > 0
            ? 'This is your private shortlist. Reach out to a dealer whenever you\'re ready.'
            : "You didn't like any cars this round — try adjusting your answers."}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 mb-10">
        <Button onClick={onFindMore} className="gap-2">
          <Search size={16} />
          Find more matches
        </Button>
        <Button variant="outline" onClick={onStartOver} className="gap-2">
          <RotateCcw size={16} />
          Start over
        </Button>
      </div>

      {liked.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {liked.map((listing) => (
            <div key={listing.vin} className="relative">
              <ListingCard listing={listing} />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-3 left-3 z-10 shadow-sm"
                onClick={() => onRemove(listing.vin)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
