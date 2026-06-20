/* ═══════════════════════════════════════════════════════════════════
   Supabase Database Types
   All intheGno tables use the `itg_` prefix (shared DnDL project).
   Schema source of truth: sql/itg_commerce.sql + sql/create_itg_posts.sql
   ═══════════════════════════════════════════════════════════════════ */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ── ROW SHAPES ──────────────────────────────────────────────────── */

export type ItgCollectionRow = {
  id: string;
  slug: string;
  title: string;
  nav_label: string;
  tagline: string;
  description: string;
  kind: "physical" | "digital" | "mixed";
  badge: string;
  sort_order: number;
  show_in_nav: boolean;
  published: boolean;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
};

export type ItgProductRow = {
  id: string;
  handle: string;
  collection_id: string | null;
  title: string;
  subtitle: string;
  description_html: string;
  product_type: "physical" | "digital" | "service" | "bundle" | "other";
  status: "draft" | "active" | "archived";
  badge: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  images: Json;
  options: Json;
  features: Json;
  shopify_product_handle: string;
  shopify_variant_gid: string;
  shopify_variant_map: Json;
  requires_shipping: boolean;
  featured: boolean;
  sort_order: number;
  seo_title: string;
  seo_description: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type ItgProductAssetRow = {
  id: string;
  product_id: string;
  kind: "audio" | "text" | "pdf" | "video" | "archive" | "image" | "other";
  label: string;
  r2_key: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  duration_seconds: number | null;
  is_preview: boolean;
  sort_order: number;
  created_at: string;
};

export type ItgOrderRow = {
  id: string;
  email: string;
  stripe_session_id: string;
  stripe_payment_intent: string;
  amount_total: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "failed";
  download_token: string;
  download_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ItgOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  unit_amount: number;
  quantity: number;
};

export type ItgAdminRow = {
  user_id: string;
  email: string;
  created_at: string;
};

export type ItgSubscriberRow = {
  id: string;
  email: string;
  status: "subscribed" | "unsubscribed";
  source: string;
  resend_contact_id: string;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
};

export type ItgPostRow = {
  id: number;
  title: string;
  slug: string;
  date: string;
  author: string;
  tag: string;
  content: Json;
  image: string;
  image_caption: string;
  music_embed: string;
  blogcast_url: string;
  published: boolean;
  created_at: string;
};
