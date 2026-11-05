import { redirect } from "next/navigation";

export default async function AsaasPage({ searchParams }: { searchParams: Promise<{ empresa?: string | string[] }> }) {
  const { empresa } = await searchParams;
  const id = typeof empresa === "string" ? empresa : "";
  redirect("/plataforma?aba=asaas" + (id ? "&empresa=" + encodeURIComponent(id) : ""));
}
