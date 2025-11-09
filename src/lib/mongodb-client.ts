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
      return data;
    },

    signIn: async (email: string, password: string) => {
      const data = await this.request('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.setToken(data.token);
      return data;
    },

    getSession: async () => {
      try {
        return await this.request('/auth/session');
      } catch {
        return { user: null };
      }
    },

    signOut: async () => {
      await this.request('/auth/signout', { method: 'POST' });
      this.clearToken();
    },
  };

  // Database methods
  from(table: string) {
    return {
      select: async (columns = '*') => {
        const data = await this.request(`/${table}`);
        return { data, error: null };
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

      update: async (values: any) => {
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
