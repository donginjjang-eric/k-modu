import { requireFashionPartner } from "@/lib/auth";
import { getProductsForDesigner } from "@/lib/db";
import ProductManager from "@/components/ProductManager";

export default async function DesignerProductsPage() {
  const { designer, workspace } = await requireFashionPartner();
  const products = await getProductsForDesigner(designer.id, "fashion_partner");

  return <ProductManager initialProducts={products} membershipId={workspace?.id || ""} brandName={designer.brand_name} />;
}
