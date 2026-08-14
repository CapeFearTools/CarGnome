import { motion } from 'framer-motion';
import { useGetListings } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

interface DiscoverHeroProps {
  onStart: () => void;
}

export function DiscoverHero({ onStart }: DiscoverHeroProps) {
  const { data } = useGetListings({ limit: 24 });
  const tiles = (data?.items ?? []).map((l) => l.photo_urls?.[0]).filter(Boolean) as string[];

  return (
    <div className="relative overflow-hidden min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
      {tiles.length > 0 && (
        <div
          aria-hidden
          className="absolute inset-0 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 scale-110 blur-sm opacity-90"
        >
          {tiles.map((src, i) => (
            <div key={i} className="aspect-square bg-muted overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-background/60 via-background/50 to-background/70"
      />
      <div
        aria-hidden
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative max-w-xl text-center flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2 mb-6 text-primary bg-primary/10 rounded-full px-4 py-1.5"
        >
          <Sparkles size={16} />
          <span className="text-sm font-semibold uppercase tracking-wider">Discover Mode</span>
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-4 leading-tight">
          Let's find your
          <br />
          perfect match
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-md">
          Answer a few quick questions, then swipe through cars picked just for you. No scrolling
          through pages of listings.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button size="lg" className="gap-2 text-base px-8 h-14 rounded-full" onClick={onStart}>
            Find My Match
            <ArrowRight size={18} />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
