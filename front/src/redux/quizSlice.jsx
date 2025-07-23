import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../axios";
import { handleApiError } from "../utils/errorHandlers";

const initialState = {
  quizzes: [],
  projectOptions: [],
  moduleOptions: [],
  videoOptions: [],
  modalState: { isOpen: false, isEdit: false, editId: null },
  quizData: {
    projectId: null,
    moduleId: null,
    videoData: [],
    title: "",
    difficulty: "medium",
    quiz_content: [],
    usedModules: [],
  },
  deleteModal: { isOpen: false, quizId: null },
  loading: false,
  error: null,
};

export const fetchQuizzes = createAsyncThunk(
  "quiz/fetchQuizzes",
  async ({ videoData, difficulty } = {}, { rejectWithValue }) => {
    try {
      if (videoData && Array.isArray(videoData)) {
        for (const { videoId, numQuestions, order_id } of videoData) {
          if (
            !videoId ||
            typeof videoId !== "string" ||
            videoId.length !== 11
          ) {
            return rejectWithValue(
              `Invalid video ID: ${videoId}. Must be an 11-character string.`
            );
          }
          if (
            !numQuestions ||
            numQuestions <= 0 ||
            !Number.isInteger(numQuestions)
          ) {
            return rejectWithValue(
              `Invalid number of questions for video ${videoId}. Must be a positive integer.`
            );
          }
          if (!order_id || !Number.isInteger(order_id)) {
            return rejectWithValue(
              `Invalid order_id for video ${videoId}. Must be an integer.`
            );
          }
        }
        if (
          !difficulty ||
          !["easy", "medium", "hard"].includes(difficulty.toLowerCase())
        ) {
          return rejectWithValue(
            `Invalid or missing difficulty. Must be one of: easy, medium, hard`
          );
        }

        const response = await api.post(`api/quizzes/generate`, {
          videoData,
          difficulty,
        });
        return {
          quizzes: response.data.quizzes || [],
          isGenerate: true,
        };
      } else {
        const response = await api.get(`api/quizzes/`);
        return {
          quizzes: response.data.data || [],
          isGenerate: false,
        };
      }
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data || {
          message: "Failed to fetch/generate quizzes",
          error: error.message,
        }
      );
    }
  }
);

export const createQuizAsync = createAsyncThunk(
  "quiz/createQuiz",
  async (quizData, { rejectWithValue }) => {
    try {
      const payload = {
        project_id: quizData.projectId,
        module_id: quizData.moduleId,
        video_ids: quizData.videoData.map((v) => v.videoId),
        title: quizData.title,
        quiz_content: quizData.quiz_content.map(
          ({
            text,
            correct,
            options,
            order_id,
            question_id,
            video_question_id,
          }) => ({
            text,
            correct,
            options,
            order_id,
            question_id,
            video_question_id,
          })
        ),
        total_points: quizData.total_points,
        level: quizData.difficulty.toUpperCase(),
      };
      const response = await api.post(`api/quizzes/create`, payload);
      const data = response.data.data;
      return {
        id: data.id,
        project_id: data.project_id,
        module_id: data.module_id,
        video_ids: data.video_ids,
        title: data.title,
        quiz_content: data.quiz_content,
        total_points: data.total_points,
        difficulty: data.level.toLowerCase(),
      };
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Failed to create quiz"
      );
    }
  }
);

export const updateQuizAsync = createAsyncThunk(
  "quiz/updateQuiz",
  async ({ id, ...quizData }, { rejectWithValue }) => {
    try {
      const payload = {
        project_id: quizData.projectId,
        module_id: quizData.moduleId,
        video_ids: quizData.videoData.map((v) => v.videoId),
        title: quizData.title,
        quiz_content: quizData.quiz_content.map(
          ({
            text,
            correct,
            options,
            order_id,
            question_id,
            video_question_id,
          }) => ({
            text,
            correct,
            options,
            order_id,
            question_id,
            video_question_id,
          })
        ),
        total_points: quizData.total_points,
        level: quizData.difficulty.toUpperCase(),
      };

      const response = await api.put(`api/quizzes/update/${id}`, payload);

      const data = response.data.data;

      return {
        id: data.id,
        project_id: data.project_id,
        module_id: data.module_id,
        video_ids: data.video_ids,
        title: data.title,
        quiz_content: data.quiz_content,
        total_points: data.total_points,
        difficulty: data.level.toLowerCase(),
        project: data.project,
        module: data.module,
      };
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Failed to update quiz"
      );
    }
  }
);

export const deleteQuizAsync = createAsyncThunk(
  "quiz/deleteQuiz",
  async (quizId, { rejectWithValue }) => {
    try {
      await api.delete(`api/quizzes/delete/${quizId}`);
      return quizId;
    } catch (error) {
      const handledError = handleApiError(error, rejectWithValue);
      if (handledError) return handledError;
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete quiz"
      );
    }
  }
);

export const fetchProjects = createAsyncThunk(
  "quiz/fetchProjects",
  async () => {
    const response = await api.get(`api/projects/`);
    return response.data.data.map((project) => ({
      id: project.id,
      project_name: project.project_name || "Unnamed Project",
    }));
  }
);

