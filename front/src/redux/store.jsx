import { configureStore } from "@reduxjs/toolkit";
import sidebarReducer, { setCollapsed } from "./sidebarSlice";
import dashboardReducer from "./dashboardSlice";
import projectTaskSlice from "./projectTaskSlice";
import navbarReducer from "./navbarSlice";
import projectReducer from "./projectSlice";
import discussionReducer from "./discussionSlice";
import projectDetailReducer from "./projectDetailSlice";
import fileReducer from "./fileSlice";
import createprojectReducer from "./createprojectSlice";
import githubReducer from "./githubSlice";
import videoReducer from "./videoSlice";
import loaderReducer from "./loderSlice";
import settingsReducer from "./settingsSlice";
import teamsReducer from "./teamsSlice";
import validatorsReducer from "./validatorsSlice";
import quiz from "./quizSlice";
import quizReducer from "./quizUiSlice";
import usersReducer from "./userSlice";
import cheatReducer from "./cheatSheetSlice";
import intentReducer from "./intentSlice";
import performanceReducer from "./performanceSlice";
import socketMiddleware from "../utils/socketMiddleware";
import userprogressReducer from "./userprogressSlice";

const store = configureStore({
  reducer: {
    sidebar: sidebarReducer,
    dashboard: dashboardReducer,
    navbar: navbarReducer,
    projectTask: projectTaskSlice,
    projects: projectReducer,
    discussion: discussionReducer,
    createproject: createprojectReducer,
    loader: loaderReducer,
    settings: settingsReducer,
    teams: teamsReducer,
    projectDetail: projectDetailReducer,
    files: fileReducer,
    github: githubReducer,
    video: videoReducer,
    validators: validatorsReducer,
    users: usersReducer,
    quiz: quiz,
    intent: intentReducer,
    quizUi: quizReducer,
    cheats: cheatReducer,
    performance: performanceReducer,
    userprogress: userprogressReducer,
  },
  middleware: (getDefaultMiddleware) => {
  return getDefaultMiddleware().concat(socketMiddleware);
},
});

const handleResize = () => {
  store.dispatch(setCollapsed(window.innerWidth < 750));
};
window.addEventListener("resize", handleResize);

export default store;
