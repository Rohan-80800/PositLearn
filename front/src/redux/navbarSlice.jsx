import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_SERVER_URL;

export const notificationTypeColors = {
  assign: '#28a745',
  update: '#007bff',
  delete: '#ff4d4f',
  default: '#624bff',
};

export const fetchNotifications = createAsyncThunk(
  'navbar/fetchNotifications',
  async (token, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      return response.data.notifications;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'navbar/markNotificationAsRead',
  async ({ notificationId, token }, { rejectWithValue }) => {
    try {
      await axios.post(
        `${API_URL}api/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const getPreferredTheme = () => {
  if (typeof window === "undefined") return false;
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark") return true;
  if (storedTheme === "light") return false;
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
};

const initialState = {
  isDarkTheme: getPreferredTheme(),
  windowWidth: typeof window !== "undefined" ? window.innerWidth : 0,
  isMobile: typeof window !== "undefined" ? window.innerWidth <= 500 : false,
  searchText: "",
  searchResults: [],
  notifications: [],
  isSearching: false,
};

const navbarSlice = createSlice({
  name: "navbar",
  initialState,
  reducers: {
    toggleTheme: (state, action) => {
      const newTheme = action.payload;
      state.isDarkTheme = newTheme === "dark";
      localStorage.setItem("theme", newTheme);
    },
    setWindowWidth: (state, action) => {
      state.windowWidth = action.payload;
      state.isMobile = action.payload <= 500;
    },
    setSearchText: (state, action) => {
      state.searchText = action.payload;
    },
    clearSearchText: (state) => {
      state.searchText = "";
      state.searchResults = [];
    },
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    setIsSearching: (state, action) => {
      state.isSearching = action.payload;
    },
    addNotification(state, action) {
      const newNotification = { ...action.payload, read: action.payload.read || false };
      if (!state.notifications.some((n) => n.id === newNotification.id)) {
        state.notifications.push(newNotification);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.map(notif => ({
          ...notif,
          read: notif.read || false,
        }));
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const notification = state.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
        }
      });
  },
});

export const { 
  toggleTheme, 
  setWindowWidth,
  setSearchText,
  clearSearchText, 
  setSearchResults,
  setIsSearching,
  addNotification,
} = navbarSlice.actions;

export default navbarSlice.reducer;
