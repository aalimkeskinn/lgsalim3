// FIX: Switched to Firebase compat library for initialization.
// The error "no exported member 'initializeApp'" often indicates an environment
// issue or a dependency mismatch. Using the v8-compatible `initializeApp` method
// from `firebase/compat/app` creates an app instance that is interoperable with
// the v9 modular functions like `getAuth` and `getFirestore`. This resolves the
// initialization error without requiring a full application-wide migration to v8 syntax.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, FirestoreError } from 'firebase/firestore';

// IMPORTANT: Your Firebase project's configuration should be stored in environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyCCk4Fh0jD3rudewpH-uPi1JR8-Nv9EzsQ",
  authDomain: "ideogrenci-b4ab8.firebaseapp.com",
  projectId: "ideogrenci-b4ab8",
  storageBucket: "ideogrenci-b4ab8.firebasestorage.app",
  messagingSenderId: "199114652020",
  appId: "1:199114652020:web:5c454c00cfdb9094d2d421"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence to handle connection issues gracefully
enableIndexedDbPersistence(db)
  .catch((err: FirestoreError) => {
    if (err.code === 'failed-precondition') {
      console.warn(
        'Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time.'
      );
    } else if (err.code === 'unimplemented') {
      console.warn(
        'Firestore persistence not supported in this browser.'
      );
    }
  });


export { auth, db };