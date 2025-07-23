import { initializeSocket, disconnectSocket } from "../utils/socketService";
import { fetchTeams } from "../redux/teamsSlice";
import { fetchNotifications } from "../redux/navbarSlice";
import { fetchProjects } from "../redux/projectSlice";
import { fetchDashboardData } from "../redux/dashboardSlice";
import { fetchDiscussions, fetchuserProjects } from "../redux/discussionSlice";
import { fetchCheats } from "../redux/cheatSheetSlice";
import { fetchIntents } from "../redux/intentSlice";
import { fetchProjectDetails } from "../redux/createprojectSlice";
import { fetchValidators } from "../redux/validatorsSlice";
import {fetchUsers,updateUserRole} from "../redux/userSlice";
import {fetchUserBadges} from "../redux/projectDetailSlice"


const socketMiddleware = (store) => {
  return (next) => (action) => {
    if (action.type === "socket/connect") {
      const { token, userId } = action.payload;
      
      initializeSocket(token, userId)
        .then((socket) => {          
          socket.on("dataUpdated", ({ entityType }) => {
            switch (entityType) {
              case "users":
                store.dispatch(fetchUsers());
                store.dispatch(updateUserRole());
                break;
              case "projects":
                store.dispatch(fetchProjects());
                store.dispatch(fetchDashboardData());
                store.dispatch(fetchUserBadges());
                break;
              case "teams":
                store.dispatch(fetchTeams());
                store.dispatch(fetchDashboardData());
                store.dispatch(fetchProjects());
                store.dispatch(fetchuserProjects());
                break;
              case "discussions":
                store.dispatch(fetchDiscussions());
                break;
              case "notifications":
                store.dispatch(fetchNotifications());
                break;
              case "cheatsheets":
                store.dispatch(fetchCheats());
                break;
              case "intents":
                store.dispatch(fetchIntents()); 
                break;
    
              case "modules":
                store.dispatch(fetchProjectDetails());
                break;
              case "validators":
                store.dispatch(fetchValidators());
                break;
              default:
              case "dashboard":
                store.dispatch(fetchDashboardData());
                store.dispatch(fetchUserBadges());
                break;
              case "badges":
                window.dispatchEvent(new Event("badgesUpdated"));
                store.dispatch(fetchUserBadges());
                break;
            }
          });
        })
        .catch((error) => {
          console.error("Socket connection failed:", error);
        });
    }

    if (action.type === "socket/disconnect") {
      disconnectSocket();
    }

    return next(action);
  };
};

export default socketMiddleware;
