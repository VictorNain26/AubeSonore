import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type {
  ArtistFacts,
  ArtistPlatform,
  ArtistProfile,
  ArtistSummary,
  FriezeArtist,
  FriezeArtistRef,
  FriezeLineage,
} from '@aubesonore/shared-types/client';
import { artistPath } from '../lib/artistProfile';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { Cover } from '../home/Cover';
import { TEXT_ACTION } from '../home/styles';
import * as m from '@/paraglide/messages.js';

export type ArtistPageState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; profile: ArtistProfile };

/** musilogy's view of the artist, keyed by its MBID: nothing to state without one. */
export type LineageState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; artist: FriezeArtist | null };

// The role of the other artist, in the source's own terms: a teacher is not an
// influence. A source the client does not know yet shows its own name.
const ROLES: Record<FriezeLineage['side'], Record<string, () => string>> = {
  inspiration: {
    mb_teacher: () => m.artist_role_teacher(),
    mb_tribute: () => m.artist_role_honoured(),
    mb_named_after: () => m.artist_role_name_taken(),
  },
  descendant: {
    mb_teacher: () => m.artist_role_pupil(),
    mb_tribute: () => m.artist_role_tribute(),
    mb_named_after: () => m.artist_role_named_after(),
  },
};

// Tribute bands crowd the legacy of famous artists: a list shows its first
// rows, in musilogy's order, and says how many remain.
const SHOWN = 12;

const PLATFORM_LABELS: Record<ArtistPlatform, () => string> = {
  deezer: () => 'Deezer',
  spotify: () => 'Spotify',
  appleMusic: () => 'Apple Music',
  bandcamp: () => 'Bandcamp',
  soundcloud: () => 'SoundCloud',
  official: () => m.artist_link_official(),
};

const KIND_LABELS: Record<NonNullable<ArtistFacts['kind']>, () => string> = {
  person: () => m.artist_kind_person(),
  group: () => m.artist_kind_group(),
  orchestra: () => m.artist_kind_orchestra(),
  choir: () => m.artist_kind_choir(),
};

// Wikipedia text is CC BY-SA: the article and the licence are both linked.
// https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content
const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

