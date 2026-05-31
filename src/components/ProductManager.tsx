"use client";

import { useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  price: string | null;
  color: string | null;
  description: string | null;
  image_url: string;
  mood: string | null;
  status: string;
};

export default function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Outer",
    price: "",
    color: "",
    description: "",
    mood: "",
    imageUrl: "",
    imageHash: "",
  });

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadImage = async (file: File) => {
    const body = new FormData();
    body.append("image", file);
    const response = await fetch("/api/uploads/product-image", {
      method: "POST",
      body,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Image upload failed.");
    setField("imageUrl", result.imageUrl);
    setField("imageHash", result.imageHash);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Product creation failed.");
      setProducts((current) => [result.product, ...current]);
      setForm({
        name: "",
        category: "Outer",
        price: "",
        color: "",
        description: "",
        mood: "",
        imageUrl: "",
        imageHash: "",
      });
      setMessage("Product saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hideProduct = async (productId: string) => {
    const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Unable to hide product.");
      return;
    }
    setProducts((current) => current.filter((product) => product.id !== productId));
    setMessage("Product hidden.");
  };

  return (
    <section className="detail-layout">
      <form className="generate-box" onSubmit={submit}>
        <p className="kicker">New Product</p>
        <label>
          <p className="kicker">Image</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadImage(file).catch((error) => setMessage(error.message));
            }}
          />
        </label>
        {form.imageUrl ? (
          <div className="designer-card" style={{ marginTop: 12 }}>
            <img src={form.imageUrl} alt="Uploaded product preview" />
          </div>
        ) : null}
        <label>
          <p className="kicker">Name</p>
          <input style={{ width: "100%", minHeight: 44, padding: 10 }} value={form.name} onChange={(event) => setField("name", event.target.value)} />
        </label>
        <label>
          <p className="kicker">Category</p>
          <input style={{ width: "100%", minHeight: 44, padding: 10 }} value={form.category} onChange={(event) => setField("category", event.target.value)} />
        </label>
        <label>
          <p className="kicker">Price</p>
          <input style={{ width: "100%", minHeight: 44, padding: 10 }} value={form.price} onChange={(event) => setField("price", event.target.value)} />
        </label>
        <label>
          <p className="kicker">Color</p>
          <input style={{ width: "100%", minHeight: 44, padding: 10 }} value={form.color} onChange={(event) => setField("color", event.target.value)} />
        </label>
        <label>
          <p className="kicker">Mood</p>
          <input style={{ width: "100%", minHeight: 44, padding: 10 }} value={form.mood} onChange={(event) => setField("mood", event.target.value)} />
        </label>
        <label>
          <p className="kicker">Description</p>
          <textarea style={{ width: "100%", minHeight: 92, padding: 10 }} value={form.description} onChange={(event) => setField("description", event.target.value)} />
        </label>
        <button className="generate-button" type="submit" disabled={isSubmitting || !form.imageUrl || !form.name || !form.category}>
          {isSubmitting ? "Saving..." : "Save Product"}
        </button>
        {message ? <p className="notice">{message}</p> : null}
      </form>

      <div>
        <p className="kicker">Product List</p>
        <section className="designer-grid">
          {products.map((product) => (
            <article className="designer-card" key={product.id}>
              <img src={product.image_url} alt={product.name} />
              <div className="designer-card-body">
                <p className="kicker">{product.category}</p>
                <h2>{product.name}</h2>
                <p className="notice">{product.description || product.mood || product.status}</p>
                <button className="pill light" type="button" onClick={() => hideProduct(product.id)}>
                  Hide
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
