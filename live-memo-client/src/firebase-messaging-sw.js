import firebase from 'firebase'


const firebaseConfig = {
  apiKey: "AIzaSyDF1Fl1YdCAddX6ToplB4LC58dEYKhMqls",
  authDomain: "apppush-3b5aa.firebaseapp.com",
  projectId: "apppush-3b5aa",
  storageBucket: "apppush-3b5aa.appspot.com",
  messagingSenderId: "150342264977",
  appId: "1:150342264977:web:27b62b14eadbc0af167730",
  measurementId: "G-SZ4VFV0T6H"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

export { firebaseConfig, messaging, firebase }