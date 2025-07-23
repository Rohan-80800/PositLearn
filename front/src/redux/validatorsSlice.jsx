import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";

const initialState = {
  validators: [],
  availableProjects: [],
  modalState: { isOpen: false, isEdit: false, editId: null },
  validatorData: {
    name: "",
    designation: "",
    projects: [],
    signature: "",
  },
  deleteModal: { isOpen: false, validatorId: null },
  isLoading: false,
  error: null,
  selectedValidator: null,
  status: "idle",
};

export const fetchValidators = createAsyncThunk(
  "validators/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("api/validators/get");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchValidatorById = createAsyncThunk(
  "validators/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`api/validators/get/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchAvailableProjects = createAsyncThunk(
  "validators/fetchAvailableProjects",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("api/projects/");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createValidatorAsync = createAsyncThunk(
  "validators/create",
  async (validatorData, { rejectWithValue }) => {
    try {
      const response = await api.post("api/validators/create", {
        ...validatorData,
        projectIds: validatorData.projects,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateValidatorAsync = createAsyncThunk(
  "validators/update",
  async ({ id, ...validatorData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`api/validators/update/${id}`, {
        ...validatorData,
        projectIds: validatorData.projects,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteValidatorAsync = createAsyncThunk(
  "validators/delete",
  async (validatorId, { rejectWithValue }) => {
    try {
      await api.delete(`api/validators/delete/${validatorId}`);
      return validatorId;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const validatorsSlice = createSlice({
  name: "validators",
  initialState,
  reducers: {
    setModalState: (state, action) => {
      state.modalState = action.payload;
      if (!action.payload.isOpen) {
        state.error = null;
      }
    },

    setValidatorData: (state, action) => {
      state.validatorData = { ...state.validatorData, ...action.payload };
    },

    setDeleteModal: (state, action) => {
      state.deleteModal = action.payload;
    },

    resetValidatorData: (state) => {
      state.validatorData = initialState.validatorData;
      state.error = null;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchValidators.pending, (state) => {
        state.status = "loading";
        state.isLoading = true;
      })
      .addCase(fetchValidators.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.validators = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchValidators.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch validators";
        state.isLoading = false;
      })
      .addCase(fetchValidatorById.fulfilled, (state, action) => {
        state.selectedValidator = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchValidatorById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchValidatorById.rejected, (state, action) => {
        state.error = action.payload || "Failed to fetch validator by ID";
        state.isLoading = false;
      })
      .addCase(fetchAvailableProjects.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAvailableProjects.fulfilled, (state, action) => {
        const allProjects = action.payload;
        state.availableProjects = allProjects.filter(
          (project) => project.validator_id === null
        );
        state.isLoading = false;
      })
      .addCase(fetchAvailableProjects.rejected, (state, action) => {
        state.error = action.payload || "Failed to fetch available projects";
        state.isLoading = false;
      })

      .addCase(createValidatorAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createValidatorAsync.fulfilled, (state, action) => {
        state.validators.push(action.payload);
        state.modalState.isOpen = false;
        state.isLoading = false;
        state.validatorData = initialState.validatorData;
      })
      .addCase(createValidatorAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to create validator";
      })

      .addCase(updateValidatorAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateValidatorAsync.fulfilled, (state, action) => {
        const index = state.validators.findIndex(
          (v) => v.id === action.payload.id
        );
        if (index !== -1) state.validators[index] = action.payload;
        state.modalState.isOpen = false;
        state.isLoading = false;
        state.validatorData = initialState.validatorData;
      })
      .addCase(updateValidatorAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to update validator";
      })

      .addCase(deleteValidatorAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteValidatorAsync.fulfilled, (state, action) => {
        state.validators = state.validators.filter(
          (v) => v.id !== action.payload
        );
        state.deleteModal = { isOpen: false, validatorId: null };
        state.isLoading = false;
      })
      .addCase(deleteValidatorAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to delete validator";
      });
  },
});

export const {
  setModalState,
  setValidatorData,
  setDeleteModal,
  resetValidatorData,
  clearError,
} = validatorsSlice.actions;

export const selectAllValidators = (state) => state.validators.validators;
export const selectSelectedValidator = (state) =>
  state.validators.selectedValidator;
export const selectAvailableProjects = (state) =>
  state.validators.availableProjects;
export const selectModalState = (state) => state.validators.modalState;
export const selectValidatorData = (state) => state.validators.validatorData;
export const selectDeleteModal = (state) => state.validators.deleteModal;
export const selectIsLoading = (state) => state.validators.isLoading;
export const selectError = (state) => state.validators.error;
export const selectStatus = (state) => state.validators.status;

export default validatorsSlice.reducer;
