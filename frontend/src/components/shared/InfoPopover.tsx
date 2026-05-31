import { Info } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;
const VIEWPORT_MARGIN = 12;
const DEFAULT_WIDTH = 280;

type PopoverPlacement = { top: number; left: number; width: number; maxHeight: number };

function computePlacement(
  trigger: DOMRect,
  popoverHeight: number,
  popoverWidth: number,
): PopoverPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(popoverWidth, vw - VIEWPORT_MARGIN * 2);

  let left = trigger.left + trigger.width / 2 - width / 2;
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - width - VIEWPORT_MARGIN));

  const spaceBelow = vh - trigger.bottom - GAP - VIEWPORT_MARGIN;
  const spaceAbove = trigger.top - GAP - VIEWPORT_MARGIN;
  const preferBelow = spaceBelow >= Math.min(popoverHeight, 120) || spaceBelow >= spaceAbove;

  let top: number;
  let maxHeight: number;
  if (preferBelow) {
    top = trigger.bottom + GAP;
    maxHeight = Math.max(80, spaceBelow);
  } else {
    maxHeight = Math.max(80, spaceAbove);
    top = Math.max(VIEWPORT_MARGIN, trigger.top - GAP - Math.min(popoverHeight, maxHeight));
  }

  return { top, left, width, maxHeight };
}

export function InfoPopover({
  title,
  children,
  ariaLabel,
  buttonClassName,
  iconSize = 'sm',
}: {
  title: string;
  children: React.ReactNode;
  ariaLabel?: string;
  buttonClassName?: string;
  iconSize?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const height = popover?.offsetHeight ?? 160;
    setPlacement(computePlacement(rect, height, DEFAULT_WIDTH));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePlacement();
    const id = requestAnimationFrame(updatePlacement);
    return () => cancelAnimationFrame(id);
  }, [open, updatePlacement, children]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePlacement();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updatePlacement]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const iconClass = iconSize === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-label={ariaLabel ?? `About ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          buttonClassName ??
          'ml-1 inline-flex rounded-full p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40'
        }
      >
        <Info className={iconClass} />
      </button>

      {open &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9998] cursor-default bg-transparent"
              aria-label="Close"
              onClick={() => setOpen(false)}
            />
            <div
              ref={popoverRef}
              role="dialog"
              aria-label={title}
              style={{
                position: 'fixed',
                top: placement?.top ?? 0,
                left: placement?.left ?? VIEWPORT_MARGIN,
                width: placement?.width ?? DEFAULT_WIDTH,
                maxHeight: placement?.maxHeight ?? 240,
                zIndex: 9999,
              }}
              className="overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-left text-xs leading-relaxed text-[var(--color-text-muted)] shadow-[var(--shadow-card)]"
            >
              <p className="mb-1.5 font-medium text-[var(--color-text)]">{title}</p>
              {children}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
