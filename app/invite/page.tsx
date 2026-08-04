import { InvitationScreen } from "@/components/auth/InvitationScreen";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <InvitationScreen token={token} />;
}
