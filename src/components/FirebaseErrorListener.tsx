'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Always show a user-friendly toast for any permission error.
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You do not have the required permissions to perform this action.",
      });

      // In development, we also want to see the rich error overlay from Next.js.
      if (process.env.NODE_ENV === 'development') {
         setTimeout(() => {
            const devError = new Error(error.message);
            devError.name = 'FirestorePermissionError';
            // Next.js uses the 'digest' property for error identification.
            (devError as any).digest = `🔥 Firestore Security Rules: ${error.context.operation} on ${error.context.path}`;
            throw devError;
        }, 0);
      } else {
        // In production, log to an error tracking service.
        console.error("Firestore Permission Error:", error);
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
