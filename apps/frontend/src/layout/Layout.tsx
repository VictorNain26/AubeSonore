import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen aurora-bg">
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          className: 'bg-card/95 backdrop-blur-sm border border-border text-foreground',
        }}
      />

      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-6 py-5">
          <h1 className="text-center text-lg font-light tracking-[0.3em] text-foreground/80 uppercase">
            AubeSonore
          </h1>
        </div>
      </header>

      <main className="min-h-screen">{children}</main>

      <footer className="fixed bottom-0 left-0 right-0 z-50 py-4">
        <p className="text-center text-xs text-muted-foreground/50 tracking-widest">
          Éveillez vos sens
        </p>
      </footer>
    </div>
  );
}
