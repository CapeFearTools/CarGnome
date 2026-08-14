import { useState } from 'react';
import { useGetListingFilters } from '@workspace/api-client-react';
import type { GetListingsParams } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Sparkles, Search, Shuffle, Check } from 'lucide-react';

interface DiscoverQuizProps {
  onComplete: (params: GetListingsParams, makes?: string[]) => void;
}

const PRICE_OPTIONS = [
  { label: 'Under $10k', value: 10000 },
  { label: 'Under $20k', value: 20000 },
  { label: 'Under $30k', value: 30000 },
  { label: 'Under $50k', value: 50000 },
  { label: 'Under $75k', value: 75000 },
  { label: 'No limit', value: undefined },
];

const MILEAGE_OPTIONS = [
  { label: 'Under 10k mi', value: 10000 },
  { label: 'Under 30k mi', value: 30000 },
  { label: 'Under 60k mi', value: 60000 },
  { label: 'Under 100k mi', value: 100000 },
  { label: 'Any mileage', value: undefined },
];

type Answers = {
  make?: string;
  price_max?: number;
  odometer_max?: number;
};

export function DiscoverQuiz({ onComplete }: DiscoverQuizProps) {
  const { data: filters, isLoading } = useGetListingFilters();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);

  const steps = ['make', 'price', 'mileage'] as const;
  const totalSteps = steps.length;

  const advance = (patch: Answers) => {
    const next = { ...answers, ...patch };
    setAnswers(next);
    if (step + 1 >= totalSteps) {
      onComplete({ ...next, limit: selectedMakes.length ? 60 : 30 }, selectedMakes);
    } else {
      setStep(step + 1);
    }
  };

  const handleMakeContinue = () => advance({});

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  if (isLoading || !filters) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 space-y-4">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const currentStep = steps[step];

  return (
    <div className="max-w-md mx-auto py-12 md:py-20 px-4 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-3 text-primary">
        <Sparkles size={22} />
        <span className="text-sm font-semibold uppercase tracking-wider">Discover</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
        Let's find your match
      </h1>
      <p className="text-muted-foreground mb-8">
        Answer a few quick questions, then swipe to build your shortlist.
      </p>

      <Progress value={((step + 1) / totalSteps) * 100} className="mb-10 w-full max-w-xs" />

      {currentStep === 'make' && (
        <BrandStep
          makes={filters.makes}
          selected={selectedMakes}
          onToggle={(make) =>
            setSelectedMakes((prev) =>
              prev.includes(make) ? prev.filter((m) => m !== make) : [...prev, make],
            )
          }
          onSurpriseMe={() => {
            setSelectedMakes([]);
            advance({});
          }}
          onContinue={handleMakeContinue}
        />
      )}

      {currentStep === 'price' && (
        <QuizStep
          question="What's your budget?"
          options={PRICE_OPTIONS}
          onSelect={(value) => advance({ price_max: value as number | undefined })}
        />
      )}

      {currentStep === 'mileage' && (
        <QuizStep
          question="How many miles are okay?"
          options={MILEAGE_OPTIONS}
          onSelect={(value) => advance({ odometer_max: value as number | undefined })}
        />
      )}

      {step > 0 && (
        <Button variant="ghost" size="sm" className="mt-8 text-muted-foreground" onClick={goBack}>
          Back
        </Button>
      )}
    </div>
  );
}

function BrandStep({
  makes,
  selected,
  onToggle,
  onSurpriseMe,
  onContinue,
}: {
  makes: string[];
  selected: string[];
  onToggle: (make: string) => void;
  onSurpriseMe: () => void;
  onContinue: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? makes.filter((m) => m.toLowerCase().includes(query.trim().toLowerCase()))
    : makes;

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-1">Any brand you're set on?</h2>
      <p className="text-sm text-muted-foreground mb-4">Pick as many as you like, or skip.</p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brands..."
          className="pl-9 h-11 rounded-xl"
          autoFocus
        />
      </div>

      <button
        onClick={onSurpriseMe}
        className={cn(
          'w-full mb-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-left',
          'bg-gradient-to-r from-primary to-primary/70 text-primary-foreground',
          'hover:opacity-90 active:scale-[0.98] transition-all',
          'flex items-center gap-2.5',
        )}
      >
        <Shuffle size={16} />
        Surprise me — show all brands
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
        {filtered.map((make) => {
          const isSelected = selected.includes(make);
          return (
            <button
              key={make}
              onClick={() => onToggle(make)}
              className={cn(
                'relative rounded-xl border px-3 py-3.5 text-sm font-medium transition-all active:scale-95',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 bg-card hover:border-primary hover:bg-primary/5 hover:text-primary',
              )}
            >
              {isSelected && (
                <Check size={14} className="absolute top-1.5 right-1.5 text-primary" />
              )}
              {make}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground py-6 text-center">
            No brands match "{query}"
          </p>
        )}
      </div>

      {selected.length > 0 && (
        <Button onClick={onContinue} className="w-full mt-5 h-11 rounded-xl">
          Continue with {selected.length} {selected.length === 1 ? 'brand' : 'brands'}
        </Button>
      )}
    </div>
  );
}

function QuizStep({
  question,
  options,
  onSelect,
}: {
  question: string;
  options: { label: string; value: string | number | undefined }[];
  onSelect: (value: string | number | undefined) => void;
}) {
  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-6">{question}</h2>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'rounded-xl border border-border/60 bg-card px-4 py-4 text-sm font-medium',
              'hover:border-primary hover:bg-primary/5 hover:text-primary transition-all',
              'active:scale-95',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
