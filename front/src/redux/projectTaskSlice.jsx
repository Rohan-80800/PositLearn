import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";

const TaskStatus = {
  COMPLETED: "completed",
  IN_PROGRESS: "inProgress",
  BEHIND: "behind",
};

Object.freeze(TaskStatus);

const initialState = {
  project_task: [],
  taskPerformanceData: {
    labels: ["Completed", "In-Progress", "Behind"],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ["#52c41a", "#faad14", "#f5222d"],
        borderWidth: 0,
      },
    ],
  },
  taskPerformanceDetails: [
    { name: "Completed", value: 0, icon: "check_circle", color: "#52c41a" },
    { name: "In-Progress", value: 0, icon: "arrow_upward", color: "#faad14" },
    { name: "Behind", value: 0, icon: "arrow_downward", color: "#f5222d" },
  ],
  pagination: {
    currentPage: 1,
    pageSize: 4,
    totalItems: 0,
  },
};

const projectTaskSlice = createSlice({
  name: "project_task",
  initialState,
  reducers: {
    setProjects: (state, action) => {
      state.project_task = action.payload;
      state.pagination.totalItems = action.payload.length;
    },
    addProject: (state, action) => {
      state.project_task.push(action.payload);
      state.pagination.totalItems = state.project_task.length;
    },
    updateProject: (state, action) => {
      const { key, updatedData } = action.payload;
      const index = state.project_task.findIndex(
        (project) => project.key === key
      );
      if (index !== -1) {
        state.project_task[index] = {
          ...state.project_task[index],
          ...updatedData,
        };
      }
    },
    removeProject: (state, action) => {
      state.project_task = state.project_task.filter(
        (project) => project.key !== action.payload
      );
      state.pagination.totalItems = state.project_task.length;
    },
    setTaskPerformanceData: (state, action) => {
      state.taskPerformanceData = action.payload;
    },
    setTaskPerformanceDetails: (state, action) => {
      state.taskPerformanceDetails = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
  },
});

export const {
  setProjects,
  addProject,
  updateProject,
  removeProject,
  setTaskPerformanceData,
  setTaskPerformanceDetails,
  setCurrentPage,
} = projectTaskSlice.actions;

export const fetchTaskPerformanceData = createAsyncThunk(
  "dashboard/fetchTaskPerformanceData",
  async (clerkId, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get(`api/user/dashboard?clerkId=${clerkId}`);
      const { data } = response.data;

      const getPercent = (key) => parseFloat(data[key]?.percent) || 0;

      const completed = getPercent(TaskStatus.COMPLETED);
      const inProgress = getPercent(TaskStatus.IN_PROGRESS);
      const behind = getPercent(TaskStatus.BEHIND);

      dispatch(
        setTaskPerformanceData({
          labels: ["Completed", "In-Progress", "Behind"],
          datasets: [
            {
              data: [completed, inProgress, behind],
              borderWidth: 0
            }
          ]
        })
      );

      dispatch(
        setTaskPerformanceDetails([
          {
            name: "Completed",
            value: completed.toFixed(2),
            icon: "check_circle",
            key: TaskStatus.COMPLETED,
          },
          {
            name: "In-Progress",
            value: inProgress.toFixed(2),
            icon: "arrow_upward",
            key: TaskStatus.IN_PROGRESS,
          },
          {
            name: "Behind",
            value: behind.toFixed(2),
            icon: "arrow_downward",
            key: TaskStatus.BEHIND,
          },
        ])
      );

      return data;
    } catch (error) {
      console.error("Failed to fetch task performance data:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch task performance data"
      );
    }
  }
);

export default projectTaskSlice.reducer;