export const fetchModules = createAsyncThunk(
  "quiz/fetchModules",
  async (projectId, { getState }) => {
    if (projectId) {
      const response = await api.get(`api/quizzes/modules/${projectId}`);
      return response.data.modules.map((module) => ({
        id: module.id,
        title: module.title || "Unnamed Module",
      }));
    } else {
      const state = getState();
      const moduleIds = [
        ...new Set(state.quiz.quizzes.map((q) => q.module_id)),
      ];
      const responses = await Promise.all(
        moduleIds.map((id) =>
          api
            .get(`api/quizzes/module-info/${id}`)
            .then((res) => res.data)
            .catch(() => null)
        )
      );
      return responses.filter(Boolean).map((module) => ({
        id: module.id,
        title: module.title || "Unnamed Module",
      }));
    }
  }
);

export const fetchVideos = createAsyncThunk(
  "quiz/fetchVideos",
  async (moduleId, { rejectWithValue }) => {
    try {
      const response = await api.get(`api/quizzes/videos/${moduleId}`);
      return (response.data.videos || []).map((video) => ({
        id: video.id,
        title: video.title || "Unnamed Video",
        url: video.url,
      }));
    } catch (error) {
      console.error(
        "fetchVideos error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch videos"
      );
    }
  }
);

const quizSlice = createSlice({
  name: "quiz",
  initialState,
  reducers: {
    setModalState: (state, action) => {
      state.modalState = action.payload;
    },
    setQuizData: (state, action) => {
      state.quizData = { ...state.quizData, ...action.payload };
    },
    setDeleteModal: (state, action) => {
      state.deleteModal = action.payload;
    },
    updateVideoData: (state, action) => {
      const { index, data } = action.payload;
      if (index === undefined) {
        state.quizData.videoData.push(data);
      } else if (data === null) {
        state.quizData.videoData.splice(index, 1);
      } else {
        state.quizData.videoData[index] = {
          ...state.quizData.videoData[index],
          ...data,
        };
      }
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.loading = true;
      state.error = null;
    };

    const handleRejected = (state, action, defaultMessage) => {
      state.loading = false;
      state.error =
        action.payload?.message ||
        action.payload?.error ||
        action.payload ||
        action.error.message ||
        defaultMessage;
      console.error(`${action.type} error:`, action.payload || action.error);
    };

    const handleFulfilled = (state, action, key, transform) => {
      state.loading = false;
      if (key) {
        state[key] = transform ? transform(action.payload) : action.payload;
      }
    };

    builder
      .addCase(fetchQuizzes.pending, handlePending)
      .addCase(fetchQuizzes.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.isGenerate) {
          state.quizData.quiz_content = action.payload.quizzes;
        } else {
          state.quizzes = action.payload.quizzes.map((quiz) => ({
            ...quiz,
            difficulty: quiz.level.toLowerCase(),
            module_title: quiz.module?.title || "Unknown Module",
            project_name: quiz.project?.project_name || "Unknown Project",
          }));
        }
      })
      .addCase(fetchQuizzes.rejected, (state, action) => {
        handleRejected(state, action, "Failed to fetch quizzes");
      });

    builder
      .addCase(createQuizAsync.pending, handlePending)
      .addCase(createQuizAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.quizzes.push({
          ...action.payload,
          module_title: "Unknown Module",
          project_name: "Unknown Project",
        });
      })
      .addCase(createQuizAsync.rejected, (state, action) => {
        handleRejected(state, action, "Failed to create quiz");
      });

    builder
      .addCase(updateQuizAsync.pending, handlePending)
      .addCase(updateQuizAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.quizzes.findIndex(
          (quiz) => quiz.id === action.payload.id
        );
        if (index !== -1) {
          state.quizzes[index] = {
            ...state.quizzes[index],
            ...action.payload,
            module_title:
              action.payload.module?.title || state.quizzes[index].module_title,
            project_name:
              action.payload.project?.project_name ||
              state.quizzes[index].project_name,
          };
        }
      })
      .addCase(updateQuizAsync.rejected, (state, action) => {
        handleRejected(state, action, "Failed to update quiz");
      });

    builder
      .addCase(deleteQuizAsync.pending, handlePending)
      .addCase(deleteQuizAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.quizzes = state.quizzes.filter(
          (quiz) => quiz.id !== action.payload
        );
        state.deleteModal = { isOpen: false, quizId: null };
      })
      .addCase(deleteQuizAsync.rejected, (state, action) => {
        handleRejected(state, action, "Failed to delete quiz");
      });

    builder
      .addCase(fetchProjects.pending, handlePending)
      .addCase(fetchProjects.fulfilled, (state, action) => {
        handleFulfilled(state, action, "projectOptions");
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        handleRejected(state, action, "Failed to fetch projects");
      });

    builder
      .addCase(fetchModules.pending, handlePending)
      .addCase(fetchModules.fulfilled, (state, action) => {
        state.loading = false;
        state.moduleOptions = action.payload;
        state.videoOptions = [];
      })
      .addCase(fetchModules.rejected, (state, action) => {
        handleRejected(state, action, "Failed to fetch modules");
      });

    builder
      .addCase(fetchVideos.pending, handlePending)
      .addCase(fetchVideos.fulfilled, (state, action) => {
        handleFulfilled(state, action, "videoOptions");
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        handleRejected(state, action, "Failed to fetch videos");
      });
  },
});

export const { setModalState, setQuizData, setDeleteModal, updateVideoData } =
  quizSlice.actions;

export default quizSlice.reducer;
