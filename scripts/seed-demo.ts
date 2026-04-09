import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import {
  demoCollections,
  demoProducts,
  demoReviews,
} from "../src/lib/demo-data";

const convexUrl =
  process.env.PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

if (!convexUrl) {
  console.error(
    "Missing PUBLIC_CONVEX_URL or CONVEX_URL. Add it to .env before seeding.",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

const result = await client.action(api.seed.demo, {
  seedToken: process.env.SEED_DEMO_TOKEN,
  collections: demoCollections.map((collection) => ({
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    imageUrl: collection.imageUrl,
    isActive: collection.isActive,
  })),
  products: demoProducts.map((product) => ({
    slug: product.slug,
    collectionSlug: product.collectionSlug,
    title: product.title,
    description: product.description,
    mrp: product.mrp,
    sellingPrice: product.sellingPrice,
    inventoryCount: product.inventoryCount,
    images: product.images,
    hsnCode: product.hsnCode,
    isPublished: product.isPublished,
    badge: product.badge,
    tags: product.tags,
    sizes: product.sizes,
    soldOutSizes: product.soldOutSizes,
    fit: product.fit,
    material: product.material,
    weightGsm: product.weightGsm,
    story: product.story,
  })),
  reviews: demoReviews.map((review) => ({
    productSlug: review.productSlug,
    author: review.author,
    rating: review.rating,
    comment: review.comment,
    location: review.location,
  })),
});

console.log("Seed completed:", result);
