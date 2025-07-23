import { createSlice } from "@reduxjs/toolkit";

const githubSlice = createSlice({
  name: "github",
  initialState: {
    token: localStorage.getItem("github_token") || null,
  },
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
      localStorage.setItem("github_token", action.payload);
    },
    clearToken: (state) => {
      state.token = null;
      localStorage.removeItem("github_token"); 
    },
  },
});

export const { setToken, clearToken } = githubSlice.actions;
export default githubSlice.reducer;
