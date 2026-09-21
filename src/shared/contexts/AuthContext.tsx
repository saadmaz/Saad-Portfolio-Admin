import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut 
} from "firebase/auth";
// Import from the new central firebase lib (was @/services/firebase)
import { auth } from "@/lib/firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      console.error("AuthContext: Firebase Auth is not initialized correctly.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Timeout to prevent white screen if Firebase hangs
    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    currentUser,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground font-medium animate-pulse">Initializing...</span>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
