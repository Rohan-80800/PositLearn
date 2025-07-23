import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { message } from "antd";
import api from "../axios";
import { handleApiError } from "../utils/errorHandlers";

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await api.post("/api/modules/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.url;
  } catch (error) {
    console.error("Upload file error:", error.message, error.response?.data);
    throw new Error(
      error.response?.data?.error || error.message || "Failed to upload file"
    );
  }
};

export const createProjectThunk = createAsyncThunk(
  "project/createProject",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/projects/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue({
        status: error.response?.status,
        message: error.response?.data?.message || "Failed to create project.",
      });
    }
  }
);

export const createModuleThunk = createAsyncThunk(
  "project/createModule",
  async ({ moduleData, projectId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/modules/${projectId}`, moduleData, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error) {
      console.error(
        "Module creation error:",
        error.response?.data || error.message
      );
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue({
        status: error.response?.status,
        message: error.response?.data?.message || "Failed to create module.",
      });
    }
  }
);

export const fetchTeamsThunk = createAsyncThunk(
  "project/fetchTeams",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/teams/");
      return response.data.data;
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue({
        status: error.response?.status,
        message: error.response?.data?.message || "Failed to fetch teams.",
      });
    }
  }
);

export const fetchProjectDetails = createAsyncThunk(
  "project/fetchProjectDetails",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/projects/get/${id}`);
      return response.data;
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue({
        status: error.response?.status,
        message:
          error.response?.data?.message || "Failed to fetch project details.",
      });
    }
  }
);

export const updateProjectModule = createAsyncThunk(
  "project/updateModule",
  async ({ moduleData, projectId, moduleId }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/api/modules/update/${projectId}/${moduleId}`,
        moduleData,
        { headers: { "Content-Type": "application/json" } }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Module update error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to update module."
      );
    }
  }
);

export const deleteProjectModule = createAsyncThunk(
  "project/deleteModule",
  async ({ projectId, moduleId }, { rejectWithValue }) => {
    try {
      await api.delete(`/api/modules/delete/${projectId}/${moduleId}`);
      return { moduleId };
    } catch (error) {
      console.error(
        "Delete module error:",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateProject = createAsyncThunk(
  "project/updateProject",
  async (
    { projectId, projectData, modules },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const formData = new FormData();
      Object.entries(projectData).forEach(([key, value]) => {
        if (key === "team") {
          const teamValue =
            Array.isArray(value) && value.length === 0
              ? "[]"
              : JSON.stringify(value || []);
          formData.append("team_ids", teamValue);
        } else if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      await api.put(`/api/projects/update/${projectId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (modules && Array.isArray(modules) && modules.length > 0) {
        const existingModulesResponse = await api.get(
          `/api/modules/getmodules/${projectId}`
        );
        const existingModules = existingModulesResponse.data.modules || [];

        const moduleIdsToKeep = modules.filter((m) => m.id).map((m) => m.id);
        const modulesToDelete = existingModules.filter(
          (m) => !moduleIdsToKeep.includes(m.id)
        );

        for (const module of modulesToDelete) {
          await dispatch(
            deleteProjectModule({ projectId, moduleId: module.id })
          ).unwrap();
        }

        for (const module of modules) {
          const moduleData = {
            title: module.title,
            description: module.description,
            video: JSON.stringify(module.video || []),
            file: JSON.stringify(module.file || []),
          };

          if (module.id) {
            await dispatch(
              updateProjectModule({
                moduleData,
                projectId,
                moduleId: module.id,
              })
            ).unwrap();
          } else {
            await dispatch(
              createModuleThunk({
                moduleData,
                projectId,
              })
            ).unwrap();
          }
        }
      }

      const updatedProjectResponse = await api.get(
        `/api/projects/get/${projectId}`
      );
      return updatedProjectResponse.data;
    } catch (error) {
      console.error(
        "Update project error:",
        error.response?.data || error.message
      );
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue({
        status: error.response?.status,
        message: error.response?.data?.message || "Failed to update project.",
      });
    }
  }
);

const mapProjectData = (project) => {
  let descriptionObj = project.description;
  if (typeof descriptionObj === "string") {
    try {
      descriptionObj = JSON.parse(descriptionObj);
    } catch {
      descriptionObj = { content: "", techStack: [] };
    }
  }
  return {
    project_name: project.project_name || "",
    description: descriptionObj?.content || "",
    techStack: (descriptionObj?.techStack || []).map((stack) => ({
      ...stack,
      isSaved: true,
    })),
    githubUrl: project.github_repository || "",
    priority: project.priority || "HIGH",
    project_type: project.project_type || "WEB",
    team: project.teams?.map((team) => team.id) || [],
    imageUrl: project.logo_url || null,
    projectModules:
      project.modules?.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        video: module.video || [],
        file: (module.file || []).map((file) => ({
          ...file,
          type: "url",
          file: null,
        })),
      })) || [],
  };
};

