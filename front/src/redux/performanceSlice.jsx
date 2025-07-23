import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../axios";
import { handleApiError } from "../utils/errorHandlers";

export const fetchUsers = createAsyncThunk(
  "performance/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("api/user/get/");
      const users = response.data.data;

      const internCount = users.filter((user) => user.role === "INTERN").length;
      const employeeCount = users.filter(
        (user) => user.role === "EMPLOYEE"
      ).length;

      return { internCount, employeeCount };
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const fetchProjects = createAsyncThunk(
  "performance/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/projects/user_project");
      return response.data.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const fetchUserPerformance = createAsyncThunk(
  "performance/fetchUserPerformance",
  async ({ projectId, type }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/user/project/${projectId}`);
      return {
        projectId,
        type,
        data: response.data,
      };
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

const initialState = {
  projects: [],
  selectedProjects: {
    intern: null,
    employee: null,
  },
  performanceData: {
    intern: [],
    employee: [],
  },
  userCount: {
    intern: 0,
    employee: 0,
  },
  loading: {
    intern: false,
    employee: false,
    projects: false,
    users: false,
  },
  error: {
    intern: null,
    employee: null,
    projects: null,
    users: null,
  },
};

const performanceSlice = createSlice({
  name: "performance",
  initialState,
  reducers: {
    setSelectedProject: (state, action) => {
      const { projectId, type } = action.payload;
      state.selectedProjects[type] = projectId;
    },
    resetPerformanceState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading.projects = true;
        state.error.projects = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading.projects = false;
        state.projects = action.payload;

        if (!state.selectedProjects.intern) {
          const firstInternProject = action.payload.find(
            (project) => project.project_for === "Interns"
          );
          state.selectedProjects.intern = firstInternProject
            ? firstInternProject.id
            : null;
        }

        if (!state.selectedProjects.employee) {
          const firstEmployeeProject = action.payload.find(
            (project) => project.project_for === "Employee"
          );
          state.selectedProjects.employee = firstEmployeeProject
            ? firstEmployeeProject.id
            : null;
        }
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading.projects = false;
        state.error.projects =
          action.payload?.message || "Failed to fetch projects";
      })
      .addCase(fetchUsers.pending, (state) => {
        state.loading.users = true;
        state.error.users = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading.users = false;
        state.userCount = {
          intern: action.payload.internCount,
          employee: action.payload.employeeCount,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading.users = false;
        state.error.users = action.payload;
      })
      .addCase(fetchUserPerformance.pending, (state, action) => {
        const { type } = action.meta.arg;
        state.loading[type] = true;
        state.error[type] = null;
      })
      .addCase(fetchUserPerformance.fulfilled, (state, action) => {
        const { type, data } = action.payload;
        state.loading[type] = false;
        state.performanceData[type] = data;
      })
      .addCase(fetchUserPerformance.rejected, (state, action) => {
        const { type } = action.meta.arg;
        state.loading[type] = false;
        state.error[type] =
          action.payload?.message || "Failed to fetch user performance";
      });
  },
});

export const { setSelectedProject, resetPerformanceState } =
  performanceSlice.actions;

export default performanceSlice.reducer;
