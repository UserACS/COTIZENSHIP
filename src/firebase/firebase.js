import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKm-Qvi1h--L_bbZmRDEb5OC1l6-QgNJA",
  authDomain: "cotizenship-backend.firebaseapp.com",
  projectId: "cotizenship-backend",
  appId: "398268:web:eb815864219b6d53e9b3b9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
