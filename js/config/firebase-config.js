/* =====================================================
   PIPGO · FIREBASE CONFIG
   Inicialización de Firebase + referencias globales.
   Proyecto: PIPGO-v1
   ===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDTOGvZHb8n4Kj0orzvkjw7U08IlRTpbdI",
    authDomain: "pipgo-v1.firebaseapp.com",
    projectId: "pipgo-v1",
    storageBucket: "pipgo-v1.firebasestorage.app",
    messagingSenderId: "194728065858",
    appId: "1:194728065858:web:291d83884c6636621666db"
};

firebase.initializeApp(firebaseConfig);

window.db = firebase.firestore();
window.auth = firebase.auth();