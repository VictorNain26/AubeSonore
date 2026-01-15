import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-dvh aurora-bg flex flex-col">
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          className: 'bg-card/95 backdrop-blur-sm border border-border text-foreground',
        }}
      />

      {/* Header */}
      <header className="shrink-0 py-4 md:py-5">
        <h1 className="text-center text-sm md:text-lg font-light tracking-[0.25em] md:tracking-[0.3em] text-foreground/80 uppercase">
          AubeSonore
        </h1>
      </header>

      {/* Main - scrollable content area */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-3 md:py-4">
        <p className="text-center text-[10px] md:text-xs text-muted-foreground/50 tracking-widest">
          Éveillez vos sens
        </p>
      </footer>
    </div>
  );
}
