import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SKY_STOPS, type Moment } from '../../lib/moments';

gsap.registerPlugin(ScrollTrigger);

const OVERLAY_PEAK = 0.85;
const SCAN_FRAME_BUDGET = 600;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface SectionState {
  moment: Moment;
  progress: number;
}

export function useScrollSky(): void {
  useEffect(() => {
    if (reduced()) return;

    const overlay = document.querySelector<HTMLElement>('.sky-scroll-overlay');
    if (!overlay) return;

    let triggers: ScrollTrigger[] = [];
    let states: SectionState[] = [];
    let paintedMoment: Moment | null = null;

    const repaint = () => {
      const currentMoment = document.documentElement.dataset.moment as Moment | undefined;
      let best: SectionState | null = null;
      let bestInsideness = 0;
      for (const state of states) {
        const insideness = Math.min(state.progress, 1 - state.progress);
        if (insideness > bestInsideness) {
          bestInsideness = insideness;
          best = state;
        }
      }
      if (!best || !currentMoment || best.moment === currentMoment) {
        paintedMoment = null;
        gsap.set(overlay, { opacity: 0 });
        return;
      }
      if (paintedMoment !== best.moment) {
        paintedMoment = best.moment;
        const [s1, s2, s3] = SKY_STOPS[best.moment];
        gsap.set(overlay, { background: `linear-gradient(to top, ${s3}, ${s2} 45%, ${s1})` });
      }
      gsap.set(overlay, { opacity: bestInsideness * 2 * OVERLAY_PEAK });
    };

    const teardown = () => {
      triggers.forEach((t) => t.kill());
      triggers = [];
      states = [];
      paintedMoment = null;
    };

    const setup = () => {
      teardown();
      const sections = document.querySelectorAll<HTMLElement>('[data-moment-section]');
      sections.forEach((section) => {
        const sectionMoment = section.dataset.momentSection as Moment | undefined;
        if (!sectionMoment) return;

        const state: SectionState = { moment: sectionMoment, progress: 0 };
        states.push(state);
        const tween = gsap.fromTo(
          state,
          { progress: 0 },
          {
            progress: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top 60%',
              end: 'bottom 60%',
              scrub: 0.6,
            },
            onUpdate: repaint,
          }
        );
        const trigger = tween.scrollTrigger;
        if (trigger) triggers.push(trigger);
      });
      ScrollTrigger.refresh();
    };

    let framesLeft = SCAN_FRAME_BUDGET;
    let scanFrame = requestAnimationFrame(function scan() {
      if (document.querySelector('[data-moment-section]')) {
        setup();
        return;
      }
      framesLeft -= 1;
      if (framesLeft > 0) scanFrame = requestAnimationFrame(scan);
    });

    const onExpanded = () => setup();
    window.addEventListener('aubesonore:timeline-expanded', onExpanded);

    const momentObserver = new MutationObserver(repaint);
    momentObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-moment'],
    });

    return () => {
      cancelAnimationFrame(scanFrame);
      momentObserver.disconnect();
      window.removeEventListener('aubesonore:timeline-expanded', onExpanded);
      teardown();
      gsap.set(overlay, { opacity: 0 });
    };
  }, []);
}