/** "Groupe · Paris, France · 1993 – 2021": what MusicBrainz states, nothing more. */
export function factsLine(facts: ArtistFacts): string | null {
  const country = facts.country
    ? new Intl.DisplayNames([getLocale()], { type: 'region' }).of(facts.country)
    : undefined;
  const where = [facts.place, country].filter(Boolean).join(', ');
  const formed = facts.formed ? String(facts.formed) : null;
  const when = !formed
    ? ''
    : facts.ended
      ? `${formed} – ${facts.ended}`
      : facts.active
        ? m.artist_since({ year: formed })
        : m.artist_formed({ year: formed });
  const parts = [facts.kind ? KIND_LABELS[facts.kind]() : '', where, when].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

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

const OUTSIDE_LINK = { rel: 'noopener noreferrer', target: '_blank' } as const;

function Summary({ summary }: { summary: ArtistSummary }) {
  return (
    <figure className="m-0 flex flex-col gap-3 md:col-span-8 md:col-start-5 lg:col-span-7 lg:col-start-4">
      <blockquote cite={summary.url} lang={summary.lang} className="m-0">
        <p className="text-intro m-0 max-w-prose">{summary.text}</p>
      </blockquote>
      <figcaption className="text-label text-text-muted flex items-center gap-3 font-mono uppercase">
        <a href={summary.url} {...OUTSIDE_LINK} className={TEXT_ACTION}>
          {summary.lang === getLocale()
            ? m.artist_summary_source()
            : m.artist_summary_source_other()}
        </a>
        <span aria-hidden="true">·</span>
        <a href={LICENSE_URL} {...OUTSIDE_LINK} className={TEXT_ACTION}>
          CC BY-SA 4.0
        </a>
      </figcaption>
    </figure>
  );
}

function years(from: number | null, to: number | null): string {
  if (from === null) return '';
  return to === null || to === from ? String(from) : `${from} – ${to}`;
}

function ArtistName({ artist }: { artist: FriezeArtistRef }) {
  return artist.played ? (
    <Link to={artistPath(artist.played)} className={`${TEXT_ACTION} text-row truncate`}>
      {artist.name}
    </Link>
  ) : (
    <span className="text-row truncate">{artist.name}</span>
  );
}

function ArtistRow({
  artist,
  detail,
  when,
}: {
  artist: FriezeArtistRef;
  detail: string;
  when: string;
}) {
  return (
    <li className="border-border reveal grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-b py-2 md:px-1">
      <span className="flex min-w-0 flex-col">
        <ArtistName artist={artist} />
        {/* MusicBrainz's disambiguation tells homonyms apart, under the name. */}
        <span className="text-ui text-text-muted truncate">
          {artist.disambiguation ? `${artist.disambiguation} · ${detail}` : detail}
        </span>
      </span>
      <span className="text-ui text-text-muted font-mono whitespace-nowrap tabular-nums">
        {when}
      </span>
    </li>
  );
}

function ArtistList({ total, children }: { total: number; children: ReactNode[] }) {
  if (total === 0) {
    return (
      <p className="text-text-muted border-accent m-0 border-t pt-4">{m.artist_lineage_none()}</p>
    );
  }
  return (
    <>
      <ul className="border-accent m-0 list-none border-t p-0">{children.slice(0, SHOWN)}</ul>
      {total > Math.min(children.length, SHOWN) ? (
        <p className="text-text-muted m-0 pt-4">
          {m.artist_lineage_more({ count: total - Math.min(children.length, SHOWN) })}
        </p>
      ) : null}
    </>
  );
}

function LineageSide({ rows, side }: { rows: FriezeLineage[]; side: FriezeLineage['side'] }) {
  const items = rows.filter((row) => row.side === side);
  // Tribute acts crowd the legacy of famous artists: they are counted under
  // their own label rather than mixed with the heirs (frieze spec, lineage).
  const tributes = side === 'descendant' ? items.filter((r) => r.source === 'mb_tribute') : [];
  const heirs = side === 'descendant' ? items.filter((r) => r.source !== 'mb_tribute') : items;
  return (
    <>
      {heirs.length > 0 || tributes.length === 0 ? (
        <ArtistList total={heirs.length}>
          {heirs.map((row) => (
            <ArtistRow
              key={`${row.source}-${row.artist.mbid}`}
              artist={row.artist}
              detail={ROLES[side][row.source]?.() ?? row.source}
              when={years(row.artist.y0, row.artist.yEnd)}
            />
          ))}
        </ArtistList>
      ) : null}
      {tributes.length > 0 ? (
        <p
          className={`text-text-muted m-0 pt-4 ${heirs.length === 0 ? 'border-accent border-t' : ''}`}
        >
          {m.artist_tributes({ count: tributes.length })}
        </p>
      ) : null}
    </>
  );
}

/** Where the artist comes from and who played beside them, from musilogy. */
function Lineage({ artist }: { artist: FriezeArtist }) {
  const { contemporaries } = artist;
  return (
    <>
      <Section id="models" title={m.artist_models_title()} body={m.artist_models_body()}>
        <LineageSide rows={artist.lineage} side="inspiration" />
      </Section>
      <Section id="heirs" title={m.artist_heirs_title()} body={m.artist_heirs_body()}>
        <LineageSide rows={artist.lineage} side="descendant" />
      </Section>
      <Section id="peers" title={m.artist_peers_title()} body={m.artist_peers_body()}>
        <ArtistList total={contemporaries.total}>
          {contemporaries.items.map((peer) => (
            <ArtistRow
              key={peer.artist.mbid}
              artist={peer.artist}
              detail={`${peer.sharedGenres.join(', ')} · ${
                peer.scene === 'begin_area' ? m.artist_scene_place() : m.artist_scene_country()
              }`}
              when={years(peer.artist.y0, peer.artist.yPresenceEnd)}
            />
          ))}
        </ArtistList>
      </Section>
    </>
  );
}

function Profile({ profile, lineage }: { profile: ArtistProfile; lineage: LineageState }) {
  const facts = profile.facts ? factsLine(profile.facts) : null;

  return (
    <>
      <div className="lift-in grid gap-6 px-6 pt-10 md:grid-cols-12 md:items-end md:gap-x-10 md:gap-y-12 md:px-10 md:pt-16">
        <Cover
          src={profile.image}
          alt={m.artist_portrait_alt({ name: profile.name })}
          seed={profile.name}
          priority
          className="aspect-square w-40 md:col-span-4 md:w-full lg:col-span-3"
        />
        <div className="flex min-w-0 flex-col gap-3 md:col-span-8 lg:col-span-9">
          <h1 className="text-hero m-0 break-words">{profile.name}</h1>
          {facts ? <p className="text-sub text-text-muted m-0">{facts}</p> : null}
        </div>
        {profile.summary ? <Summary summary={profile.summary} /> : null}
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

        {lineage.status === 'ready' && lineage.artist ? <Lineage artist={lineage.artist} /> : null}

        {profile.links.length > 0 ? (
          <Section id="listen" title={m.artist_listen_title()} body={m.artist_listen_body()}>
            <ul className="border-accent m-0 flex list-none flex-wrap gap-x-8 border-t p-0 pt-2">
              {profile.links.map((link) => (
                <li key={link.url} className="reveal">
                  <a href={link.url} {...OUTSIDE_LINK} className={TEXT_ACTION}>
                    {PLATFORM_LABELS[link.platform]()}
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

/** An artist heard on the antenna: who they are, what the radio played, where to hear more. */
export function ArtistPageView({
  state,
  lineage = { status: 'none' },
}: {
  state: ArtistPageState;
  lineage?: LineageState;
}) {
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
        <Profile profile={state.profile} lineage={lineage} />
      )}
    </main>
  );
}
