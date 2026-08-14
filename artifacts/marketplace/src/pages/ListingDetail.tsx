import { useParams, Link } from 'wouter';
import { useGetListing, useCreateLead, getGetListingQueryKey } from '@workspace/api-client-react';
import { PhotoGallery } from '@/components/PhotoGallery';
import { InquiryForm } from '@/components/InquiryForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft,
  Gauge, 
  Settings, 
  Fuel, 
  ShieldCheck, 
  Calendar,
  Car as CarIcon,
  Palette,
  Info,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';

const formatPrice = (price: number | null | undefined) => {
  if (price === null || price === undefined) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatMileage = (miles: number | null | undefined) => {
  if (miles === null || miles === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US').format(miles) + ' miles';
};

export default function ListingDetail() {
  const params = useParams<{ vin: string }>();
  const vin = params.vin;
  
  const { data: listing, isLoading, isError } = useGetListing(vin!, {
    query: {
      enabled: !!vin,
      queryKey: getGetListingQueryKey(vin!)
    }
  });

  const createLead = useCreateLead();
  const [clickForPricePending, setClickForPricePending] = useState(false);

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-serif font-bold mb-4">Vehicle Not Found</h2>
        <p className="text-muted-foreground mb-8">The vehicle you are looking for is unavailable or has been sold.</p>
        <Button asChild>
          <Link href="/">Return to Inventory</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || !listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="w-full aspect-[21/9] rounded-xl" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const title = `${listing.year} ${listing.make} ${listing.model}`;
  const priceDisplay = formatPrice(listing.price);

  const handleClickForPrice = () => {
    setClickForPricePending(true);
    createLead.mutate(
      {
        data: {
          lead_type: 'click_for_price',
          vin: listing.vin,
          listing_id: listing.id,
          name: 'Anonymous (Click for Price)',
          email: 'no-email@click.com',
          phone: '0000000000',
          vehicle_detail_link: listing.vehicle_detail_link
        }
      },
      {
        onSettled: () => {
          setClickForPricePending(false);
          if (listing.vehicle_detail_link) {
            // Only open http/https URLs — block javascript: and other unsafe protocols
            try {
              const url = new URL(listing.vehicle_detail_link);
              if (url.protocol === 'https:' || url.protocol === 'http:') {
                window.open(listing.vehicle_detail_link, '_blank', 'noopener,noreferrer');
              }
            } catch {
              // Malformed URL — silently ignore
            }
          }
        }
      }
    );
  };

  const specs = [
    { label: 'VIN', value: listing.vin },
    { label: 'Stock Number', value: listing.stock_number },
    { label: 'Model Number', value: listing.model_number },
    { label: 'Series Detail', value: listing.series_detail },
    { label: 'Age', value: listing.age !== null && listing.age !== undefined ? `${listing.age} days in inventory` : null },
    { label: 'Exterior', value: listing.exterior_color },
    { label: 'Interior', value: listing.interior_color },
    { label: 'Body Style', value: listing.body },
    { label: 'Doors', value: listing.door_count },
    { label: 'Engine', value: listing.engine },
    { label: 'Displacement', value: listing.engine_displacement },
    { label: 'Cylinders', value: listing.engine_cylinders },
    { label: 'Transmission', value: listing.transmission },
    { label: 'Drivetrain', value: listing.drivetrain },
    { label: 'City MPG', value: listing.city_mpg },
    { label: 'Highway MPG', value: listing.highway_mpg },
  ].filter(spec => spec.value !== null && spec.value !== undefined && spec.value !== '');

  return (
    <div className="bg-background pb-16">
      {/* Breadcrumb / Top Bar */}
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-3 flex items-center text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ChevronLeft size={16} />
            Back to Inventory
          </Link>
          <span className="text-muted-foreground mx-3">/</span>
          <span className="font-medium text-foreground">{title}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Main Content Area (Left 2/3) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Gallery */}
            <PhotoGallery photos={listing.photo_urls || []} title={title} />
            
            {/* Mobile Header (Hidden on LG) */}
            <div className="lg:hidden space-y-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {listing.certified && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                    <ShieldCheck size={14} /> Certified
                  </span>
                )}
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {listing.body || 'Vehicle'}
                </span>
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground leading-tight">
                {title} {listing.series && <span className="font-sans text-xl font-normal text-muted-foreground block mt-1">{listing.series}</span>}
              </h1>
              
              <div className="pt-2">
                {priceDisplay ? (
                  <div className="text-3xl font-bold tracking-tight text-foreground">{priceDisplay}</div>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-full text-lg shadow-md"
                    onClick={handleClickForPrice}
                    disabled={clickForPricePending}
                  >
                    Click for Price
                    {listing.vehicle_detail_link && <ExternalLink className="ml-2 h-5 w-5" />}
                  </Button>
                )}
                {listing.msrp && listing.msrp > (listing.price || 0) && (
                  <div className="text-sm text-muted-foreground mt-1">
                    MSRP: <span className="line-through">{formatPrice(listing.msrp)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Highlights Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2 h-full">
                  <Gauge className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mileage</div>
                    <div className="font-medium text-foreground">{formatMileage(listing.odometer)}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2 h-full">
                  <Settings className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Transmission</div>
                    <div className="font-medium text-foreground">{listing.transmission || 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2 h-full">
                  <Fuel className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Engine</div>
                    <div className="font-medium text-foreground">{listing.engine_cylinders ? `${listing.engine_cylinders} Cyl` : 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2 h-full">
                  <Palette className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Exterior</div>
                    <div className="font-medium text-foreground">{listing.exterior_color || 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            {(listing.description || listing.features) && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold flex items-center gap-2 mb-4 text-foreground">
                    <Info className="h-6 w-6 text-primary" />
                    Overview
                  </h2>
                  <Separator className="mb-6" />
                  {listing.description ? (
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {listing.description}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">No description provided by dealer.</p>
                  )}
                </div>
                
                {listing.features && (
                  <div className="pt-4">
                    <h3 className="text-xl font-serif font-semibold mb-4 text-foreground">Features & Options</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {listing.features}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Full Specs Table */}
            <div>
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2 mb-4 text-foreground">
                <CarIcon className="h-6 w-6 text-primary" />
                Vehicle Specifications
              </h2>
              <Separator className="mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                {specs.map((spec, i) => (
                  <div key={spec.label} className={`flex justify-between py-3 ${i < specs.length - 2 ? 'border-b border-border/50' : 'md:border-none border-b border-border/50'}`}>
                    <span className="text-muted-foreground">{spec.label}</span>
                    <span className="font-medium text-foreground text-right">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Sidebar Area (Right 1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              
              {/* Desktop Header (Hidden on Mobile) */}
              <div className="hidden lg:block space-y-4 mb-8">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {listing.certified && (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                      <ShieldCheck size={14} /> Certified
                    </span>
                  )}
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {listing.body || 'Vehicle'}
                  </span>
                </div>
                <h1 className="text-3xl font-serif font-bold text-foreground leading-tight">
                  {title}
                </h1>
                {listing.series && <p className="text-lg text-muted-foreground">{listing.series}</p>}
                
                <div className="pt-4 pb-2 border-b">
                  {priceDisplay ? (
                    <div className="text-4xl font-bold tracking-tight text-foreground">{priceDisplay}</div>
                  ) : (
                    <Button 
                      size="lg" 
                      className="w-full text-lg shadow-md hover-elevate transition-all duration-300"
                      onClick={handleClickForPrice}
                      disabled={clickForPricePending}
                    >
                      Click for Price
                      {listing.vehicle_detail_link && <ExternalLink className="ml-2 h-5 w-5" />}
                    </Button>
                  )}
                  {listing.msrp && listing.msrp > (listing.price || 0) && (
                    <div className="text-sm text-muted-foreground mt-2">
                      MSRP: <span className="line-through">{formatPrice(listing.msrp)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dealer Contact Block */}
              <Card className="border-border/60 shadow-sm overflow-hidden bg-muted/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <CarIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-foreground text-lg">Drive Cape Fear Dealer</h3>
                      <p className="text-sm text-muted-foreground">Premium Used Vehicles</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <a href="tel:5551234567" className="font-medium hover:text-primary transition-colors">(555) 123-4567</a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium text-right">123 Classic Drive<br />Motor City, MC 12345</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inquiry Card */}
              <Card className="border-border/60 shadow-sm overflow-hidden">
                <div className="bg-primary px-6 py-4">
                  <CardTitle className="text-lg font-serif text-primary-foreground">Interested in this {listing.make}?</CardTitle>
                </div>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-6">
                    Fill out the form below and our sales team will get back to you with more information.
                  </p>
                  <InquiryForm 
                    vin={listing.vin} 
                    listingId={listing.id} 
                    defaultMessage={`I'm interested in the ${title} (VIN: ${listing.vin}). Is it still available?`}
                  />
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
