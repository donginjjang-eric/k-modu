import { requireApprovedDesigner } from "@/lib/auth";
import { getProductsForDesigner } from "@/lib/db";
import ProductManager from "@/components/ProductManager";

export default async function DesignerProductsPage() {
  const { designer } = await requireApprovedDesigner();
  const products = await getProductsForDesigner(designer.id);

  return (
    <main className="page">
      <p className="kicker">Products</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>상품 목록</h1>
      <ProductManager initialProducts={products} />
    </main>
  );
}
