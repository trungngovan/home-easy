import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to login page - auth is required
  redirect("/login");
}
