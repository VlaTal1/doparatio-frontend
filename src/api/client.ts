import axios from 'axios';
import { API_URL } from '../constants/config';
import { supabase } from '../lib/supabase';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach the Supabase JWT on every request
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 401 — try to refresh the token once
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.access_token) {
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
