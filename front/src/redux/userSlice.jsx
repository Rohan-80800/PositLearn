import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("api/user/get/");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch users"
      );
    }
  }
);

export const updateUserRole = createAsyncThunk(
  "users/updateUserRole",
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const response = await api.post("api/user/update-role", { userId, role });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update user role"
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      await api.post("api/user/delete", { userId });
      return userId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete user"
      );
    }
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState: {
    users: [],
    loading: false,
    error: null,
    operationLoading: false,
    operationError: null,
  },
  reducers: {
    clearErrors: (state) => {
      state.error = null;
      state.operationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateUserRole.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.operationLoading = false;
        const updatedUser = action.payload;
        state.users = state.users.map((user) =>
          user.clerk_id === updatedUser.clerk_id
            ? { ...user, role: updatedUser.role }
            : user
        );
      })
      .addCase(updateUserRole.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload;
      })
      .addCase(deleteUser.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.operationLoading = false;
        const userId = action.payload;
        state.users = state.users.filter((user) => user.clerk_id !== userId);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload;
      });
  },
});

export const { clearErrors } = usersSlice.actions;
export default usersSlice.reducer;
