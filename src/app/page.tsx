
import { AuthGuard } from "@/components/auth-guard";
import { AppContent } from "@/components/app-content";

export default function Home() {
  return (
    <AuthGuard>
      <AppContent />
    </AuthGuard>
  );
}
