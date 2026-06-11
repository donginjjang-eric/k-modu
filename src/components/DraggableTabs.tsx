"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";

type DraggableTabsProps = {
  categories: string[];
  activeCategory: string;
  ariaLabel: string;
  className?: string;
  counts?: Record<string, number>;
  onChange: (category: string) => void;
};

export default function DraggableTabs({
  categories,
  activeCategory,
  ariaLabel,
  className = "",
  counts = {},
  onChange,
}: DraggableTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false, suppressClick: false });

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller || !dragRef.current.active) return;
    dragRef.current.active = false;
    scroller.classList.remove("is-dragging");
    if (dragRef.current.moved) {
      dragRef.current.suppressClick = true;
      window.setTimeout(() => {
        dragRef.current.moved = false;
        dragRef.current.suppressClick = false;
      }, 0);
    }
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
          suppressClick: false,
        };
        scroller.classList.add("is-dragging");
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
        if (!dragRef.current.suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        dragRef.current.moved = false;
        dragRef.current.suppressClick = false;
      }}
    >
      {categories.map((category) => {
        const count = counts[category] || 0;
        return (
          <button
            className={`${activeCategory === category ? "is-active" : ""} ${count ? "has-selection" : ""}`.trim()}
            key={category}
            type="button"
            aria-label={`${category} ${count ? `${count}개 선택됨` : "선택 없음"}`}
            onClick={() => onChange(category)}
          >
            {category}
            {count ? <span className="tab-count">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
