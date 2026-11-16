import { requireBeautyPartner } from "@/lib/auth";
import { getProductsForDesigner } from "@/lib/db";
import ProductManager from "@/components/ProductManager";

export default async function BeautyProductsPage() {
  const { designer, workspace } = await requireBeautyPartner();
  const products = await getProductsForDesigner(designer.id, "beauty_partner");

  return <ProductManager initialProducts={products} mode="beauty" membershipId={workspace?.id || ""} brandName={designer.brand_name} />;
}
