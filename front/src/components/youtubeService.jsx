import axios from "axios";

const API_KEY = import.meta.env.VITE_Youtube_API;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

export const fetchVideoDetails = async (videoId) => {
  try {
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: "snippet,statistics",
        id: videoId,
        key: API_KEY,
      },
    });
    return response.data.items[0];
  } catch (error) {
    console.error("Error fetching video details:", error);
    return null;
  }
};
