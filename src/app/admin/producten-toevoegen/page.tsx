import { redirect } from "next/navigation";

export default function AddProductsRedirectPage() {
  redirect("/stockchecker/new");
}
