import { User } from "@shared/schema";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

let authState: AuthState = {
  user: null,
  isAuthenticated: false
};

const authListeners: Array<(state: AuthState) => void> = [];

export function getAuthState(): AuthState {
  return authState;
}

export function setAuthState(user: User | null) {
  authState = {
    user,
    isAuthenticated: !!user
  };
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
