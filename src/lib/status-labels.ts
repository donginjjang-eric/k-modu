import type { ApprovalStatus, GeneratedLookStatus, ProductStatus } from "./types";

export function getApprovalStatusLabel(status: ApprovalStatus | string) {
  if (status === "approved") return "승인됨";
  if (status === "disabled") return "비활성";
  if (status === "rejected") return "반려";
  return "승인 대기";
}

export function getProductStatusLabel(status: ProductStatus | string) {
  if (status === "active") return "공개";
  if (status === "hidden") return "숨김";
  return "비공개";
}

export function getGeneratedLookStatusLabel(status: GeneratedLookStatus | string) {
  if (status === "approved") return "공개 승인";
  if (status === "hidden") return "숨김";
  if (status === "rejected") return "반려";
  return "검수 대기";
}

export function getGenerationTypeLabel(cacheHit: boolean) {
  return cacheHit ? "저장된 생성" : "실시간 생성";
}
