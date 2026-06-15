import { redirect } from "next/navigation";

// 레거시 별칭 — 데모(maison-lune-seoul) 폐기 후 자료가 이전된 KLARA STUDIO로 보낸다.
export default function MaisonLuneRedirectPage() {
  redirect("/designers/fe54a0f0-60f9-4635-98aa-883f0c3a638a");
}
