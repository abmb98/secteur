import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDDO_7qvJvngCnJDopqfZEqTCsW39YqCFs",
  authDomain: "secteur-e639e.firebaseapp.com",
  projectId: "secteur-e639e",
  storageBucket: "secteur-e639e.firebasestorage.app",
  messagingSenderId: "834372572362",
  appId: "1:834372572362:web:f866cdd9d1519a2ec65033"
};

// Debug: Log Firebase config
console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey.substring(0, 10) + '...'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Test Firebase connectivity
export const testFirebaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Testing Firebase connection...');

    // Test Firestore connection using a valid collection name
    // Try to read from a standard collection instead of using reserved names
    const testDoc = doc(db, 'app_config', 'connection_test');
    await getDoc(testDoc);

    console.log('Firebase connection: SUCCESS');
    return { success: true };
  } catch (error: any) {
    console.error('Firebase connection test failed:', error);

    let errorMessage = 'Unknown connection error';

    if (error.code) {
      switch (error.code) {
        case 'unavailable':
          errorMessage = 'Firebase service is temporarily unavailable';
          break;
        case 'permission-denied':
          errorMessage = 'Firebase permissions issue - this is normal for connection testing';
          // Permission denied is actually OK for connection testing - it means we can reach Firebase
          console.log('Permission denied is normal for connection test - Firebase is reachable');
          return { success: true };
        case 'failed-precondition':
          errorMessage = 'Firebase configuration error';
          break;
        case 'unauthenticated':
          errorMessage = 'Firebase authentication configuration issue';
          break;
        case 'invalid-argument':
          errorMessage = 'Invalid request - check collection/document names';
          break;
        default:
          errorMessage = `Firebase error: ${error.code}`;
      }
    } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
      errorMessage = 'Network connectivity issue - check internet connection';
    } else if (error.message?.includes('CORS')) {
      errorMessage = 'CORS policy error - check Firebase domain configuration';
    }

    return { success: false, error: errorMessage };
  }
};

export default app;
