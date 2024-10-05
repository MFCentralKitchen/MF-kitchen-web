// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // Import Firebase Storage

const firebaseConfig = {
  apiKey: "AIzaSyBguLNbw8FrAkfSJOmKWdyQgzOj1tfbwwM",
  authDomain: "mf-central-kitchen.firebaseapp.com",
  projectId: "mf-central-kitchen",
  storageBucket: "mf-central-kitchen.appspot.com",
  messagingSenderId: "624332125006",
  appId: "1:624332125006:web:0e385dd236727484b0a41f",
  measurementId: "G-DLB2CKWCP6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (for database)
const db = getFirestore(app);

// Initialize Firebase Auth (for authentication)
const auth = getAuth(app);

// Initialize Firebase Storage (for file storage)
const storage = getStorage(app); // Initialize storage

export { db, auth, storage }; // Export storage along with db and auth
