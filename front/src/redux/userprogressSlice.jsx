import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../axios";
import { handleApiError } from "../utils/errorHandlers";

export const fetchUserData = createAsyncThunk(
  "user/fetchUserData",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`api/useradmin/dashboard/${userId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const fetchTeamProgress = createAsyncThunk(
  "user/fetchTeamProgress",
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `api/useradmin/team-progress/${projectId}`
      );
      return response.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

const initialState = {
  data: null,
  teamProgress: [],
  loadingUser: false,
  loadingTeamProgress: false,
  error: null,
};

const userprogressSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserData.pending, (state) => {
        state.loadingUser = true;
        state.error = null;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.loadingUser = false;
        state.data = action.payload.data;
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.loadingUser = false;
        state.error = action.payload?.message || "Failed to fetch user data";
      })
      .addCase(fetchTeamProgress.pending, (state) => {
        state.loadingTeamProgress = true;
        state.error = null;
      })
      .addCase(fetchTeamProgress.fulfilled, (state, action) => {
        state.loadingTeamProgress = false;
        state.teamProgress = action.payload.data;
      })
      .addCase(fetchTeamProgress.rejected, (state, action) => {
        state.loadingTeamProgress = false;
        state.error =
          action.payload?.message || "Failed to fetch team progress";
      });
  },
});

export const { resetError } = userprogressSlice.actions;
export default userprogressSlice.reducer;
