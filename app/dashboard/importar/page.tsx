import { redirect } from "next/navigation";

export default function ImportarPage() {
  // Page hidden — redirect to dashboard
  redirect("/dashboard");
}
