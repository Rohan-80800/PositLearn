import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";

export const fetchCheats = createAsyncThunk(
  "cheats/fetchCheats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/cheats");
      return response.data.map(cheat => ({
        ...cheat,
        sections: JSON.parse(cheat.resource).sections,
        layout: JSON.parse(cheat.resource).layout
      }));
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch cheatsheets");
    }
  }
);

export const addCheat = createAsyncThunk(
  "cheats/addCheat",
  async (cheatData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/cheats", {
        title: cheatData.title,
        description: cheatData.description,
        resource: JSON.stringify({
          sections: cheatData.sections,
          layout: cheatData.layout
        }),
        resource_type: "CHEATSHEET"
      });
      return {
        ...response.data,
        sections: cheatData.sections,
        layout: cheatData.layout
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to create cheatsheet");
    }
  }
);

export const updateCheat = createAsyncThunk(
  "cheats/updateCheat",
  async ({ id, ...cheatData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/cheats/${id}`, {
        title: cheatData.title,
        description: cheatData.description,
        resource: JSON.stringify({
          sections: cheatData.sections,
          layout: cheatData.layout
        })
      });
      return {
        ...response.data,
        sections: cheatData.sections,
        layout: cheatData.layout
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update cheatsheet");
    }
  }
);

export const deleteCheat = createAsyncThunk(
  "cheats/deleteCheat",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/cheats/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to delete cheatsheet");
    }
  }
);

const cheatSheetSlice = createSlice({
  name: "cheats",
  initialState: {
    cheats: [],
    status: "idle",
    error: null,
  },
  reducers: {
    resetStatus: (state) => {
      state.status = "idle";
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCheats.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCheats.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.cheats = action.payload;
      })
      .addCase(fetchCheats.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(addCheat.pending, (state) => {
        state.status = "loading";
      })
      .addCase(addCheat.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.cheats.unshift(action.payload);
      })
      .addCase(addCheat.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })      
      .addCase(updateCheat.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateCheat.fulfilled, (state, action) => {
        state.status = "succeeded";
        const index = state.cheats.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.cheats[index] = action.payload;
        }
      })
      .addCase(updateCheat.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(deleteCheat.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteCheat.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.cheats = state.cheats.filter(c => c.id !== action.payload);
      })
      .addCase(deleteCheat.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  }
});

export const { resetStatus } = cheatSheetSlice.actions;
export default cheatSheetSlice.reducer;
