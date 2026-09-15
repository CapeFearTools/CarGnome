import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { Layout } from '@/components/Layout';
import Home from '@/pages/Home';
import Discover from '@/pages/Discover';
import ListingDetail from '@/pages/ListingDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry network hiccups and server errors, but not 4xx responses: a sold
      // car's 404 should show "not found" right away, not after several retries.
      retry: (failureCount, error) => {
        const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
        return (status === undefined || status >= 500) && failureCount < 2;
      },
      // Inventory changes once a day, and refetching when the tab regains focus
      // could reshuffle the Discover deck mid-swipe.
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          <Route path="/" component={Discover} />
          <Route path="/browse" component={Home} />
          <Route path="/listings/:vin" component={ListingDetail} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
