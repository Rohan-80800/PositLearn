import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";
import { handleApiError } from "../utils/errorHandlers";

const initialState = {
  teams: [],
  members: [],
  projectOptions: [],
  modalState: { isOpen: false, isEdit: false, editId: null },
  teamData: {
    name: "",
    members: [],
    projects: [],
    icon: "mdi:account-group",
    team_category: "",
  },
  newProject: "",
  isProjectModalOpen: false,
  deleteModal: { isOpen: false, teamId: null },
  iconOptions: [
    { value: "mdi:code-braces", color: "#FF6B6B" },
    { value: "mdi:web", color: "#4ECDC4" },
    { value: "mdi:server", color: "#45B7D1" },
    { value: "mdi:cloud", color: "#96CEB4" },
    { value: "mdi:palette", color: "#FF9F55" },
    { value: "mdi:image-edit", color: "#D4A5A5" },
    { value: "mdi:clipboard-list", color: "#6D8299" },
    { value: "mdi:chart-line", color: "#FFD54F" },
    { value: "mdi:bullhorn", color: "#AB47BC" },
    { value: "mdi:bug-check", color: "#66BB6A" },
    { value: "mdi:shield-check", color: "#42A5F5" },
    { value: "mdi:account-group", color: "#EF5350" },
    { value: "mdi:currency-usd", color: "#FFB300" },
    { value: "mdi:headset", color: "#7E57C2" },
    { value: "mdi:account-group-outline", color: "#26A69A" },
  ],
};

const UserRole = {
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
  INTERN: "INTERN",
};

export const fetchMembers = createAsyncThunk(
  "teams/fetchMembers",
  async (userRole, { rejectWithValue }) => {
    try {
      const response = await api.get("api/user/get/");
      const allUsers = response.data.data;
      let filteredUsers = [];

      if (userRole === UserRole.ADMIN) {
        filteredUsers = allUsers.filter((u) => u.role !== UserRole.ADMIN);
      } else if (userRole === UserRole.EMPLOYEE) {
        filteredUsers = allUsers.filter((u) => u.role === UserRole.INTERN);
      } else {
        filteredUsers = [];
      }

      return filteredUsers.map((user) => ({
        id: user.clerk_id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role,
      }));
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Error fetching members"
      );
    }
  }
);

export const fetchProjects = createAsyncThunk(
  "teams/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("api/projects/");
      const project = response.data.data.map((project) => {
        return {
          id: project.id,
          name: project.project_name,
          type: project.project_type,
        };
      });
      return project;
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Error fetching projects"
      );
    }
  }
);

export const fetchTeams = createAsyncThunk(
  "teams/fetchTeams",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/teams/");
      return response.data.data.map((team) => ({
        id: team.id,
        name: team.team_name,
        members: team.users.map((user) => ({
          id: user.clerk_id,
          name: `${user.first_name} ${user.last_name}`.trim(),
          user_image: user.user_image,
        })),
        projects: team.projects || Array(team._count.projects).fill("Project"),
        icon: team.team_icon || "mdi:account-group",
        team_category: team.team_category || "",
      }));
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Error fetching teams"
      );
    }
  }
);

export const createTeamAsync = createAsyncThunk(
  "teams/createTeam",
  async (teamData, { rejectWithValue }) => {
    try {
      const payload = {
        team_name: teamData.name,
        description: teamData.description || "",
        is_active: true,
        users: teamData.members.map((m) => m),
        projects: teamData.projects.map((p) => p),
        icon: teamData.icon,
        team_category: teamData.team_category,
      };

      const response = await api.post("api/teams/create", payload);
      const data = response.data.data;

      return {
        id: data.id,
        name: data.team_name,
        members: data.users?.map((user) => ({
          id: user.clerk_id,
          name: `${user.first_name} ${user.last_name}`.trim(),
        })),
        projects: data.projects?.map((p) => p.name) || [],
        icon: data.team_icon ? String(data.team_icon) : "mdi:account-group",
        team_category: data.team_category || "",
      };
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Error creating team"
      );
    }
  }
);

