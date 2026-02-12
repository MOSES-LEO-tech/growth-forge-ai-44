import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class ApiService {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Something went wrong");
      }

      return data;
    } catch (error: any) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Auth Methods
  async login(email: string, password: string): Promise<any> {
    const data = await this.request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data;
  }

  async register(email: string, password: string, fullName: string, role: string): Promise<any> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName, role }),
    });
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
        if (refreshToken) {
            await this.request("/auth/logout", {
                method: "POST",
                body: JSON.stringify({ refreshToken }),
            });
        }
    } catch (e) {
        // Ignore logout errors
    } finally {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      // Check if we have a token first
      if (!localStorage.getItem("token")) return null;
      
      const data = await this.request<any>("/auth/me");
      return data.user || data;
    } catch (error) {
      // If unauthorized, clear storage
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem("token");
  }

  // Data Methods
  async getAchievements(userId: string): Promise<any[]> {
    // Note: Backend currently only returns logged-in user's achievements
    const data = await this.request<any>("/achievements");
    return data.achievements || [];
  }

  async getProjects(userId: string): Promise<any[]> {
    // Note: Backend currently only returns logged-in user's projects
    const data = await this.request<any[]>("/projects");
    return data || [];
  }

  async getRecommendations(userId: string): Promise<any> {
    const data = await this.request<any>(`/recommendations/generate?studentId=${userId}`);
    return data;
  }
}

export const api = new ApiService();
