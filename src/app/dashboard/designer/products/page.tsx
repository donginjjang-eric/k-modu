import { requireApprovedDesigner } from "@/lib/auth";
import { getProductsForDesigner } from "@/lib/db";
import ProductManager from "@/components/ProductManager";

export default async function DesignerProductsPage() {
  const { designer } = await requireApprovedDesigner();
  const products = await getProductsForDesigner(designer.id);

  return <ProductManager initialProducts={products} />;
}
