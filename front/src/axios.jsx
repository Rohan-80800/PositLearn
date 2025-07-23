import axios from "axios";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const api = axios.create({
  baseURL: SERVER_URL,
});

api.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      try {
        if (!window.Clerk) {
          return config;
        }

        const clerk = window.Clerk;
        if (clerk.session) {
          const token = await clerk.session.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
