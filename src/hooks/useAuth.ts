import { useState, useEffect, createContext, useContext } from 'react';
import React from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { toast } from '@/hooks/use-toast';

interface MongoUser {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: MongoUser | null;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (credential: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<MongoUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { user } = await mongoClient.auth.getSession();
      console.log('Refreshed user:', user);
      setUser(user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { user } = await mongoClient.auth.getSession();
        console.log('Initial session check:', user);
        setUser(user);
      } catch (error) {
        console.error('Session check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { user, error } = await mongoClient.auth.signUp(email, password, fullName);
      
      if (error) {
        throw error;
      }
      
      console.log('Sign up successful:', user);
      setUser(user);
      
      toast({
        title: "Account created",
        description: "You have successfully signed up!",
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      toast({
        title: "Sign up failed",
        description: error.error || error.message || "Failed to create account",
        variant: "destructive",
      });
      
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user, error } = await mongoClient.auth.signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      console.log('Sign in successful:', user);
      setUser(user);
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in",
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      toast({
        title: "Sign in failed",
        description: error.error || error.message || "Invalid credentials",
        variant: "destructive",
      });
      
      return { error };
    }
  };

  const signInWithGoogle = async (credential: string) => {
    try {
      const { user, error } = await mongoClient.auth.signInWithGoogle(credential);
      
      if (error) {
        throw error;
      }
      
      console.log('Google sign in successful:', user);
      setUser(user);
      
      toast({
        title: "Welcome!",
        description: "You have successfully signed in with Google",
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      toast({
        title: "Google sign in failed",
        description: error.error || error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await mongoClient.auth.signOut();
      setUser(null);
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error);
      
      toast({
        title: "Sign out failed",
        description: error.error || error.message || "Failed to sign out",
        variant: "destructive",
      });
      
      return { error };
    }
  };

  const value: AuthContextType = {
    user,
    session: null,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};