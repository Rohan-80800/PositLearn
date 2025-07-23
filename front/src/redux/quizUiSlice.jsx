import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { handleApiError } from "../utils/errorHandlers";
import api from "../axios";

export const fetchQuizProgress = createAsyncThunk(
  "quiz/fetchQuizProgress",
  async ({ clerkId, quizId }, { rejectWithValue }) => {
    try {
      if (!clerkId || !quizId)
        throw new Error("clerkId and quizId are required");

      const response = await api.get(
        `api/quizzes/progress/${clerkId}/${quizId}`
      );
      return { clerkId, quizId, progress: response.data.data };
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const checkQuizEligibility = createAsyncThunk(
  "quiz/checkQuizEligibility",
  async ({ clerkId, quizId }, { rejectWithValue }) => {
    try {
      if (!clerkId || !quizId)
        throw new Error("clerkId and quizId are required");

      const response = await api.get(
        `api/quizzes/eligibility/${clerkId}/${quizId}`
      );
      return { quizId, eligible: response.data.eligible };
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const submitQuiz = createAsyncThunk(
  "quiz/submitQuiz",
  async ({ clerkId, quizId, answers }, { getState, rejectWithValue }) => {
    try {
      if (!clerkId) throw new Error("User ID is missing");

      const state = getState();
      const { items } = state.video;
      let projectId, moduleId;

      const quiz = items
        .flatMap((module) => module.quizzes)
        .find((q) => q.quizId === quizId);

      if (!quiz) throw new Error("Quiz not found");

      items.forEach((module) => {
        if (module.quizzes.some((q) => q.quizId === quizId)) {
          projectId = module.projectId;
          moduleId = module.key;
        }
      });

      if (!projectId || !moduleId) {
        throw new Error("Failed to determine project or module ID");
      }

      const totalQuestions = quiz.quizContent.length;
      const correctAnswers = quiz.quizContent.reduce(
        (total, question, index) => {
          return answers[index] === question.correct ? total + 1 : total;
        },
        0
      );
      const score = Math.round((correctAnswers / totalQuestions) * 100);
      const status = score >= 70 ? "PASSED" : "FAILED";

      const quizProgress = state.quizUi.quizProgress[clerkId] || {};
      const attemptNo = (quizProgress[quizId]?.attempts || 0) + 1;

      const response = await api.post(`api/quizzes/submit/${clerkId}`, {
        quizId: parseInt(quizId, 10),
        projectId,
        moduleId,
        attemptNo,
        quizResult: { score },
        answers
      });

      return {
        clerkId,
        quizId,
        projectId,
        moduleId,
        maxScore: response.data.data.quizResult.maxScore,
        score,
        totalPoints: 100,
        attemptNo,
        answers,
        status,
        completedAt: response.data.data.completedAt
      };
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

const quizUiSlice = createSlice({
  name: "quizUi",
  initialState: {
    quizProgress: {},
    currentQuizState: null,
    eligibility: {},
    error: null
  },

  reducers: {
    startQuiz: (state, action) => {
      const { quizId, clerkId } = action.payload;
      state.quizProgress = state.quizProgress || {};
      const progress = state.quizProgress[clerkId]?.[quizId];
      const isEligible = state.eligibility[quizId]?.eligible !== false;

      if (!isEligible) {
        return;
      }

      if (progress && progress.attempts >= 1) {
        state.currentQuizState = null;
      } else {
        state.currentQuizState = {
          quizId,
          currentQuestionIndex:
            progress?.answers?.length - 1 >= 0
              ? progress.answers.length - 1
              : 0,
          answers: progress?.answers || [],
          clerkId
        };
      }
    },

    setQuizAnswer: (state, action) => {
      const { questionIndex, answer } = action.payload;
      if (state.currentQuizState) {
        state.currentQuizState.answers[questionIndex] = answer;
      }
    },

    setQuizQuestionIndex: (state, action) => {
      if (state.currentQuizState) {
        state.currentQuizState.currentQuestionIndex = action.payload;
      }
    },

    retakeQuiz: (state, action) => {
      const { quizId, clerkId } = action.payload;
      state.currentQuizState = {
        quizId,
        currentQuestionIndex: 0,
        answers: [],
        clerkId
      };
      if (state.quizProgress[clerkId] && state.quizProgress[clerkId][quizId]) {
        state.quizProgress[clerkId][quizId].answers = [];
      }
    },

    clearQuizState: (state) => {
      state.currentQuizState = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchQuizProgress.fulfilled, (state, action) => {
        const { clerkId, quizId, progress } = action.payload;
        if (progress) {
          if (!state.quizProgress[clerkId]) {
            state.quizProgress[clerkId] = {};
          }
          state.quizProgress[clerkId][quizId] = {
            maxScore: progress.maxScore,
            score: progress.score,
            totalPoints: progress.totalPoints,
            attempts: progress.attempts,
            answers: progress.answers,
            status: progress.status,
            completedAt: progress.completedAt,
            eligible: state.eligibility[quizId]?.eligible
          };
        }
      })
      .addCase(fetchQuizProgress.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(checkQuizEligibility.fulfilled, (state, action) => {
        const { quizId, eligible } = action.payload;
        state.eligibility[quizId] = { eligible };
      })
      .addCase(checkQuizEligibility.rejected, (state, action) => {
        const { clerkId, quizId } = action.meta.arg;
        if (!state.eligibility[clerkId]) {
          state.eligibility[clerkId] = {};
        }
        state.eligibility[clerkId][quizId] = action.payload.eligible;
      })
      .addCase(submitQuiz.fulfilled, (state, action) => {
        const {
          clerkId,
          quizId,
          maxScore,
          score,
          totalPoints,
          attemptNo,
          answers,
          status,
          completedAt
        } = action.payload;
        if (!state.quizProgress[clerkId]) {
          state.quizProgress[clerkId] = {};
        }
        state.quizProgress[clerkId][quizId] = {
          maxScore,
          score,
          totalPoints,
          attempts: attemptNo,
          answers,
          status,
          completedAt,
          eligible: state.eligibility[quizId]?.eligible
        };
        state.currentQuizState = null;
      })
      .addCase(submitQuiz.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  startQuiz,
  setQuizAnswer,
  setQuizQuestionIndex,
  retakeQuiz,
  clearQuizState,
} = quizUiSlice.actions;

export default quizUiSlice.reducer;