const initialState = {
  project_name: "",
  description: "",
  githubUrl: "",
  priority: "HIGH",
  project_type: "WEB",
  team: [],
  teamCategory: null,
  logoFile: null,
  imageUrl: null,
  videoUrls: [],
  fileUrls: [],
  projectModules: [],
  isModalOpen: false,
  editingIndex: null,
  error: false,
  githubError: "",
  teams: [],
  duplicateProjectError: "",
  duplicateModuleError: "",
  projectNameError: "",
  githubRequiredError: "",
  startDateError: "",
  endDateError: "",
  loading: false,
  apiError: null,
  techStack: [],
};

const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;

const projectSlice = createSlice({
  name: "createproject",
  initialState,
  reducers: {
    setProjectName: (state, action) => {
      state.project_name = action.payload;
      const invalidPattern = /^[^a-zA-Z]/;
      state.error = invalidPattern.test(action.payload);
      state.projectNameError = state.error
        ? "Name should not start with a digit or special character."
        : "";
      state.duplicateProjectError = "";
    },
    setDescription: (state, action) => {
      state.description = action.payload;
    },
    setGithubUrl: (state, action) => {
      state.githubUrl = action.payload;
      const githubRepoRegex =
        /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9-_]+(\/)?$/;
      state.githubError =
        githubRepoRegex.test(action.payload) || action.payload.trim() === ""
          ? ""
          : "Please enter a valid GitHub repository URL.";
      state.githubRequiredError =
        action.payload.trim() === "" ? "Please insert Github repository" : "";
    },
    addTechStack: (state) => {
      state.techStack.push({
        title: "",
        version: "",
        description: "",
        isSaved: false,
      });
    },
    updateTechStack: (state, action) => {
      const { index, field, value } = action.payload;
      if (state.techStack[index]) {
        state.techStack[index][field] = value;
      }
    },
    deleteTechStack: (state, action) => {
      state.techStack.splice(action.payload, 1);
    },
    setTechStack: (state, action) => {
      state.techStack = action.payload;
    },
    setPriority: (state, action) => {
      state.priority = action.payload;
    },
    setPtype: (state, action) => {
      state.project_type = action.payload;
    },
    setTeam: (state, action) => {
      state.team = action.payload;
    },
    setImageUrl: (state, action) => {
      state.imageUrl = action.payload;
    },
    setLogoFile: (state, action) => {
      state.logoFile = action.payload;
    },
    addVideoUrl: (state) => {
      state.videoUrls.push({ title: "", url: "", error: "" });
    },
    updateVideoUrl: (state, action) => {
      const { index, field, value } = action.payload;
      state.videoUrls[index][field] = value;

      if (field === "url") {
        state.videoUrls[index].error =
          value.trim() === ""
            ? state.videoUrls[index].title
              ? "URL is required when title is provided."
              : ""
            : urlRegex.test(value)
            ? ""
            : "Please enter a valid URL.";
      }
      if (field === "title") {
        state.videoUrls[index].error =
          value && !state.videoUrls[index].url
            ? "URL is required when title is provided."
            : state.videoUrls[index].url &&
              !urlRegex.test(state.videoUrls[index].url)
            ? "Please enter a valid URL."
            : "";
      }
    },
    addFileUrl: (state) => {
      state.fileUrls.push({
        title: "",
        url: "",
        type: "url",
        file: null,
        error: "",
      });
    },
    updateFileUrl: (state, action) => {
      const { index, field, value } = action.payload;
      state.fileUrls[index][field] = value;

      if (field === "url" && state.fileUrls[index].type === "url") {
        state.fileUrls[index].error =
          value.trim() === ""
            ? state.fileUrls[index].title
              ? "File is required when title is provided."
              : ""
            : urlRegex.test(value)
            ? ""
            : "Please upload PDF, DOC, DOCX files only.";
      }
      if (field === "title" && state.fileUrls[index].type === "url") {
        state.fileUrls[index].error =
          value && !state.fileUrls[index].url
            ? "File is required when title is provided."
            : state.fileUrls[index].url &&
              !urlRegex.test(state.fileUrls[index].url)
            ? "Please upload PDF, DOC, DOCX files only."
            : "";
      }
    },
    setFileType: (state, action) => {
      const { index, type } = action.payload;
      state.fileUrls[index].type = type;
      state.fileUrls[index].url = "";
      state.fileUrls[index].file = null;
      state.fileUrls[index].error = "";
    },
    setVideoUrls: (state, action) => {
      state.videoUrls = action.payload;
    },
    setFileUrls: (state, action) => {
      state.fileUrls = action.payload;
    },
    setTeamCategory: (state, action) => {
      state.teamCategory = action.payload;
      state.team = [];
    },
    resetModuleForm: (state) => {
      state.videoUrls = [];
      state.fileUrls = [];
      state.duplicateModuleError = "";
    },
    resetForm: (state) => {
      return {
        ...initialState,
        teams: state.teams,
        logoFile: state.logoFile,
        imageUrl: state.imageUrl,
      };
    },
    addModule: (state, action) => {
      state.projectModules.push(action.payload);
    },
    updateModule: (state, action) => {
      const { index, moduleData } = action.payload;
      state.projectModules[index] = {
        ...state.projectModules[index],
        ...moduleData,
      };
    },
    deleteModule: (state, action) => {
      state.projectModules.splice(action.payload, 1);
    },
    setModalOpen: (state, action) => {
      state.isModalOpen = action.payload;
      if (!action.payload) {
        state.editingIndex = null;
      }
    },
    setEditingIndex: (state, action) => {
      state.editingIndex = action.payload;
    },
    clearDuplicateProjectError: (state) => {
      state.duplicateProjectError = "";
    },
    clearDuplicateModuleError: (state) => {
      state.duplicateModuleError = "";
    },
    setDuplicateModuleError: (state, action) => {
      state.duplicateModuleError = action.payload;
    },
    setProjectNameError: (state, action) => {
      state.projectNameError = action.payload;
    },
    setGithubRequiredError: (state, action) => {
      state.githubRequiredError = action.payload;
    },
    setStartDateError: (state, action) => {
      state.startDateError = action.payload;
    },
    setEndDateError: (state, action) => {
      state.endDateError = action.payload;
    },
    clearRequiredErrors: (state) => {
      state.projectNameError = "";
      state.githubRequiredError = "";
      state.startDateError = "";
      state.endDateError = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProjectDetails.fulfilled, (state, action) => {
        state.loading = false;
        const project = action.payload.data || action.payload;
        const mappedProject = mapProjectData(project);
        state.project_name = mappedProject.project_name;
        state.description = mappedProject.description;
        state.techStack = mappedProject.techStack;
        state.githubUrl = mappedProject.githubUrl;
        state.priority = mappedProject.priority;
        state.project_type = mappedProject.project_type;
        state.team = mappedProject.team;
        state.imageUrl = mappedProject.imageUrl;
        state.projectModules = mappedProject.projectModules;
      })
      .addCase(fetchProjectDetails.rejected, (state, action) => {
        state.loading = false;
        state.apiError = action.payload;
      })
      .addCase(updateProject.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.loading = false;
        const updatedProject = action.payload.data || action.payload;
        const mappedProject = mapProjectData(updatedProject);
        state.project_name = mappedProject.project_name;
        state.description = mappedProject.description;
        state.techStack = mappedProject.techStack;
        state.githubUrl = mappedProject.githubUrl;
        state.priority = mappedProject.priority;
        state.project_type = mappedProject.project_type;
        state.team = mappedProject.team;
        state.imageUrl = mappedProject.imageUrl;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading = false;
        state.apiError = action.payload;
        if (
          action.payload?.message ===
          "A project with the same name already exists."
        ) {
          message.error(action.payload.message);
        } else {
          message.error(action.payload?.message || "Failed to update project.");
        }
      })
      .addCase(createProjectThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(createProjectThunk.fulfilled, (state) => {
        state.loading = false;
        state.duplicateProjectError = "";
      })
      .addCase(createProjectThunk.rejected, (state, action) => {
        state.loading = false;
        state.duplicateProjectError = action.payload?.message || "";
      })
      .addCase(createModuleThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(createModuleThunk.fulfilled, (state) => {
        state.loading = false;
        state.duplicateModuleError = "";
      })
      .addCase(createModuleThunk.rejected, (state, action) => {
        state.loading = false;
        state.duplicateModuleError = action.payload || "Failed to add module.";
        message.error(state.duplicateModuleError);
      })
      .addCase(deleteProjectModule.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteProjectModule.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteProjectModule.rejected, (state, action) => {
        state.loading = false;
        message.error(action.payload || "Failed to delete module.");
      })
      .addCase(updateProjectModule.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProjectModule.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateProjectModule.rejected, (state, action) => {
        state.loading = false;
        message.error(action.payload || "Failed to update module.");
      })
      .addCase(fetchTeamsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeamsThunk.fulfilled, (state, action) => {
        state.teams = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
      })
      .addCase(fetchTeamsThunk.rejected, (state, action) => {
        state.loading = false;
        state.apiError = action.payload;
        state.teams = [];
      });
  },
});

export const {
  setProjectName,
  setDescription,
  setGithubUrl,
  setPriority,
  setPtype,
  setTeam,
  setTeamCategory,
  setLogoFile,
  setImageUrl,
  addVideoUrl,
  resetModuleForm,
  updateVideoUrl,
  addFileUrl,
  updateFileUrl,
  setFileType,
  addModule,
  setVideoUrls,
  setFileUrls,
  updateModule,
  deleteModule,
  setModalOpen,
  resetForm,
  setEditingIndex,
  clearDuplicateProjectError,
  clearDuplicateModuleError,
  setDuplicateModuleError,
  setProjectNameError,
  setGithubRequiredError,
  setStartDateError,
  setEndDateError,
  clearRequiredErrors,
  addTechStack,
  updateTechStack,
  deleteTechStack,
  setTechStack,
} = projectSlice.actions;

export default projectSlice.reducer;
