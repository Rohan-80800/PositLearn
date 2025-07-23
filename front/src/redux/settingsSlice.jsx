import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeTab: "Teams",
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
  },
});

export const { setActiveTab } = settingsSlice.actions;
export default settingsSlice.reducer;
