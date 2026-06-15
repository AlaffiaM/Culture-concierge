import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, browserLocalPersistence, setPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "alaffia-concierge.firebaseapp.com",
  projectId: "alaffia-concierge",
  storageBucket: "alaffia-concierge.firebasestorage.app",
  messagingSenderId: "361826048239",
  appId: "1:361826048239:web:e9dd775369ac5f48e5a31a",
  measurementId: "G-WE6DP292G1"
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence)
const provider = new GoogleAuthProvider()

export { auth, provider, signInWithPopup, signOut }
