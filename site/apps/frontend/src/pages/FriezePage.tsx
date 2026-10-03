import { useEffect, useMemo, useState } from 'react';
import type { FriezeOverview } from '@aubesonore/shared-types/client';
import { Link } from 'react-router';
import { localizeHref } from '@/paraglide/runtime.js';
import * as m from '@/paraglide/messages.js';
import { FriezeView } from '../frieze/FriezeView';
import { buildLanes, heaviestByEpoch } from '../frieze/lanes';
import { SiteFooter } from '../home/SiteFooter';
import { useHeroListenVisible } from '../home/listen';
import { TEXT_ACTION } from '../home/styles';
import { fetchFriezeOverview } from '../lib/frieze';

const STEP = 40;

/** The frieze: genres as lanes over time. Unlisted while it is a prototype. */
export default function FriezePage() {
  const [overview, setOverview] = useState<FriezeOverview | 'error' | null>(null);
  const [count, setCount] = useState(STEP);
  const setListenVisible = useHeroListenVisible((s) => s.setVisible);

  useEffect(() => setListenVisible(false), [setListenVisible]);

  useEffect(() => {
    const controller = new AbortController();
    fetchFriezeOverview(controller.signal)
      .then(setOverview)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setOverview('error');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = `${m.frieze_title()} — AubeSonore`;
    return () => {
      document.title = previous;
    };
  }, []);

  const all = useMemo(
    () => (overview && overview !== 'error' ? buildLanes(overview) : []),
    [overview]
  );
  const lanes = useMemo(() => heaviestByEpoch(all, count), [all, count]);

  return (
    <>
      <main id="main" className="min-h-dvh">
        <header className="flex items-center justify-between gap-6 px-6 pt-5 md:px-10 md:pt-7">
          <Link
            to={localizeHref('/')}
            className="text-mark condensed ease-out-quart focus-visible:outline-accent inline-flex min-h-11 items-center rounded-sm transition-opacity duration-150 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            aubesonore
          </Link>
          <Link to={localizeHref('/')} className={TEXT_ACTION}>
            {m.artist_back()}
          </Link>
        </header>
        <div className="flex flex-col gap-10 px-6 py-10 md:px-10 md:py-16">
          <div className="flex flex-col gap-3">
            <h1 className="text-hero m-0">{m.frieze_title()}</h1>
            <p className="text-intro text-text-muted max-w-blurb m-0">{m.frieze_body()}</p>
          </div>
          {overview === 'error' ? (
            <p className="text-text-muted m-0">{m.frieze_error()}</p>
          ) : overview === null ? (
            <div aria-busy="true" className="bg-surface-raised h-112 rounded-sm md:h-144" />
          ) : (
            <FriezeView
              lanes={lanes}
              hidden={all.length - lanes.length}
              onMore={() => setCount((c) => c + STEP)}
            />
          )}
          <p className="text-label text-text-muted m-0 font-mono uppercase">{m.frieze_source()}</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
