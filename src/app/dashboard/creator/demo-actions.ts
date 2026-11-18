"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAdminCreatorAccount } from "@/lib/db";
import { resetCreatorBeautyDemo, seedCreatorBeautyDemo } from "@/lib/creator-demo";

async function getAdminCreatorForDemoAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }

  const creator = await getOrCreateAdminCreatorAccount(user.id, user.email);
  if (!creator || creator.creator_key !== `admin-operator-${user.id}`) {
    throw new Error("체험 데이터는 관리자 미리보기 프로필에서만 사용할 수 있습니다.");
  }

  return { user, creator };
}

function revalidateCreatorCenter() {
  revalidatePath("/dashboard/creator");
  revalidatePath("/dashboard/creator/campaigns");
  revalidatePath("/dashboard/creator/my-campaigns");
  revalidatePath("/dashboard/creator/my-campaigns/[id]", "page");
  revalidatePath("/dashboard/creator/submissions");
  revalidatePath("/dashboard/creator/settlement");
  revalidatePath("/dashboard/creator/profile");
  revalidatePath("/dashboard/creator/performance");
  revalidatePath("/dashboard/creator/grade");
}

export async function seedDemoAction(): Promise<void> {
  const { user, creator } = await getAdminCreatorForDemoAction();
  await seedCreatorBeautyDemo(user.id, creator.id);
  revalidateCreatorCenter();
}

export async function resetDemoAction(): Promise<void> {
  const { user, creator } = await getAdminCreatorForDemoAction();
  await resetCreatorBeautyDemo(user.id, creator.id);
  revalidateCreatorCenter();
}
