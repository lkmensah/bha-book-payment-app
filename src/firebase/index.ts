import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { useMemo } from 'react';

import { FirebaseProvider, useFirebaseApp, useFirestore, useAuth, useFirebase } from './provider';
import { useUser } from './auth/use-user';
import { useUserProfile } from './auth/use-user-profile';
import { useDoc } from './firestore/use-doc';
import { useCollection } from './firestore/use-collection';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
    }
  }
  
  return { firebaseApp, auth, firestore };
}

function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(factory, deps);
}

export {
  initializeFirebase,
  FirebaseProvider,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useFirebase,
  useUser,
  useDoc,
  useCollection,
  useMemoFirebase,
  useUserProfile,
};
