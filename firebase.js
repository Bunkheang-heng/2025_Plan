
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC6qiw0TN4-pxtiyV3zDQ1laW-JPnOUPis",
  authDomain: "kheang158.firebaseapp.com",
  projectId: "kheang158",
  storageBucket: "kheang158.firebasestorage.app",
  messagingSenderId: "913855110057",
  appId: "1:913855110057:web:f05476597c36dc356a42b8",
  measurementId: "G-GGDSEKVZK5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };