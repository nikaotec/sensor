import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Configuração Oficial gerada para SmartRF
const firebaseConfig = {
    apiKey: "AIzaSyA-UtBDh8WJTpcjNsn5iw5gSe_3km_si1c",
    authDomain: "smartrf-f9962.firebaseapp.com",
    projectId: "smartrf-f9962",
    storageBucket: "smartrf-f9962.firebasestorage.app",
    messagingSenderId: "1051120826846",
    appId: "1:1051120826846:web:b7245cb911b4b7435f854f",
    measurementId: "G-1LRDWFQNML"
};

// Initialize Firebase (Auth only)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
