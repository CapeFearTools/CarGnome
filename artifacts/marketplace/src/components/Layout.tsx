import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Car, Sparkles, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

function ModeToggle() {
  const [location] = useLocation();
  const isDiscover = location === '/';

  return (
    <div className="inline-flex items-center rounded-full bg-muted p-1 gap-1">
      <Link
        href="/"
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 md:px-4 py-1.5 text-sm font-semibold transition-colors',
          isDiscover ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Sparkles size={15} />
        <span className="hidden sm:inline">Discover</span>
      </Link>
      <Link
        href="/browse"
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 md:px-4 py-1.5 text-sm font-semibold transition-colors',
          !isDiscover ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <LayoutGrid size={15} />
        <span className="hidden sm:inline">Browse All</span>
      </Link>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Car size={20} strokeWidth={2.5} />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight hidden md:inline">
              Drive Cape Fear
            </span>
          </Link>
          <ModeToggle />
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Financing
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              About Us
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      
      <footer className="border-t bg-muted/30 py-12 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary text-primary-foreground p-1 rounded">
                <Car size={16} strokeWidth={2.5} />
              </div>
              <span className="font-serif text-lg font-semibold tracking-tight">
                Drive Cape Fear
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              We offer a curated selection of premium used vehicles. Every car in our inventory is thoroughly inspected and carefully chosen to ensure quality and peace of mind.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">Browse Inventory</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">Value Your Trade</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Apply for Financing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>123 Classic Drive</li>
              <li>Motor City, MC 12345</li>
              <li>(555) 123-4567</li>
              <li>sales@drivecapefear.example.com</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between">
          <p>&copy; {new Date().getFullYear()} Drive Cape Fear. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
