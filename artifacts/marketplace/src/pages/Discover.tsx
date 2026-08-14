import { useState } from 'react';
import type { GetListingsParams, Listing } from '@workspace/api-client-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { DiscoverHero } from '@/components/discover/DiscoverHero';
import { DiscoverQuiz } from '@/components/discover/DiscoverQuiz';
import { SwipeDeck } from '@/components/discover/SwipeDeck';
import { Shortlist } from '@/components/discover/Shortlist';

type Stage = 'hero' | 'quiz' | 'swipe' | 'shortlist';

export default function Discover() {
  const [liked, setLiked, clearLiked] = useLocalStorage<Listing[]>('discover-liked', []);
  const [stage, setStage] = useState<Stage>(liked.length > 0 ? 'shortlist' : 'hero');
  const [quizParams, setQuizParams] = useState<GetListingsParams | null>(null);

  const handleQuizComplete = (params: GetListingsParams) => {
    setQuizParams(params);
    setStage('swipe');
  };

  const handleLike = (listing: Listing) => {
    setLiked((prev) => (prev.some((l) => l.vin === listing.vin) ? prev : [...prev, listing]));
  };

  const handleRemove = (vin: string) => {
    setLiked((prev) => prev.filter((l) => l.vin !== vin));
  };

  const handleStartOver = () => {
    clearLiked();
    setQuizParams(null);
    setStage('quiz');
  };

  const handleFindMore = () => {
    setQuizParams(null);
    setStage('quiz');
  };

  if (stage === 'hero') {
    return <DiscoverHero onStart={() => setStage('quiz')} />;
  }

  if (stage === 'quiz') {
    return <DiscoverQuiz onComplete={handleQuizComplete} />;
  }

  if (stage === 'swipe' && quizParams) {
    return (
      <SwipeDeck
        params={quizParams}
        excludeVins={liked.map((l) => l.vin)}
        onLike={handleLike}
        onFinished={() => setStage('shortlist')}
        onRestart={handleStartOver}
      />
    );
  }

  return (
    <Shortlist
      liked={liked}
      onRemove={handleRemove}
      onFindMore={handleFindMore}
      onStartOver={handleStartOver}
    />
  );
}
