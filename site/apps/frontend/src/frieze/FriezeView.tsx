import { useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView, type OrthographicViewState } from '@deck.gl/core';
import { SolidPolygonLayer } from '@deck.gl/layers';
import { getLocale } from '@/paraglide/runtime.js';
import * as m from '@/paraglide/messages.js';
import { TEXT_ACTION } from '../home/styles';
import { INCOMPLETE_FROM, laneOutline, type Lane } from './lanes';

// A lane is one band of the frieze: its name and peak on a first line, its
// ridge below. World units: x in years, y in pixels (only time zooms).
export const LANE = 64;
const RIDGE = 40;
const FIRST_YEAR = 1850;
const LAST_YEAR = 2027;
const VIEW = new OrthographicView({ id: 'frieze', flipY: true });

type Rgba = [number, number, number, number];

/** A design token as deck.gl's RGBA, converted by the browser itself. */
function tokenRgba(name: string, alpha: number): Rgba {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [0, 0, 0, Math.round(alpha * 255)];
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, Math.round(alpha * 255)];
}

function fitTime(width: number, from: number, to: number): OrthographicViewState {
  return {
    target: [(from + to) / 2, 0],
    zoomX: Math.log2(width / (to - from)),
    zoomY: 0,
    // Read by the orthographic controller from the view state: only time zooms.
    zoomAxis: 'X',
  };
}

function visibleYears(view: OrthographicViewState, width: number): [number, number] {
  const scale = 2 ** (view.zoomX ?? 0);
  const center = view.target?.[0] ?? 0;
  return [center - width / 2 / scale, center + width / 2 / scale];
}

/** The genres as lanes over time: the overview level of the frieze. */
export function FriezeView({
  lanes,
  hidden,
  onMore,
}: {
  lanes: Lane[];
  /** Genres not drawn yet: they are counted, never cut. */
  hidden: number;
  onMore: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<OrthographicViewState | null>(null);
  const [palette, setPalette] = useState<{ ink: Rgba; veil: Rgba } | null>(null);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
      setPalette(
        (current) =>
          current ?? { ink: tokenRgba('--text-muted', 0.85), veil: tokenRgba('--surface', 0.6) }
      );
      // The first fit shows the last seventy-five years, where the mass is.
      setView(
        (current) => current ?? { ...fitTime(width, 1950, LAST_YEAR), target: [1988.5, height / 2] }
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const height = lanes.length * LANE;
  const layers = useMemo(() => {
    if (!palette) return [];
    return [
      new SolidPolygonLayer<{ lane: Lane; index: number }>({
        id: 'ridges',
        data: lanes.map((lane, index) => ({ lane, index })),
        getPolygon: ({ lane, index }) => laneOutline(lane, (index + 1) * LANE - 8, RIDGE),
        getFillColor: palette.ink,
        updateTriggers: { getPolygon: lanes },
      }),
      new SolidPolygonLayer<{ polygon: [number, number][] }>({
        id: 'incomplete',
        data: [
          {
            polygon: [
              [INCOMPLETE_FROM, 0],
              [LAST_YEAR, 0],
              [LAST_YEAR, height],
              [INCOMPLETE_FROM, height],
            ],
          },
        ],
        getPolygon: (d) => d.polygon,
        getFillColor: palette.veil,
        updateTriggers: { getPolygon: height },
      }),
    ];
  }, [lanes, palette, height]);

  const numbers = new Intl.NumberFormat(getLocale());
  const [yearFrom, yearTo] = view ? visibleYears(view, size.width) : [1950, LAST_YEAR];
  const step = yearTo - yearFrom > 120 ? 50 : yearTo - yearFrom > 40 ? 10 : 5;
  const ticks: number[] = [];
  for (let y = Math.ceil(yearFrom / step) * step; y <= yearTo; y += step) ticks.push(y);
  const scale = view ? 2 ** (view.zoomX ?? 0) : 1;
  const xOf = (year: number) => (year - yearFrom) * scale;
  const top = view ? (view.target?.[1] ?? 0) - size.height / 2 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-accent relative border-t">
        <div aria-hidden="true" className="relative h-8 overflow-hidden">
          {ticks.map((year) => (
            <span
              key={year}
              className="text-label text-text-muted absolute top-2 font-mono tabular-nums"
              style={{ left: xOf(year) }}
            >
              {year}
            </span>
          ))}
        </div>
        <div ref={frame} className="relative h-112 overflow-hidden md:h-144">
          {view && size.width > 0 ? (
            <DeckGL
              views={VIEW}
              viewState={view}
              onViewStateChange={({ viewState }) => setView(viewState)}
              controller={{
                inertia: true,
                maxBounds: [
                  [FIRST_YEAR, 0],
                  [LAST_YEAR, Math.max(height, size.height)],
                ],
              }}
              layers={layers}
            />
          ) : null}
          <ol className="pointer-events-none absolute inset-0 m-0 list-none p-0">
            {lanes.map((lane, index) => (
              <li
                key={lane.mbid}
                className="absolute left-4 flex items-baseline gap-3"
                style={{ top: index * LANE - top + 6 }}
              >
                <span className="text-row">{lane.name}</span>
                <span className="text-label text-text-muted font-mono tabular-nums">
                  {m.frieze_peak({ count: numbers.format(lane.peak), year: String(lane.peakYear) })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <p className="text-text-muted max-w-blurb m-0">
          {m.frieze_incomplete({ year: String(INCOMPLETE_FROM) })}
        </p>
        {hidden > 0 ? (
          <button type="button" onClick={onMore} className={TEXT_ACTION}>
            {m.frieze_more({ count: numbers.format(Math.min(hidden, 40)) })}
          </button>
        ) : null}
      </div>
    </div>
  );
}
