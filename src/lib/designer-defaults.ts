import type { Designer, ModelTemplate } from "./types";

export const DEFAULT_DESIGNER_MODEL_IMAGE = "/assets/designer-profile-real-01.png";
export const DEFAULT_MODEL_TEMPLATE_ID = "fixed-female-minimal";
export const DEFAULT_MODEL_TEMPLATE_LABEL = "기본 모델";

export function getDesignerDefaultModelImage(_designerId?: string | null) {
  return DEFAULT_DESIGNER_MODEL_IMAGE;
}

export function applyDesignerDefaultModelTemplate(
  template: ModelTemplate,
  designer: Pick<Designer, "id" | "brand_name">,
): ModelTemplate {
  if (template.id !== DEFAULT_MODEL_TEMPLATE_ID) return template;

  return {
    ...template,
    name: DEFAULT_MODEL_TEMPLATE_LABEL,
    image_url: getDesignerDefaultModelImage(designer.id),
    prompt_description: `${designer.brand_name} brand representative default model. Use this image as the fixed model reference for every K-MODU styling board look.`,
  };
}
