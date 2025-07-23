import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const handleAccessRestriction = (data, owner) => ({
  status: "pending",
  fileStructure: [],
  requestAccess: true,
  orgName: owner,
  approvalUrl:
    data.documentation_url ||
    "https://github.com/settings/connections/applications"
});

const buildNestedTree = (treeArray) => {
  const root = [];
  treeArray.forEach((item) => {
    const parts = item.path.split("/");
    let currentLevel = root;
    parts.forEach((part, index) => {
      const pathSoFar = parts.slice(0, index + 1).join("/");
      let existing = currentLevel.find((n) => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: pathSoFar,
          type:
            index === parts.length - 1
              ? item.type === "tree"
                ? "dir"
                : "file"
              : "dir",
          children: [],
        };
        currentLevel.push(existing);
      }
      currentLevel = existing.children;
    });
  });
  return root;
};

export const fetchFileStructure = createAsyncThunk(
  "files/fetchFileStructure",
  async ({ owner, repo, path = "" }, { getState, rejectWithValue }) => {
    try {
      const token = getState().github.token;
      const headers = token
        ? {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json"
          }
        : {};

      if (path === "") {
        const repoResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          { headers }
        );
        if (!repoResponse.ok) {
          const data = await repoResponse.json();

          if (data.message.includes("access restrictions")) {
            return rejectWithValue(handleAccessRestriction(data, owner));
          }

          if (repoResponse.status === 404) {
            throw new Error("Not Found");
          }
          throw new Error(data.message);
        }
        const repoData = await repoResponse.json();
        const defaultBranch = repoData.default_branch;
        const treeResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
          { headers }
        );
        if (!treeResponse.ok) {
          const data = await treeResponse.json();

          if (data.message.includes("access restrictions")) {
            return rejectWithValue(handleAccessRestriction(data, owner));
          }

          if (treeResponse.status === 404) {
            throw new Error("Not Found");
          }
          throw new Error(data.message);
        }
        const treeData = await treeResponse.json();
        const nestedTree = buildNestedTree(treeData.tree);
        return {
          status: "approved",
          fileStructure: nestedTree,
          orgName: owner
        };
      } else {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
          { headers }
        );
        if (!response.ok) {
          const data = await response.json();

          if (data.message.includes("access restrictions")) {
            return rejectWithValue(handleAccessRestriction(data, owner));
          }

          if (response.status === 404) {
            throw new Error("Not Found");
          }
          throw new Error(data.message);
        }
        const folderContents = await response.json();
        return {
          status: "approved",
          fileStructure: folderContents,
          orgName: owner
        };
      }
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        status: "error"
      });
    }
  }
);

export const fetchFileContent = createAsyncThunk(
  "files/fetchFileContent",
  async ({ owner, repo, filePath }, { getState }) => {
    try {
      const token = getState().github.token;

      const headers = token
        ? {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json"
          }
        : {};
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        { headers }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      const data = await response.json();
      return atob(data.content);
    } catch (error) {
      console.error("Error fetching file content:", error.message);
      throw error;
    }
  }
);

const initialState = {
  loading: false,
  fileStructure: [],
  error: null,
  fileContent: "",
  contentLoading: false,
  contentError: null,
  projects: [],
  accessStatus: "pending",
  requestAccess: false,
  orgName: null,
  approvalUrl: null
};

const fileSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    addProject: (state, action) => {
      state.projects.push(action.payload);
    },
    removeProject: (state, action) => {
      state.projects = state.projects.filter(
        (project) => project.repo !== action.payload
      );
    },
    setToken: (state, action) => {
      state.token = action.payload;
      state.accessStatus = "granted";
    },
    clearToken: (state) => {
      state.token = null;
      state.accessStatus = "pending";
    },
    resetFileState: (state) => {
      state.fileStructure = [];
      state.fileContent = "";
      state.error = null;
      state.contentError = null;
      state.loading = false;
      state.contentLoading = false;
      state.accessStatus = "unknown";
      state.requestAccess = false;
      state.approvalUrl = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFileStructure.pending, (state) => {
        state.loading = true;
        state.accessStatus = "pending";
      })
      .addCase(fetchFileStructure.fulfilled, (state, action) => {
        state.loading = false;
        state.fileStructure = action.payload.fileStructure;
        state.error = null;
        state.accessStatus = action.payload.status;
        state.requestAccess = action.payload.requestAccess || false;
        state.orgName = action.payload.orgName || state.orgName;
      })
      .addCase(fetchFileStructure.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
        state.accessStatus = action.payload.status || "error";
        state.requestAccess = action.payload.requestAccess || false;
        state.orgName = action.payload.orgName || state.orgName;
        state.approvalUrl = action.payload.approvalUrl || null;
      })
      .addCase(fetchFileContent.pending, (state) => {
        state.contentLoading = true;
      })
      .addCase(fetchFileContent.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.fileContent = action.payload;
        state.contentError = null;
      })
      .addCase(fetchFileContent.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.error.message;
      });
  },
});

export const { addProject, removeProject, resetFileState } = fileSlice.actions;
export default fileSlice.reducer;
