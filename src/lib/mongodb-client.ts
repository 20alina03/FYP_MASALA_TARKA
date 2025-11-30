// MongoDB client for frontend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class MongoDBClient {
  private token: string | null = null;

  constructor() {
    // Try to get token from localStorage
    this.token = localStorage.getItem('mongodb_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('mongodb_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('mongodb_token');
    localStorage.removeItem('mongodb_user');
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw error;
    }

    return response.json();
  }

  // Auth methods
  auth = {
    signUp: async (email: string, password: string, full_name: string) => {
      const data = await this.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name }),
      });
      this.setToken(data.token);
      
      // Store user info
      localStorage.setItem('mongodb_user', JSON.stringify(data.user));
      
      return { user: data.user, error: null };
    },

    signIn: async (email: string, password: string) => {
      const data = await this.request('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.setToken(data.token);
      
      // Store user info
      localStorage.setItem('mongodb_user', JSON.stringify(data.user));
      
      return { user: data.user, error: null };
    },

    signInWithGoogle: async (credential: string) => {
      const data = await this.request('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });
      this.setToken(data.token);
      
      // Store user info
      localStorage.setItem('mongodb_user', JSON.stringify(data.user));
      
      return { user: data.user, error: null };
    },

    getSession: async () => {
      try {
        // Check if we have a token
        if (!this.token) {
          return { user: null };
        }

        // Try to get user from localStorage first (faster)
        const userStr = localStorage.getItem('mongodb_user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            return { user };
          } catch {
            // If parsing fails, continue to API call
          }
        }

        // Fallback to API call to validate session
        const data = await this.request('/auth/session');
        return { user: data.user };
      } catch {
        this.clearToken();
        return { user: null };
      }
    },

    signOut: async () => {
      try {
        await this.request('/auth/signout', { method: 'POST' });
      } catch (error) {
        console.error('Signout error:', error);
      } finally {
        this.clearToken();
      }
    },
  };

  // Database methods
  from(table: string) {
    return {
      select: async (columns = '*') => {
        try {
          const data = await this.request(`/${table}`);
          return { data, error: null };
        } catch (error: any) {
          return { data: null, error };
        }
      },

      insert: async (values: any) => {
        try {
          const data = await this.request(`/${table}`, {
            method: 'POST',
            body: JSON.stringify(values),
          });
          return { data, error: null };
        } catch (error: any) {
          return { data: null, error };
        }
      },

      update: (values: any) => {
        return {
          eq: async (column: string, value: any) => {
            try {
              const data = await this.request(`/${table}/${value}`, {
                method: 'PUT',
                body: JSON.stringify(values),
              });
              return { data, error: null };
            } catch (error: any) {
              return { data: null, error };
            }
          },
        };
      },

      delete: () => {
        return {
          eq: async (column: string, value: any) => {
            try {
              await this.request(`/${table}/${value}`, {
                method: 'DELETE',
              });
              return { error: null };
            } catch (error: any) {
              return { error };
            }
          },
        };
      },
    };
  }
}

export const mongoClient = new MongoDBClient();