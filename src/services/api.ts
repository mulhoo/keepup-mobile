import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import {API_BASE_URL, API_TIMEOUT} from '@env';

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
}

export function getAuthToken(): string | null {
  return _token;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: parseInt(API_TIMEOUT, 10) || 15000,
      headers: {'Content-Type': 'application/json'},
    });

    this.client.interceptors.request.use(config => {
      if (_token) {
        config.headers.Authorization = `Bearer ${_token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          console.error('API Error:', error.response.status, error.response.data);
        } else {
          console.error('Network Error:', error.message);
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}

export const api = new ApiService();
