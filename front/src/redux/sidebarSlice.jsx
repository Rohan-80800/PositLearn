import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";
export const fetchUserProjectId = createAsyncThunk(
  "sidebar/fetchProjectId",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`api/user/get/${userId}`);
      const data = response?.data?.data;
      const projectId = data?.current_project_id;
      const progress = data?.progress_percentage;
      const startDate = data?.start_date;
      const endDate = data?.end_date;

      if (!projectId) {
        throw new Error("Project ID not found");
      }

      return { projectId, progress, startDate, endDate };
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch project ID",
        status: error.response?.status || 500,
      });
    }
  }
);

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState: {
    collapsed: window.innerWidth < 750,
    isDrawerVisible: false,
    projectId: null,
    loading: false,
    error: null,
    progress: null,
    startDate: null,
    endDate: null,
  },
  reducers: {
    toggleSidebar: (state) => {
      state.collapsed = !state.collapsed;
    },
    setCollapsed: (state, action) => {
      state.collapsed = action.payload;
    },
    toggleDrawer: (state) => {
      state.isDrawerVisible = !state.isDrawerVisible;
    },
    setDrawerVisible: (state, action) => {
      state.isDrawerVisible = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProjectId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProjectId.fulfilled, (state, action) => {
        state.loading = false;
        state.projectId = action.payload.projectId;
        state.progress = action.payload.progress;
        state.startDate = action.payload.startDate;
        state.endDate = action.payload.endDate;
      })
      .addCase(fetchUserProjectId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch project ID";
      });
  },
});

export const { toggleSidebar, setCollapsed, toggleDrawer, setDrawerVisible } =
  sidebarSlice.actions;
export default sidebarSlice.reducer;
