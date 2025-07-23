import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";

const initialState = {
  project: null,
  loading: false,
  error: null,
  summary: {
    description: "",
    startDate: "",
    Team: "",
  },
  progress: 0,
  techStack: [],
  projectDetails: [],
  teamMembers: [],
  roadmap: [],
  badges: {
    loading: false,
    error: null,
    projectBadgeStatus: {},
  },
};

export const fetchProjectDetails = createAsyncThunk(
  "projectDetail/fetchProjectDetails",
  async ({ projectId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/projects/user_project`);
      const project = response.data.data.find(
        (p) => p.id === parseInt(projectId)
      );

      if (!project) {
        throw new Error("Project not found");
      }
      return project;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch projects"
      );
    }
  }
);

export const fetchUserBadges = createAsyncThunk(
  "projectDetail/fetchUserBadges",
  async ({ userId, projectId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/badges/get_latest/${userId}/${projectId}`);
      return { projectId, data: response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch project badge status"
      );
    }
  }
);

const projectDetailSlice = createSlice({
  name: "projectDetail",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.project = action.payload;
      })
      .addCase(fetchProjectDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchUserBadges.pending, (state) => {
        state.badges.loading = true;
        state.badges.error = null;
      })
      .addCase(fetchUserBadges.fulfilled, (state, action) => {
        state.badges.loading = false;
        state.badges.projectBadgeStatus[action.payload.projectId] = action.payload.data;
      })
      .addCase(fetchUserBadges.rejected, (state, action) => {
        state.badges.loading = false;
        state.badges.error = action.payload || action.error.message;
      });
  },
});

export const selectTeamMembers = (state) => state.projectDetail.teamMembers;
export const selectRoadmap = (state) => state.projectDetail.roadmap;
export const selectUserBadges = (state) => state.projectDetail.badges;
export default projectDetailSlice.reducer;
