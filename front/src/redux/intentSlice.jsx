import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { handleApiError } from "../utils/errorHandlers";
import api from "../axios";

export const fetchIntents = createAsyncThunk(
  "intent/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/intents");
      return res.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const createIntent = createAsyncThunk(
  "intent/create",
  async (newIntent, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/intents", newIntent);
      return res.data.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const updateIntent = createAsyncThunk(
  "intent/update",
  async ({ intentName, updatedIntent }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/api/intents/${intentName}`, updatedIntent);
      return res.data.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const deleteIntent = createAsyncThunk(
  "intent/delete",
  async (intentName, { rejectWithValue }) => {
    try {
      await api.delete(`/api/intents/${intentName}`);
      return intentName;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

const intentSlice = createSlice({
  name: "intent",
  initialState: {
    intents: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIntents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchIntents.fulfilled, (state, action) => {
        state.loading = false;
        state.intents = action.payload;
      })
      .addCase(fetchIntents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createIntent.fulfilled, (state, action) => {
        state.intents.push(action.payload);
      })
      .addCase(updateIntent.fulfilled, (state, action) => {
        const index = state.intents.findIndex(
          (i) => i.intentName === action.payload.intentName
        );
        if (index !== -1) {
          state.intents[index] = action.payload;
        }
      })
      .addCase(deleteIntent.fulfilled, (state, action) => {
        state.intents = state.intents.filter((i) => i.name !== action.payload);
      });
  },
});

export default intentSlice.reducer;
