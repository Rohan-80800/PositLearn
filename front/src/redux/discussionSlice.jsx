import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../axios";

export const fetchuserProjects = createAsyncThunk(
  "projects/fetchuserProjects",
  async (rejectWithValue ) => {
    try {
      const { data } = await api.get(`/api/projects/user_project`);      
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch projects"
      );
    }
  }
);

export const fetchDiscussions = createAsyncThunk(
  "discussions/fetchDiscussions",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/discussion/get");

      const mappedDiscussions = data.data.map((d) => {
        const createdDate = new Date(d.created_at);

        const comments = d.comments.map((c) => {
          const replies = c.replies.map((r) => ({
            id: r.id,
            reply_text: r.reply_text,
            author: `${r.user.first_name} ${r.user.last_name}`,
            avatar: r.user.user_image || null,
            time: r.created_at,
            created_at: r.created_at,
            updated_at: r.updated_at,
            user_id: r.user_id,
          }));

          return {
            id: c.id,
            comment_text: c.comment_text,
            author: `${c.user.first_name} ${c.user.last_name}`,
            avatar: c.user.user_image || null,
            time: c.created_at,
            created_at: c.created_at,
            updated_at: c.updated_at,
            replies,
            user_id: c.user_id,
          };
        });

        return {
          id: d.id,
          projectId: d.project_id,
          title: d.title,
          description: d.description,
          image_urls: d.image_urls || [],
          author: `${d.user.first_name} ${d.user.last_name}`,
          avatar: d.user.user_image || null,
          time: d.created_at,
          created_at: createdDate.toISOString(),
          updated_at: d.updated_at,
          comments,
          repliesCount: comments.length,
          expanded: false,
          replyText: "",
          user_id: d.user_id,
        };
      });

      return mappedDiscussions;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch discussions"
      );
    }
  }
);

 
const initialState = {
  selectedProject: localStorage.getItem('selectedProject') 
    ? parseInt(localStorage.getItem('selectedProject')) 
    : 0, 
  searchText: "",
  discussions: [],
  projects: [],
  topFilter: "All",
  newDiscussionTitle: "", 
  newDiscussionDescription: "",
  isSidebarVisible: window.innerWidth >= 500,
  status: "idle", 
  projectStatus: "idle",
};

const discussionSlice = createSlice({
  name: "discussion",
  initialState,
  reducers: {

    resetProjectStatus: (state) => {
      state.projectStatus = "idle";
    },

    setSelectedProject: (state, action) => {
      state.selectedProject = action.payload;
      localStorage.setItem('selectedProject', action.payload);
      state.discussions = state.discussions.map((discussion) => ({
        ...discussion,
        expanded: false,
      }));
    },    
    updateDiscussionTitle: (state, action) => {
      state.newDiscussionTitle = action.payload;
    },
    updateDiscussionDescription: (state, action) => {
      state.newDiscussionDescription = action.payload;
    },
    updateDiscussion: (state, action) => {
      const { id, title, description, image_urls, updated_at } = action.payload;  
      const discussion = state.discussions.find((d) => d.id === id);
      if (discussion) {
        discussion.title = title;
        discussion.description = description;
        discussion.image_urls = image_urls || discussion.image_urls;  
        discussion.updated_at = updated_at;
      }
    },
    deleteDiscussion: (state, action) => {
      const discussionId = action.payload;
      state.discussions = state.discussions.filter(
        (discussion) => discussion.id !== discussionId
      );
    },
    setTopFilter: (state, action) => {
      state.topFilter = action.payload;
    },
    updateScreenSize: (state) => {
      state.isSidebarVisible = window.innerWidth >= 500;
    },
    setSearchText: (state, action) => {
      state.searchText = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
    .addCase(fetchuserProjects.pending, (state) => {
      state.projectStatus = "loading";
    })
    .addCase(fetchuserProjects.fulfilled, (state, { payload }) => {
      state.projectStatus = "succeeded";
      state.projects = payload;  
    })
    .addCase(fetchuserProjects.rejected, (state, { payload }) => {
      state.projectStatus = "failed";
      state.error = payload;
    })
      .addCase(fetchDiscussions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDiscussions.fulfilled, (state, { payload }) => {
        state.status = "succeeded";
        state.discussions = payload;
      })  
      .addCase(fetchDiscussions.rejected, (state, { payload }) => {
        state.status = "failed";
        state.error = payload;
      })
  },
  
});

export const {
  resetProjectStatus,
  setSelectedProject,
  updateDiscussion,
  setTopFilter,
  updateScreenSize,
  setSearchText,
  deleteDiscussion,
  updateDiscussionTitle,
  updateDiscussionDescription,
} = discussionSlice.actions;

export default discussionSlice.reducer;
