import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyA-UtBDh8WJTpcjNsn5iw5gSe_3km_si1c",
    authDomain: "smartrf-f9962.firebaseapp.com",
    projectId: "smartrf-f9962",
    storageBucket: "smartrf-f9962.firebasestorage.app",
    messagingSenderId: "1051120826846",
    appId: "1:1051120826846:web:b7245cb911b4b7435f854f",
    measurementId: "G-1LRDWFQNML"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
    try {
        const querySnapshot = await getDocs(collection(db, "tenants"));
        console.log("FIRESTORE TENANTS:");
        querySnapshot.forEach((doc) => {
            console.log(doc.id, " => ", doc.data());
        });
    } catch(e) { console.error(e); }
}
test();
