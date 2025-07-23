import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchVideoDetails } from "../components/youtubeService";
import { notification } from "antd";
import api from "../axios";
import { handleApiError } from "../utils/errorHandlers";

export const fetchLearningPath = createAsyncThunk(
  "video/fetchLearningPath",
  async ({ userId, projectId }, { rejectWithValue }) => {
    try {
      const moduleResponse = await api.get(
        `api/video/modules/${userId}/${projectId}`
      );
      const data = moduleResponse.data;

      if (!data?.data) {
        return { items: [], currentLearning: {} };
      }

      let quizzes = [];
      try {
        const quizResponse = await api.get(`/api/quizzes/${projectId}`);
        quizzes = quizResponse.data.data || [];
      } catch (quizError) {
        console.error("Error fetching quizzes:", quizError);
        notification.error({
          message: "Warning",
          description: "Failed to fetch quizzes, but learning path will load.",
          placement: "bottomRight"
        });
      }
      
      let quizProgress = {};
      try {
        const progressResponse = await api.get(
          `/api/quizzes/progress/${userId}/${projectId}`
        );
        quizProgress = progressResponse.data.data || {};
      } catch (progressError) {
        console.error("Error fetching quiz progress:", progressError);
      }

      const items = data.data.map((module) => {
        const sortedVideos =
          module.video
            ?.sort((a, b) =>
              a.title.localeCompare(b.title, undefined, { numeric: true })
            )
            .map((video, index) => ({
              key: `${module.id}-${index + 1}`,
              label: video.title,
              videoId: extractVideoId(video.url),
              completed: data.module_completed?.[module.project_id]?.[
                module.id
              ]?.includes(extractVideoId(video.url)),
              type: "video"
            })) || [];
        const moduleQuizzes = quizzes
          .filter((quiz) => {
            return (
              quiz.project_id.toString() === module.project_id.toString() &&
              quiz.module_id.toString() === module.id.toString()
            );
          })
          .map((quiz) => ({
            key: `quiz-${module.id}-${quiz.id}`,
            quizId: quiz.id.toString(),
            label: quiz.title,
            quizContent: quiz.quiz_content,
            totalPoints: quiz.total_points,
            history: quiz.history || {},
            attemptNo: quiz.attempt_no || 1,
            completed: quizProgress[quiz.id]?.maxScore === 100,
            videoIds: quiz.video_ids || [],
            type: "quiz"
          }));

        const combinedItems = [];
        const processedVideoIds = new Set();
        const insertedQuizIds = new Set();

        sortedVideos.forEach((video) => {
          combinedItems.push(video);
          processedVideoIds.add(video.videoId);

          moduleQuizzes.forEach((quiz) => {
            if (
              !insertedQuizIds.has(quiz.quizId) &&
              Array.isArray(quiz.videoIds) &&
              quiz.videoIds.length === 1 &&
              quiz.videoIds[0] === video.videoId
            ) {
              combinedItems.push(quiz);
              insertedQuizIds.add(quiz.quizId);
            }
          });

          moduleQuizzes.forEach((quiz) => {
            if (
              !insertedQuizIds.has(quiz.quizId) &&
              Array.isArray(quiz.videoIds) &&
              quiz.videoIds.length > 1 &&
              quiz.videoIds.every((vid) => processedVideoIds.has(vid))
            ) {
              combinedItems.push(quiz);
              insertedQuizIds.add(quiz.quizId);
            }
          });
        });

        return {
          key: module.id.toString(),
          label: module.title,
          description: module.description || "No description available",
          projectId: module.project_id,
          children: combinedItems,
          quizzes: moduleQuizzes,
          pdf: module.file || [],
          currentLearning: data.current_learning || {},
          moduleCompleted: data.module_completed || {},
          lerningHour: data.learning_time || 0,
          notebook: data.notebook_data || {},
          projectName: data.project_name || "",
          quizResult: data.quiz_result || {},
          validator: data.validator || 0,
        };
      });

      return {
        items,
        currentLearning: data.current_learning,
        moduleCompleted: data.module_completed,
        lerningHour: data.learning_time,
        notebook: data.notebook_data,
        projectName: data.project_name,
        quizResult: data.quiz_result || {},
        validator: data.validator,
        progress_percentage: data.progress_percentage || {}
      };
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);
export const completeQuiz = createAsyncThunk(
  "video/completeQuiz",
  async (
    { clerkId, projectId , progressPercentage },
    { rejectWithValue }
  ) => {
    try {
      if (!clerkId || !projectId || !progressPercentage) {
        return rejectWithValue("Missing required fields");
      }

      const response = await api.post(
        `/api/quizzes/quizzes/complete/${clerkId}`,
        {
          projectId,
          progressPercentage
        }
      );

      return {
        projectId,
        quizId,
        learningData: response.data.learningData
      };
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

const calculateProgress = (state) => {
  const { items } = state.video;

  let totalVideos = 0;
  let totalQuizzes = 0;
  let completedVideos = 0;
  let completedQuizzes = 0;

  items.forEach((category) => {
    totalVideos += category.children.filter(
      (item) => item.type === "video"
    ).length;
    totalQuizzes += category.quizzes?.length || 0;

    const completed =
      category.moduleCompleted?.[category.projectId]?.[category.key] || [];
    completedVideos += completed.length;

    const completedQuizList =
      category.moduleCompleted?.[category.projectId]?.[category.key]?.quizzes ||
      [];
    completedQuizzes += completedQuizList.length;
  });

  const totalItems = totalVideos + totalQuizzes;
  const completedItems = completedVideos + completedQuizzes;

  return Math.min(Math.round(((completedItems + 1) / totalItems) * 100), 100);
};

const extractVideoId = (url) => {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/[^/]+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return match ? match[1] : null;
};

export const updateVideoProgress = createAsyncThunk(
  "video/updateVideoProgress",
  async (
    { clerkId, savedTime, lastBreakpoint },
    { getState, rejectWithValue }
  ) => {
    try {
      if (!clerkId) {
        return rejectWithValue("User ID is missing");
      }

      const state = getState();
      const selectedKey = state.video.selectedKey;

      if (!selectedKey) {
        notification.error({
          message: "Error",
          duration: 3,
          description: "No selected video found",
          placement: "bottomRight",
        });
        return rejectWithValue("No selected video found");
      }

      let projectId, moduleId, videoId;
      state.video.items.forEach((module) => {
        module.children.forEach((video) => {
          if (video.key === selectedKey && video.type === "video") {
            moduleId = module.key;
            projectId = module.projectId;
            videoId = video.videoId;
          }
        });
      });

      if (!projectId || !moduleId || !videoId) {
        notification.error({
          message: "Error",
          duration: 3,
          description: "Failed to determine project, module, or video ID",
          placement: "bottomRight",
        });
        return rejectWithValue(
          "Failed to determine project, module, or video ID"
        );
      }

      const response = await api.put(`api/video/progress/${clerkId}`, {
        projectId,
        moduleId,
        videoId,
        savedTime,
        lastBreakpoint,
        selectedKey,
      });

      return response.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const getVideoDetails = createAsyncThunk(
  "video/getVideoDetails",
  async (videoId) => {
    const data = await fetchVideoDetails(videoId);
    return data;
  }
);

export const completeVideo = createAsyncThunk(
  "video/completeVideo",
  async ({ clerkId, videoDuration }, { getState, rejectWithValue }) => {
    try {
      if (!clerkId) {
        return rejectWithValue("User ID is missing");
      }

      const state = getState();
      const { selectedKey, items } = state.video;

      if (!selectedKey) {
        return rejectWithValue("No selected video found");
      }

      let projectId, moduleId, videoId;
      items.forEach((module) => {
        module.children.forEach((video) => {
          if (video.key === selectedKey && video.type === "video") {
            projectId = module.projectId;
            moduleId = module.key;
            videoId = video.videoId;
          }
        });
      });

      if (!projectId || !moduleId || !videoId) {
        return rejectWithValue(
          "Failed to determine project, module, or video ID"
        );
      }

      const progressPercentage = calculateProgress(state, "video");

        const response = await api.post(`api/video/completed/${clerkId}`, {
          projectId,
          moduleId,
          videoId,
          videoDuration,
          progressPercentage,
        });

      return {
        learningData: response.data.learningData,
        projectId,
        moduleId,
        videoId
      };
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

export const saveNotebookData = createAsyncThunk(
  "notebook/saveNotebookData",
  async ({ clerkId, notesArray }, { getState, rejectWithValue }) => {
    try {
      if (!clerkId) {
        return rejectWithValue("User ID is missing");
      }

      const state = getState();
      const selectedKey = state.video.selectedKey;

      if (!selectedKey) {
        return rejectWithValue("No selected video found");
      }

      let projectId, moduleId, videoId;
      const found = state.video.items.some((module) =>
        module.children.some((video) => {
          if (video.key === selectedKey && video.type === "video") {
            moduleId = module.key;
            projectId = module.projectId;
            videoId = video.videoId;
            return true;
          }
          return false;
        })
      );

      if (!found || !projectId || !moduleId || !videoId) {
        return rejectWithValue(
          "Failed to determine project, module, or video ID"
        );
      }

      const response = await api.post(`api/video/notebook/${clerkId}`, {
        projectId,
        moduleId,
        videoId,
        value: notesArray,
      });

      return response.data;
    } catch (error) {
      return handleApiError(error, rejectWithValue);
    }
  }
);

const videoSlice = createSlice({
  name: "video",
  initialState: {
    currentVideo: null,
    loading: false,
    error: null,
    videoEnded: false,
    savedTime: 0,
    items: [],
    selectedKey: null,
    lastBreakpointIndex: 0,
    progress_percentage: {}
  },

  reducers: {
    setSelectedKey: (state, action) => {
      state.selectedKey = action.payload;
      state.savedTime = 0;
      state.lastBreakpointIndex = 0;
    },
    updateItems: (state, action) => {
      state.items = action.payload;
    },
    setVideoEnded: (state, action) => {
      state.videoEnded = action.payload;

      if (action.payload === true) {
        state.savedTime = 0;
        state.lastBreakpointIndex = 0;

        const allVideos = state.items.flatMap((module) => module.children);
        const currentVideo = allVideos.find(
          (video) => video.key === state.selectedKey && video.type === "video"
        );

        if (!currentVideo) return;

        const parentModule = state.items.find((module) =>
          module.children.some((video) => video.key === state.selectedKey)
        );

        if (!parentModule) return;

        const moduleId = parentModule.key;
        const projectId = parentModule.projectId;
        const videoId = currentVideo.videoId;

        state.items = state.items.map((module) => {
          if (module.key === moduleId && module.projectId === projectId) {
            const moduleCompleted = module.moduleCompleted || {};
            const projectCompletions = moduleCompleted[projectId] || {};
            const moduleCompletions = projectCompletions[moduleId] || [];
            return {
              ...module,
              children: module.children.map((item) => {
                if (item.key === state.selectedKey && item.type === "video") {
                  return { ...item, completed: true };
                }
                return item;
              }),
              moduleCompleted: {
                ...moduleCompleted,
                [projectId]: {
                  ...projectCompletions,
                  [moduleId]: moduleCompletions.includes(videoId)
                    ? moduleCompletions
                    : [...moduleCompletions, videoId],
                },
              },
            };
          }
          return module;
        });
        const currentIndex = allVideos.findIndex(
          (item) => item.key === state.selectedKey
        );
        if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
          state.selectedKey = allVideos[currentIndex + 1].key;
        }

        action.meta = { projectId, moduleId, videoId };
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchLearningPath.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLearningPath.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.progress_percentage = action.payload.progress_percentage;

        const { currentLearning } = action.payload;
        const currentProjectId = action.meta.arg.projectId;
        const isValidCurrentLearning =
          currentLearning &&
          currentLearning.projectId &&
          currentLearning.projectId.toString() === currentProjectId.toString();

        if (isValidCurrentLearning) {
          state.selectedKey = currentLearning.selectedKey;
          state.savedTime = currentLearning.savedTime || 0;
          state.lastBreakpointIndex = currentLearning.lastBreakpoint || 0;
        } else {
          const firstModuleWithVideos = state.items.find(
            (module) => module.children?.length > 0
          );
          const firstVideo = firstModuleWithVideos?.children[0];

          if (firstVideo) {
            state.selectedKey = firstVideo.key;
            state.savedTime = 0;
            state.lastBreakpointIndex = 0;
          }
        }
      })
      .addCase(fetchLearningPath.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch learning path";
      })

      .addCase(getVideoDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVideoDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVideo = action.payload;
        state.videoEnded = false;
        state.error = null;
      })
      .addCase(getVideoDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentVideo = null;
      })
      .addCase(completeVideo.fulfilled, (state, action) => {
        const { projectId, moduleId, videoId } = action.payload;
        if (!state.items) return;
        state.items = state.items.map((module) => {
          if (module.key === moduleId && module.projectId === projectId) {
            const moduleCompleted = module.moduleCompleted || {};
            const projectCompletions = moduleCompleted[projectId] || {};
            const moduleCompletions = projectCompletions[moduleId] || [];
            if (!moduleCompletions.includes(videoId)) {
              return {
                ...module,
                moduleCompleted: {
                  ...moduleCompleted,
                  [projectId]: {
                    ...projectCompletions,
                    [moduleId]: [...moduleCompletions, videoId],
                  },
                },
              };
            }
          }
          return module;
        });
      });
  },
});

export const { setSelectedKey, setVideoEnded, setVideoTime, updateItems } =
  videoSlice.actions;

export default videoSlice.reducer;
