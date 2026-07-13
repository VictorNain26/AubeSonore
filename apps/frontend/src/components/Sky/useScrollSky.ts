import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SKY_STOPS, type Moment } from '../../lib/moments';

gsap.registerPlugin(ScrollTrigger);

const OVERLAY_PEAK = 0.85;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function paintOverlay(overlay: HTMLElement, moment: Moment) {
  const [s1, s2, s3] = SKY_STOPS[moment];
  gsap.set(overlay, { background: `linear-gradient(to top, ${s3}, ${s2} 45%, ${s1})` });
}

export function useScrollSky(): void {
  useEffect(() => {
    if (reduced()) return;

    const overlay = document.querySelector<HTMLElement>('.sky-scroll-overlay');
    if (!overlay) return;

    let triggers: ScrollTrigger[] = [];

    const teardown = () => {
      triggers.forEach((t) => t.kill());
      triggers = [];
    };

    const setup = () => {
      teardown();
      const sections = document.querySelectorAll<HTMLElement>('[data-moment-section]');
      sections.forEach((section) => {
        const sectionMoment = section.dataset.momentSection as Moment | undefined;
        if (!sectionMoment) return;

        const proxy = { progress: 0 };
        const tween = gsap.fromTo(
          proxy,
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
            onUpdate: () => {
              const currentMoment = document.documentElement.dataset.moment as Moment | undefined;
              if (!currentMoment || currentMoment === sectionMoment) {
                gsap.set(overlay, { opacity: 0 });
                return;
              }
              paintOverlay(overlay, sectionMoment);
              const fade = proxy.progress <= 0.5 ? proxy.progress * 2 : (1 - proxy.progress) * 2;
              gsap.set(overlay, { opacity: fade * OVERLAY_PEAK });
            },
          }
        );
        const trigger = tween.scrollTrigger;
        if (trigger) triggers.push(trigger);
      });
      ScrollTrigger.refresh();
    };

    let scanFrame = requestAnimationFrame(function scan() {
      if (document.querySelector('[data-moment-section]')) {
        setup();
        return;
      }
      scanFrame = requestAnimationFrame(scan);
    });

    const onExpanded = () => setup();
    window.addEventListener('aubesonore:timeline-expanded', onExpanded);

    return () => {
      cancelAnimationFrame(scanFrame);
      window.removeEventListener('aubesonore:timeline-expanded', onExpanded);
      teardown();
      gsap.set(overlay, { opacity: 0 });
    };
  }, []);
}
