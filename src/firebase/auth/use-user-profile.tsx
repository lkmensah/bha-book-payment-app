'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { UserProfile } from '@/lib/data';

export function useUserProfile() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemo(() => {
    if (firestore && user) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [firestore, user]);
  
  const { data: userProfile, loading, error } = useDoc<UserProfile>(userProfileRef);

  return { userProfile, loading, error };
}