export const updateTeamAsync = createAsyncThunk(
  "teams/updateTeam",
  async (teamData, { rejectWithValue }) => {
    try {
      const { id, members, projects, ...rest } = teamData;
      const payload = {
        id: rest.id,
        team_name: rest.name,
        description: rest.description || "",
        is_active: rest.is_active || false,
        users: members.map((m) => m),
        projects: projects.map((p) => p),
        icon: teamData.icon,
        team_category: teamData.team_category,
      };

      const response = await api.put(`api/teams/update/${id}`, payload);
      const data = response.data.data;

      return {
        id: data.id,
        name: data.team_name,
        members: data.users?.map((user) => ({
          id: user.clerk_id,
          name: `${user.first_name} ${user.last_name}`.trim(),
        })),
        projects: data.projects?.map((p) => p.name) || [],
        icon: data.team_icon ? String(data.team_icon) : "mdi:account-group",
        team_category: data.team_category || "",
      };
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Error updating team"
      );
    }
  }
);

export const deleteTeamAsync = createAsyncThunk(
  "teams/deleteTeam",
  async (teamId, { rejectWithValue }) => {
    try {
      await api.delete(`api/teams/delete/${teamId}`);
      return teamId;
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Error deleting team"
      );
    }
  }
);

const teamsSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {
    addTeam: (state, action) => {
      const newTeam = {
        id: Date.now(),
        name: action.payload.name.trim(),
        members: action.payload.members,
        projects: action.payload.projects || [],
        icon: action.payload.icon || "mdi:account-group",
        team_category: action.payload.team_category || "",
      };
      state.teams.push(newTeam);
    },
    editTeam: (state, action) => {
      const { id, name, members, projects, icon, team_category } =
        action.payload;
      const team = state.teams.find((team) => team.id === id);

      if (team) {
        team.name = name.trim();
        team.members = members;
        team.projects = projects ?? team.projects;
        team.icon = icon || team.icon;
        team.team_category = team_category || team.team_category;
      }
    },
    setModalState: (state, action) => {
      state.modalState = action.payload;
    },
    setTeamData: (state, action) => {
      state.teamData = { ...state.teamData, ...action.payload };
    },
    setNewProject: (state, action) => {
      state.newProject = action.payload;
    },
    setProjectOptions: (state, action) => {
      state.projectOptions = action.payload;
    },
    setIsProjectModalOpen: (state, action) => {
      state.isProjectModalOpen = action.payload;
    },
    setMembers: (state, action) => {
      state.members = action.payload;
    },
    setDeleteModal: (state, action) => {
      state.deleteModal = action.payload;
    },
    deleteTeam: (state, action) => {
      state.teams = state.teams.filter(
        (team) => team.id !== Number(action.payload)
      );
      state.deleteModal = { isOpen: false, teamId: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.teams = action.payload;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.members = action.payload;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projectOptions = action.payload;
      })
      .addCase(createTeamAsync.fulfilled, (state, action) => {
        state.teams.push(action.payload);
      })
      .addCase(updateTeamAsync.fulfilled, (state, action) => {
        const index = state.teams.findIndex(
          (team) => team.id === action.payload.id
        );
        if (index !== -1) {
          state.teams[index] = action.payload;
        }
      })
      .addCase(deleteTeamAsync.fulfilled, (state, action) => {
        state.teams = state.teams.filter((team) => team.id !== action.payload);
        state.deleteModal = { isOpen: false, teamId: null };
      });
  },
});

export const {
  addTeam,
  editTeam,
  setModalState,
  setTeamData,
  setNewProject,
  setProjectOptions,
  setIsProjectModalOpen,
  setMembers,
  setDeleteModal,
  deleteTeam,
} = teamsSlice.actions;

export default teamsSlice.reducer;
