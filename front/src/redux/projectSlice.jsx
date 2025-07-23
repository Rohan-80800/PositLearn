import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";

export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("api/projects/user_project");
      return response.data?.data || [];
    } catch (error) {
      console.error("Fetch projects error:", error);
      if (error.response?.status === 401) {
        return rejectWithValue(
          "Unauthorized: Please log in to access members."
        );
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch projects"
      );
    }
  }
);

const projectSlice = createSlice({
  name: "projects",
  initialState: {
    projects: [],
    intern_projects: [],
    employee_projects: [],
    not_assigned_projects: [],
    status: "idle",
    error: null,
  },
  reducers: {
    resetProjects: () => ({
      projects: [],
      intern_projects: [],
      employee_projects: [],
      not_assigned_projects: [],
      status: "idle",
      error: null,
    }),
    removeProject: (state, action) => {
      const projectId = action.payload;
      state.projects = state.projects.filter(
        (project) => project.id !== action.payload
      );
      state.intern_projects = state.intern_projects.filter(
        (project) => project.id !== projectId
      );
      state.employee_projects = state.employee_projects.filter(
        (project) => project.id !== projectId
      );
      state.not_assigned_projects = state.not_assigned_projects.filter(
        (project) => project.id !== projectId
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProjects.fulfilled, (state, { payload }) => {
        state.status = "succeeded";
        state.projects = payload;

        state.intern_projects = payload.filter(
          (project) => project.category === "Interns"
        );
        state.employee_projects = payload.filter(
          (project) => project.category === "Employee"
        );
        state.not_assigned_projects = payload.filter(
          (project) => !project.category
        );
      })
      .addCase(fetchProjects.rejected, (state, { payload }) => {
        state.status = "failed";
        state.error = payload;
      });
  },
});

export const { resetProjects, removeProject } = projectSlice.actions;
export default projectSlice.reducer;
