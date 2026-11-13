import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface IntroCurtainProps {
  onRevealStart: () => void;
  onComplete: () => void;
}

export const INTRO_STORAGE_KEY = 'ets_chipeaux_intro_vu';

export function hasSeenIntro(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    window.sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
  } catch {
    // Ignore storage errors (private browsing / restricted iframes)
  }
}

export function IntroCurtain({ onRevealStart, onComplete }: IntroCurtainProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const exitingRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const [isMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const [reducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  const [spinDone, setSpinDone] = useState(reducedMotion);
  const [exiting, setExiting] = useState(false);
  const [dockStyle, setDockStyle] = useState<CSSProperties>({});

  const triggerExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    markIntroSeen();

    if (!reducedMotion && wrapRef.current) {
      const logoRect = wrapRef.current.getBoundingClientRect();
      const targetEl = document.querySelector('[data-header-logo="true"]') as HTMLElement | null;

      if (targetEl && logoRect.width > 0) {
        const targetRect = targetEl.getBoundingClientRect();
        if (targetRect.width > 0 && targetRect.height > 0) {
          const logoCenterX = logoRect.left + logoRect.width / 2;
          const logoCenterY = logoRect.top + logoRect.height / 2;
          const targetCenterX = targetRect.left + targetRect.width / 2;
          const targetCenterY = targetRect.top + targetRect.height / 2;
          const scale = Math.max(0.18, Math.min(0.45, targetRect.width / logoRect.width));

          setDockStyle({
            ['--dock-x' as string]: `${Math.round(targetCenterX - logoCenterX)}px`,
            ['--dock-y' as string]: `${Math.round(targetCenterY - logoCenterY)}px`,
            ['--dock-scale' as string]: scale.toFixed(3),
          });
        }
      }
    }

    onRevealStart();
    setExiting(true);

    const finishDelay = reducedMotion ? 260 : 720;
    window.setTimeout(() => {
      onComplete();
    }, finishDelay);
  }, [onComplete, onRevealStart, reducedMotion]);

  // Lock body scroll cleanly while the curtain is visible
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Spin timing + automatic exit + absolute failsafe timer
  useEffect(() => {
    if (reducedMotion) {
      const reducedTimer = window.setTimeout(() => triggerExit(), 180);
      return () => window.clearTimeout(reducedTimer);
    }

    const spinDuration = isMobile ? 1450 : 2100;
    const hintTimer = window.setTimeout(() => {
      setSpinDone(true);
    }, spinDuration);

    const autoExitTimer = window.setTimeout(() => {
      triggerExit();
    }, spinDuration + 650);

    // Failsafe so the page can never remain blocked
    const safetyTimer = window.setTimeout(() => {
      triggerExit();
    }, 4800);

    return () => {
      window.clearTimeout(hintTimer);
      window.clearTimeout(autoExitTimer);
      window.clearTimeout(safetyTimer);
    };
  }, [isMobile, reducedMotion, triggerExit]);

  // Immediate exit on user interaction (wheel, touch/swipe, keydown, click)
  useEffect(() => {
    const onWheel = () => triggerExit();
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'Space', ' ', 'Enter', 'Escape', 'PageDown'].includes(e.key)) {
        triggerExit();
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const startY = touchStartYRef.current;
      const currY = e.touches[0]?.clientY;
      if (startY !== null && currY !== undefined && Math.abs(currY - startY) > 10) {
        triggerExit();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [triggerExit]);

  const curtainClass = exiting
    ? reducedMotion
      ? 'intro-curtain intro-curtain--fade-exit'
      : 'intro-curtain intro-curtain--exit'
    : 'intro-curtain';

  return (
    <div
      className={curtainClass}
      role="dialog"
      aria-label="Bienvenue chez ETS Chipeaux"
      onClick={triggerExit}
    >
      <div className="intro-scene">
        <div
          ref={wrapRef}
          style={dockStyle}
          className={`intro-logo-wrap ${
            reducedMotion ? '' : 'intro-logo-wrap--spin'
          } ${exiting && !reducedMotion ? 'intro-logo-wrap--dock' : ''}`}
        >
          <BrandLogo className="intro-logo" alt="ETS Chipeaux" />
        </div>
      </div>

      {!reducedMotion && (
        <button
          type="button"
          className={`intro-scroll-hint ${spinDone && !exiting ? 'intro-scroll-hint--visible' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            triggerExit();
          }}
        >
          <span>Défiler</span>
          <ArrowDown className="w-4 h-4 stroke-[1.5]" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
