import { useSearch, useLocation } from 'wouter';
import { useGetListings, useGetListingsStats, getGetListingsQueryKey } from '@workspace/api-client-react';
import { Filters } from '@/components/Filters';
import { ListingCard } from '@/components/ListingCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  
  const params = useMemo(() => {
    const sp = new URLSearchParams(searchString);
    const p: any = {};
    if (sp.has('make')) p.make = sp.get('make');
    if (sp.has('model')) p.model = sp.get('model');
    if (sp.has('year_min')) p.year_min = parseInt(sp.get('year_min')!);
    if (sp.has('year_max')) p.year_max = parseInt(sp.get('year_max')!);
    if (sp.has('price_max')) p.price_max = parseInt(sp.get('price_max')!);
    if (sp.has('odometer_max')) p.odometer_max = parseInt(sp.get('odometer_max')!);
    
    // pagination
    p.limit = 12;
    if (sp.has('offset')) p.offset = parseInt(sp.get('offset')!);
    
    return p;
  }, [searchString]);

  const { data: listingsPage, isLoading, isError } = useGetListings(params, {
    query: {
      queryKey: getGetListingsQueryKey(params)
    }
  });

  const { data: stats } = useGetListingsStats();

  const handleNextPage = () => {
    const sp = new URLSearchParams(searchString);
    const currentOffset = parseInt(sp.get('offset') || '0');
    sp.set('offset', (currentOffset + 12).toString());
    setLocation(`${location}?${sp.toString()}`);
  };

  const handlePrevPage = () => {
    const sp = new URLSearchParams(searchString);
    const currentOffset = parseInt(sp.get('offset') || '0');
    const newOffset = Math.max(0, currentOffset - 12);
    if (newOffset === 0) {
      sp.delete('offset');
    } else {
      sp.set('offset', newOffset.toString());
    }
    setLocation(`${location}?${sp.toString()}`);
  };

  const hasNext = listingsPage ? (listingsPage.offset + listingsPage.limit < listingsPage.total) : false;
  const hasPrev = params.offset ? params.offset > 0 : false;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
          Premium Used Vehicles
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Browse our curated selection of quality vehicles. {stats?.total ? `We currently have ${stats.total} exceptional cars waiting for their next owner.` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1">
          <Filters />
        </aside>

        {/* Listings Grid */}
        <div className="lg:col-span-3">
          {isError ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading vehicles</AlertTitle>
              <AlertDescription>
                We encountered an issue loading our inventory. Please try again later.
              </AlertDescription>
            </Alert>
          ) : null}

          {isLoading && !listingsPage ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              ))}
            </div>
          ) : listingsPage?.items.length === 0 ? (
            <div className="text-center py-20 px-4 border border-dashed rounded-xl bg-muted/10">
              <Car className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-serif font-semibold text-foreground mb-2">No vehicles found</h3>
              <p className="text-muted-foreground">
                We couldn't find any vehicles matching your exact criteria. Try adjusting your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
                {listingsPage?.items.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>

              {/* Pagination */}
              {(hasPrev || hasNext) && (
                <div className="flex items-center justify-between border-t pt-6 mt-8">
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Showing {listingsPage!.offset + 1} to {Math.min(listingsPage!.offset + listingsPage!.limit, listingsPage!.total)} of {listingsPage!.total} vehicles
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <Button 
                      variant="outline" 
                      onClick={handlePrevPage} 
                      disabled={!hasPrev}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleNextPage} 
                      disabled={!hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
