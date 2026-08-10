import { useLocation, useSearch } from 'wouter';
import { useGetListingFilters } from '@workspace/api-client-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

export function Filters() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const { data: filters, isLoading } = useGetListingFilters();
  
  // Local state for responsive inputs before they hit URL
  const [localSearch, setLocalSearch] = useState('');

  const currentParams = useMemo(() => new URLSearchParams(searchString), [searchString]);

  useEffect(() => {
    // Sync local search when URL changes
    setLocalSearch(currentParams.get('q') || '');
  }, [currentParams]);

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchString);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset offset when changing filters
    params.delete('offset');
    setLocation(`${location}?${params.toString()}`);
  };

  const clearFilters = () => {
    setLocation(location);
  };

  const hasFilters = Array.from(currentParams.keys()).filter(k => k !== 'limit' && k !== 'offset' && k !== 'q').length > 0;

  if (isLoading || !filters) {
    return (
      <Card className="border-none shadow-none bg-muted/20">
        <CardContent className="p-6">
          <div className="h-6 w-24 bg-muted animate-pulse rounded mb-6"></div>
          <div className="space-y-6">
            <div className="h-10 bg-muted animate-pulse rounded"></div>
            <div className="h-10 bg-muted animate-pulse rounded"></div>
            <div className="h-10 bg-muted animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMake = currentParams.get('make') || '';
  const currentModel = currentParams.get('model') || '';

  // We could filter models based on the selected make if we had that mapping,
  // but listing filters usually just provides distinct values across all inventory.
  // We'll show all models or if backend supports it, it might narrow it down automatically.

  return (
    <Card className="border-border/60 shadow-sm sticky top-24">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <SlidersHorizontal size={18} />
            Refine Search
          </CardTitle>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-muted-foreground hover:text-foreground">
              <X size={14} className="mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Make</Label>
          <Select value={currentMake} onValueChange={(val) => updateFilter('make', val === 'all' ? null : val)}>
            <SelectTrigger>
              <SelectValue placeholder="All Makes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Makes</SelectItem>
              {filters.makes?.map(make => (
                <SelectItem key={make} value={make}>{make}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model</Label>
          <Select 
            value={currentModel} 
            onValueChange={(val) => updateFilter('model', val === 'all' ? null : val)}
            disabled={!currentMake && filters.models?.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {filters.models?.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Price</Label>
          <Select value={currentParams.get('price_max') || ''} onValueChange={(val) => updateFilter('price_max', val === 'all' ? null : val)}>
            <SelectTrigger>
              <SelectValue placeholder="Any Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Price</SelectItem>
              <SelectItem value="10000">Under $10,000</SelectItem>
              <SelectItem value="20000">Under $20,000</SelectItem>
              <SelectItem value="30000">Under $30,000</SelectItem>
              <SelectItem value="40000">Under $40,000</SelectItem>
              <SelectItem value="50000">Under $50,000</SelectItem>
              <SelectItem value="75000">Under $75,000</SelectItem>
              <SelectItem value="100000">Under $100,000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Mileage</Label>
          <Select value={currentParams.get('odometer_max') || ''} onValueChange={(val) => updateFilter('odometer_max', val === 'all' ? null : val)}>
            <SelectTrigger>
              <SelectValue placeholder="Any Mileage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Mileage</SelectItem>
              <SelectItem value="10000">Under 10,000 mi</SelectItem>
              <SelectItem value="30000">Under 30,000 mi</SelectItem>
              <SelectItem value="60000">Under 60,000 mi</SelectItem>
              <SelectItem value="100000">Under 100,000 mi</SelectItem>
              <SelectItem value="150000">Under 150,000 mi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select value={currentParams.get('year_min') || ''} onValueChange={(val) => updateFilter('year_min', val === 'all' ? null : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Min Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {[...Array(20)].map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <SelectItem key={`min-${year}`} value={year.toString()}>{year}</SelectItem>
                })}
              </SelectContent>
            </Select>
            <Select value={currentParams.get('year_max') || ''} onValueChange={(val) => updateFilter('year_max', val === 'all' ? null : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Max Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {[...Array(20)].map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <SelectItem key={`max-${year}`} value={year.toString()}>{year}</SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
