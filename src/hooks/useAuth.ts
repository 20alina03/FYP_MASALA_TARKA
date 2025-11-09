import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { toast } from '@/hooks/use-toast';

interface MongoUser {
  id: string;
  email: string;
  full_name?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<MongoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { user } = await mongoClient.auth.getSession();
        setUser(user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { user } = await mongoClient.auth.signUp(email, password, fullName);
      setUser(user);
      toast({
        title: "Account created",
        description: "You have successfully signed up!",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.error || "Failed to create account",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await mongoClient.auth.signIn(email, password);
      setUser(user);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.error || "Invalid credentials",
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
      toast({
        title: "Sign out failed",
        description: error.error || "Failed to sign out",
        variant: "destructive",
      });
      return { error };
    }
  };

  return {
    user,
    session: null,
    loading,
    signUp,
    signIn,
    signOut,
  };
};