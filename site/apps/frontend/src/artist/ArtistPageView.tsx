import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { Cover } from '../home/Cover';
import { TEXT_ACTION } from '../home/styles';
import { artistPath } from '../lib/artistProfile';
import { cn } from '../lib/utils';
import * as m from '@/paraglide/messages.js';

export type ArtistPageState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; profile: ArtistProfile };

const PLATFORM_LABELS: Record<string, () => string> = {
  official: () => m.artist_link_official(),
  bandcamp: () => 'Bandcamp',
  soundcloud: () => 'SoundCloud',
  wikipedia: () => m.artist_link_wikipedia(),
};

function formatPlayedAt(iso: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function Section({
  id,
  title,
  body,
  children,
}: {
  id: string;
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid gap-6 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-16"
    >
      <div className="reveal flex flex-col gap-2 self-start md:gap-3">
        <h2 id={`${id}-title`} className="text-section m-0">
          {title}
        </h2>
        {body ? <p className="text-text-muted max-w-blurb m-0">{body}</p> : null}
      </div>
      <div className="flex min-w-0 flex-col">{children}</div>
    </section>
  );
}

function Header() {
  return (
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
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="lift-in flex flex-col gap-4 px-6 py-24 md:px-10">
      <h1 className="text-hero m-0">{title}</h1>
      <p className="text-intro text-text-muted max-w-blurb m-0">{body}</p>
    </div>
  );
}

const LIFT =
  'ease-out-soft group-hover:shadow-lift transition-[translate,box-shadow] duration-500 motion-safe:group-hover:-translate-y-1.5';

function Profile({ profile }: { profile: ArtistProfile }) {
  return (
    <>
      <div className="lift-in grid gap-6 px-6 pt-10 md:grid-cols-12 md:items-end md:gap-x-10 md:px-10 md:pt-16">
        <Cover
          src={profile.image}
          alt={m.artist_portrait_alt({ name: profile.name })}
          seed={profile.name}
          priority
          className="aspect-square w-40 md:col-span-4 md:w-full lg:col-span-3"
        />
        <div className="flex min-w-0 flex-col gap-3 md:col-span-8 lg:col-span-9">
          <p className="text-label text-text-muted m-0 font-mono uppercase">{m.artist_label()}</p>
          <h1 className="text-hero m-0 break-words">{profile.name}</h1>
          {profile.tags.length > 0 ? (
            <p className="text-sub text-text-muted m-0">{profile.tags.join(' · ')}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-16 px-6 py-12 md:gap-28 md:px-10 md:py-20">
        <Section id="played" title={m.artist_played_title()} body={m.artist_played_body()}>
          {profile.playedOnRadio.length > 0 ? (
            <ol className="border-accent m-0 list-none border-t p-0">
              {profile.playedOnRadio.map((play) => (
                <li
                  key={`${play.playedAt}-${play.title}`}
                  className="border-border reveal grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-b py-2 md:px-1"
                >
                  <span className="text-row truncate">{play.title}</span>
                  <span className="text-ui text-text-muted font-mono whitespace-nowrap tabular-nums">
                    {formatPlayedAt(play.playedAt)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-text-muted border-accent m-0 border-t pt-4">
              {m.artist_played_empty()}
            </p>
          )}
        </Section>

        {profile.bio ? (
          <Section id="bio" title={m.artist_bio_title()}>
            {/* Last.fm serves the French biography, whatever the page language. */}
            <p lang="fr" className="text-intro m-0 max-w-prose whitespace-pre-line">
              {profile.bio}
            </p>
          </Section>
        ) : null}

        {profile.similar.length > 0 ? (
          <Section id="similar" title={m.artist_similar_title()} body={m.artist_similar_body()}>
            <ol className="m-0 -mx-6 flex scrollbar-none list-none gap-3.5 overflow-x-auto px-6 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
              {profile.similar.map((similar) => {
                const card = (
                  <>
                    <Cover
                      src={similar.image}
                      alt=""
                      seed={similar.name}
                      className={cn('aspect-square w-full', similar.page && LIFT)}
                    />
                    <span className="text-row truncate">{similar.name}</span>
                  </>
                );
                return (
                  <li key={similar.name} className="reveal flex w-38 shrink-0 flex-col md:w-auto">
                    {similar.page ? (
                      <Link
                        to={artistPath(similar.page)}
                        className="group focus-visible:outline-accent flex flex-col gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 md:gap-3"
                      >
                        {card}
                      </Link>
                    ) : (
                      <div className="flex flex-col gap-2 md:gap-3">{card}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Section>
        ) : null}

        {profile.links.length > 0 || profile.topTracks.length > 0 ? (
          <Section id="listen" title={m.artist_listen_title()}>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {profile.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className={TEXT_ACTION}
                  >
                    {PLATFORM_LABELS[link.platform]?.() ?? link.platform}
                  </a>
                </li>
              ))}
              {profile.topTracks.map((track) => (
                <li key={track.url}>
                  <a
                    href={track.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className={cn(TEXT_ACTION, 'gap-3')}
                  >
                    {track.title}
                    <span className="text-label text-text-muted font-mono uppercase">Deezer</span>
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </>
  );
}

/** An artist heard on the antenna: what the radio played, then where to go further. */
export function ArtistPageView({ state }: { state: ArtistPageState }) {
  return (
    <main id="main" className="min-h-dvh">
      <Header />
      {state.status === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-6 px-6 pt-10 md:px-10 md:pt-16">
          <span className="bg-surface-raised aspect-square w-40 rounded-sm md:w-60" />
          <span className="bg-surface-raised h-12 w-2/3 rounded-sm" />
        </div>
      ) : state.status === 'missing' ? (
        <Message title={m.artist_missing_title()} body={m.artist_missing_body()} />
      ) : state.status === 'error' ? (
        <Message title={m.artist_error_title()} body={m.artist_error_body()} />
      ) : (
        <Profile profile={state.profile} />
      )}
    </main>
  );
}
