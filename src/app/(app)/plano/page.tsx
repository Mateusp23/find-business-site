import { PlanoView } from "./PlanoView";

export const metadata = { title: "Plano · Find Business" };

export default async function PlanoPage({ searchParams }: PageProps<"/plano">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  return (
    <PlanoView
      checkout={one(params.checkout)}
      sessionId={one(params.session_id)}
      fromPortal={params.portal === "1"}
    />
  );
}
