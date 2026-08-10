import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Fuel, Gauge, Settings, ShieldCheck } from 'lucide-react';
import type { Listing } from '@workspace/api-client-react';

interface ListingCardProps {
  listing: Listing;
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

export function ListingCard({ listing }: ListingCardProps) {
  const heroImage = listing.photo_urls?.[0] || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800'; // fallback placeholder
  const title = `${listing.year} ${listing.make} ${listing.model}`;
  const priceDisplay = formatPrice(listing.price);

  return (
    <Card className="group overflow-hidden flex flex-col h-full hover-elevate transition-all duration-300 border-border/50">
      <Link href={`/listings/${listing.vin}`} className="block relative aspect-[4/3] overflow-hidden bg-muted">
        {listing.certified && (
          <Badge className="absolute top-3 right-3 z-10 bg-primary/90 hover:bg-primary backdrop-blur text-primary-foreground gap-1 shadow-sm">
            <ShieldCheck size={14} />
            Certified
          </Badge>
        )}
        <img
          src={heroImage}
          alt={title}
          className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {listing.body || 'Vehicle'}
        </div>
        <Link href={`/listings/${listing.vin}`} className="block group-hover:text-primary transition-colors">
          <h3 className="font-serif text-xl font-bold leading-tight mb-2 line-clamp-2">
            {title}
          </h3>
        </Link>
        <div className="text-xl font-medium tracking-tight mb-4 text-foreground">
          {priceDisplay}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-muted-foreground">
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
    </Card>
  );
}
