import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect if it's a 401 and we're not on the login/register page already
    const isAuthPage = window.location.pathname.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthPage) {
      // Clear store to avoid infinite redirect loops if store thinks user is logged in
      localStorage.removeItem('quiz-app-storage');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default api;
