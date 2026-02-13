"use client";

import { useAuth, useFirestore } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { User } from "firebase/auth";

export function AuthGuard({ children }: { children: React.ReactNode; }) {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!auth || !firestore) {
      return; // Wait for Firebase to be initialized
    }

    const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
      if (!user) {
        // User is not authenticated.
        setLoading(false);
        setIsAuthorized(false);
        if (pathname !== "/login") {
          router.replace("/login");
        }
        return;
      }

      // User is authenticated, check their Firestore profile.
      const userDocRef = doc(firestore, "users", user.uid);
      try {
        const profileSnap = await getDoc(userDocRef);

        if (!profileSnap.exists()) {
          // This can happen if profile creation fails or is delayed.
          // The login page is responsible for creating it.
          toast({
            variant: "destructive",
            title: "Account Not Configured",
            description: "Your user profile was not found. Please sign out and sign in again.",
          });
          await auth.signOut(); // Signing out will trigger onAuthStateChanged again
          return;
        }

        const profile = profileSnap.data();
        if (profile.requiresPasswordChange) {
          // Password change is required.
          if (pathname !== "/change-password") {
            router.replace("/change-password");
          }
          setIsAuthorized(true); // Authorized for the change password page
        } else {
          // User is fully authenticated and password is fine.
          if (pathname === "/login" || pathname === "/change-password") {
            router.replace("/");
          }
          setIsAuthorized(true); // Fully authorized for the app
        }
      } catch (error) {
        console.error("AuthGuard: Firestore permission error.", error);
        toast({
          variant: "destructive",
          title: "Permission Error",
          description: "You do not have permission to access your user profile.",
        });
        await auth.signOut(); // Signing out will trigger onAuthStateChanged again
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, firestore]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Render children only if authorized to prevent rendering protected content
  // before redirection is complete.
  if (isAuthorized) {
    return <>{children}</>;
  }

  // While redirecting or for non-authorized states, show a loading/redirecting message.
  return <div className="flex h-screen items-center justify-center">Redirecting...</div>;
}
