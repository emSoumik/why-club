export const primaryNavigation = [
  { href: "/", label: "Shop" },
  { href: "/collections/drop-01", label: "Drop 01" },
  { href: "/story", label: "Story" },
  { href: "/returns", label: "Returns" },
  { href: "/contact", label: "Contact" },
] as const;

export const adminNavigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/team", label: "Team" },
] as const;

export const contactTopics = [
  "order issue",
  "returns & exchange",
  "sizing help",
  "collaboration",
  "wholesale inquiry",
  "just saying hi",
] as const;
