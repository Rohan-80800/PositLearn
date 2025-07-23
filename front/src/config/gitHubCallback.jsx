import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { setToken } from "../redux/githubSlice";
import {
  setLocalStorageItem,
  LOCAL_STORAGE_KEYS
} from "../components/localStorageHelper";

const GitHubCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const query = new URLSearchParams(useLocation().search);
  const token = query.get("githubToken");
  const error = query.get("error");
  const errorDescription = query.get("error_description");
  const state = query.get("state");

  useEffect(() => {

    if (!state) {
      message.error("Authentication process incomplete");
      navigate("/projects");
      return;
    }

    try {
      const decodedState = decodeURIComponent(state);

      const stateParts = decodedState.split("|");
    
      const projectId = stateParts[0] || "unknown";
      const returnUrl = stateParts[1] || `/projects/${projectId}/details`;

      let previousState = {};
      if (stateParts.length > 2) {
        try {
          previousState = JSON.parse(stateParts[2]) || {};
        } catch (e) {
          console.warn("Could not parse previous state:", e);
        }
      }

      if (error) {
        console.error("Authentication failed:", { error, errorDescription });
        message.error(`Authentication failed: ${errorDescription || error}`);
        navigate(returnUrl, {
          state: {
            ...previousState,
            project: { ...(previousState.project || {}), id: projectId }
          }
        });
        return;
      }

      if (token) {
       setLocalStorageItem(LOCAL_STORAGE_KEYS.GITHUB_TOKEN, token);
        dispatch(setToken(token));

        const combinedState = {
          ...previousState,
          project: { ...(previousState.project || {}), id: projectId },
          accessStatus: "pending"
        };
        
        navigate(returnUrl, { state: combinedState });
      } else {
        message.error("No authentication token received");
        navigate(returnUrl, {
          state: {
            ...previousState,
            project: { ...(previousState.project || {}), id: projectId }
          }
        });
      }
    } catch (error) {
      console.error("Error processing GitHub callback:", error);
      message.error("Error during authentication process");
      navigate("/projects");
    }
  }, [token, error, errorDescription, state, dispatch, navigate]);


  return <div>Authenticating with GitHub...</div>;
};

export default GitHubCallback;
