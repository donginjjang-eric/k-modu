"use client";

// 대시보드 새로고침/진입 시 항상 위에서 시작 (브라우저 기본 스크롤 복원이 긴 갤러리에서 맨 아래로 떨어지는 문제 방지)
// 단, URL 해시(#product-upload 등 앵커 링크)가 있으면 해당 위치를 존중한다.
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollResetOnLoad() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
