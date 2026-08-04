import { SharedBoardScreen } from "@/components/share/SharedBoardScreen";

export default async function SharedBoardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedBoardScreen token={token} />;
}
