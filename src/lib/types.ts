export type Role = "super_admin" | "admin" | "editor" | "customer";

export type ProductBadge = "new" | "sale";

export interface DemoCollection {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

export interface DemoProduct {
  slug: string;
  collectionSlug: string;
  title: string;
  description: string;
  mrp: number;
  sellingPrice: number;
  inventoryCount: number;
  images: string[];
  hsnCode: string;
  isPublished: boolean;
  badge: ProductBadge;
  tags: string[];
  sizes: string[];
  soldOutSizes: string[];
  fit: string;
  material: string;
  weightGsm: number;
  story: string;
}

export interface DemoReview {
  productSlug: string;
  author: string;
  rating: number;
  comment: string;
  location: string;
}

export interface DemoFaq {
  question: string;
  answer: string;
}

export interface DemoPolicyItem {
  title: string;
  body: string;
}
