import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";

export const fetchDashboardData = createAsyncThunk(
  "dashboard/fetchDashboardData",
  async (rejectWithValue) => {
    try {
      const response = await api.get(`/api/projects/stats`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch dashboard data"
      );
    }
  }
);

const initialState = {
  projects: { total: 0, completed: 0 },
  activeTasks: 0,
  teams: { total: 0 },
  productivity: 0,
  status: "idle",
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        const { total_projects, completed_projects, team_count } =
          action.payload;
        state.projects.total = total_projects;
        state.projects.completed = completed_projects;
        state.teams.total = team_count;
        state.status = "succeeded";
      })
      .addCase(fetchDashboardData.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default dashboardSlice.reducer;
