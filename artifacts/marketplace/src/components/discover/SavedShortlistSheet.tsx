import { useState } from 'react';
import { Car, Heart } from 'lucide-react';
import type { Listing } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { formatPrice } from '@/lib/listing';

interface SavedShortlistSheetProps {
  liked: Listing[];
  onRemove: (vin: string) => void;
  /** Leave the deck and open the full shortlist page. */
  onSeeShortlist: () => void;
}

/**
 * The "N saved" chip on the swipe screen and the panel it opens. Closing the
 * panel leaves the deck exactly where it was, so people can check their
 * shortlist without losing their place.
 */
export function SavedShortlistSheet({ liked, onRemove, onSeeShortlist }: SavedShortlistSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {liked.length > 0 && (
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
            <Heart size={14} fill="currentColor" className="text-emerald-500" />
            {liked.length} saved
          </Button>
        </SheetTrigger>
      )}

      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="border-b p-6 pb-4 text-left">
          <SheetTitle className="font-serif">Your shortlist</SheetTitle>
          <SheetDescription>
            {liked.length > 0
              ? `${liked.length} ${liked.length === 1 ? 'car' : 'cars'} saved so far. Close this to pick up where you left off.`
              : 'Nothing saved yet. Like a car and it shows up here.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {liked.map((listing) => (
            <SavedRow key={listing.vin} listing={listing} onRemove={() => onRemove(listing.vin)} />
          ))}
        </div>

        <div className="border-t p-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Keep swiping
          </Button>
          <Button className="flex-1" onClick={onSeeShortlist} disabled={liked.length === 0}>
            See full shortlist
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SavedRow({ listing, onRemove }: { listing: Listing; onRemove: () => void }) {
  const title = `${listing.year ?? ''} ${listing.make ?? ''} ${listing.model ?? ''}`.trim();
  const photo = listing.photo_urls?.[0];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 p-2">
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="h-16 w-24 shrink-0 rounded-lg object-cover bg-muted"
        />
      ) : (
        <div className="h-16 w-24 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          <Car size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{formatPrice(listing.price)}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        Remove
      </Button>
    </div>
  );
}
