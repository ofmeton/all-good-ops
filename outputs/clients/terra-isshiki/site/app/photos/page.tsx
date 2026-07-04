/* 旧 /photos → /studio に統合。ブックマーク互換のため redirect を残す。本番では 404。 */

import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

export default function PhotosPage() {
  if (process.env.NODE_ENV === "production") notFound();
  redirect("/studio");
}
