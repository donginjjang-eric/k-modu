"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";

type DraggableTabsProps = {
  categories: string[];
  activeCategory: string;
  ariaLabel: string;
  className?: string;
  onChange: (category: string) => void;
};

export default function DraggableTabs({
  categories,
  activeCategory,
  ariaLabel,
  className = "",
  onChange,
}: DraggableTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller || !dragRef.current.active) return;
    dragRef.current.active = false;
    scroller.classList.remove("is-dragging");
    if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      ref={scrollerRef}
      className={`product-tabs ${className}`.trim()}
      aria-label={ariaLabel}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const scroller = scrollerRef.current;
        if (!scroller) return;
        dragRef.current = {
          active: true,
          startX: event.clientX,
          scrollLeft: scroller.scrollLeft,
          moved: false,
        };
        scroller.classList.add("is-dragging");
        scroller.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const scroller = scrollerRef.current;
        const drag = dragRef.current;
        if (!scroller || !drag.active) return;
        const delta = event.clientX - drag.startX;
        if (Math.abs(delta) > 4) drag.moved = true;
        scroller.scrollLeft = drag.scrollLeft - delta;
      }}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onClickCapture={(event) => {
        if (!dragRef.current.moved) return;
        event.preventDefault();
        event.stopPropagation();
        dragRef.current.moved = false;
      }}
    >
      {categories.map((category) => (
        <button
          className={activeCategory === category ? "is-active" : ""}
          key={category}
          type="button"
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
