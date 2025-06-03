import { User } from "@shared/schema";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Initialize auth state from localStorage if available
function initializeAuthState(): AuthState {
  if (typeof window !== 'undefined') {
    try {
      const storedUser = localStorage.getItem('attendance_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return {
          user,
          isAuthenticated: true
        };
      }
    } catch (error) {
      console.error('Failed to parse stored user data:', error);
      localStorage.removeItem('attendance_user');
    }
  }
  
  return {
    user: null,
    isAuthenticated: false
  };
}

let authState: AuthState = initializeAuthState();

const authListeners: Array<(state: AuthState) => void> = [];

export function getAuthState(): AuthState {
  return authState;
}

export function setAuthState(user: User | null) {
  authState = {
    user,
    isAuthenticated: !!user
  };
  
  // Persist to localStorage
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem('attendance_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('attendance_user');
    }
  }
  
  authListeners.forEach(listener => listener(authState));
}

export function onAuthStateChange(listener: (state: AuthState) => void) {
  authListeners.push(listener);
  return () => {
    const index = authListeners.indexOf(listener);
    if (index > -1) {
      authListeners.splice(index, 1);
    }
  };
}

export function logout() {
  setAuthState(null);
}
