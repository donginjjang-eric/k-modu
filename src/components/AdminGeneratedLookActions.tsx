"use client";

// 관리자 AI 룩 검수: 공개/반려/숨김/삭제 + 승인 룩의 Veo 숏폼 영상 생성·미리보기
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedLookStatus, GeneratedLookVideoStatus } from "@/lib/types";
import { getGeneratedLookStatusLabel } from "@/lib/status-labels";

// 8초 간격 폴링 상한 (약 5분) — 넘으면 지연 안내 후 중단
const MAX_VIDEO_POLLS = 40;

const VIDEO_LABEL: Record<GeneratedLookVideoStatus, string> = {
  none: "",
  queued: "영상 대기 중…",
  processing: "영상 생성 중… (1~3분)",
  completed: "영상 완료",
  failed: "영상 생성 실패",
};

export default function AdminGeneratedLookActions({
  lookId,
  status,
  videoStatus: initialVideoStatus = "none",
  videoUrl: initialVideoUrl = null,
}: {
  lookId: string;
  status: GeneratedLookStatus;
  videoStatus?: GeneratedLookVideoStatus;
  videoUrl?: string | null;
}) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<GeneratedLookStatus>(status);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [videoStatus, setVideoStatus] = useState<GeneratedLookVideoStatus>(initialVideoStatus);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  // 상태가 그대로여도 다음 폴링이 예약되도록 하는 틱 카운터
  const [pollTick, setPollTick] = useState(0);

  // 생성이 진행 중이면 완료/실패까지 8초 간격으로 반복 폴링
  useEffect(() => {
    if (videoStatus !== "queued" && videoStatus !== "processing") return;
    if (pollTick >= MAX_VIDEO_POLLS) {
      setMessage("영상 상태 확인이 지연되고 있어요. 잠시 후 페이지를 새로고침해주세요.");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/generated-looks/${lookId}/generate-video`);
        const data = await res.json().catch(() => ({}));
        if (data.ok) {
          setVideoStatus(data.videoStatus);
          if (data.videoUrl) setVideoUrl(data.videoUrl);
        }
      } catch {
        // 일시적 네트워크 오류는 다음 폴링에서 재시도
      }
      setPollTick((tick) => tick + 1);
    }, 8000);
    return () => clearTimeout(timer);
  }, [videoStatus, pollTick, lookId]);

  const remove = async () => {
    if (!window.confirm("이 AI 룩을 영구 삭제할까요? 되돌릴 수 없습니다.")) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/generated-looks/${lookId}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "삭제에 실패했습니다.");
        return;
      }
      // 서버 목록 기준으로 즉시 카드 제거
      router.refresh();
    } catch {
      setMessage("네트워크 오류로 삭제하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const mutate = async (nextStatus: GeneratedLookStatus) => {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/generated-looks/${lookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.generatedLook) {
        setMessage(result.error || "변경에 실패했습니다. 다시 시도해주세요.");
        return;
      }
      setCurrentStatus(result.generatedLook.status);
      setMessage(`상태를 '${getGeneratedLookStatusLabel(result.generatedLook.status)}'으로 변경했습니다.`);
    } catch {
      setMessage("네트워크 오류로 변경하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const generateVideo = async () => {
    setMessage("");
    setVideoStatus("queued");
    const response = await fetch(`/api/admin/generated-looks/${lookId}/generate-video`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setVideoStatus("none");
      setMessage(result.error || "영상 생성을 시작하지 못했습니다.");
      return;
    }
    setVideoStatus(result.videoStatus || "queued");
    if (result.videoUrl) setVideoUrl(result.videoUrl);
  };

  const badgeClass =
    currentStatus === "approved" ? "approved" :
    currentStatus === "hidden" || currentStatus === "rejected" ? "disabled" :
    "pending";

  const isVideoBusy = videoStatus === "queued" || videoStatus === "processing";

  return (
    <div className="admin-actions">
      <span className={`status-badge ${badgeClass}`}>{getGeneratedLookStatusLabel(currentStatus)}</span>
      <button type="button" disabled={isSaving || currentStatus === "approved"} onClick={() => mutate("approved")}>
        공개 승인
      </button>
      <button type="button" disabled={isSaving || currentStatus === "rejected"} onClick={() => mutate("rejected")}>
        반려
      </button>
      <button type="button" disabled={isSaving || currentStatus === "hidden"} onClick={() => mutate("hidden")}>
        숨김
      </button>
      <button type="button" className="danger" disabled={isSaving} onClick={remove}>
        삭제
      </button>
      {message ? <small>{message}</small> : null}

      {currentStatus === "approved" ? (
        <div className="look-video">
          <button type="button" className="primary" disabled={isVideoBusy} onClick={generateVideo}>
            {videoStatus === "completed" ? "숏폼 영상 다시 생성" : isVideoBusy ? "생성 중…" : "숏폼 영상 생성 (Veo)"}
          </button>
          {videoStatus !== "none" ? <small>{VIDEO_LABEL[videoStatus]}</small> : null}
          {videoStatus === "completed" && videoUrl ? (
            <video className="look-video-preview" src={videoUrl} controls muted playsInline preload="metadata" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
