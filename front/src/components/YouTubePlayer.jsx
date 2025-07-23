import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, Typography, Result, Flex } from "antd";
import {
  getVideoDetails,
  setVideoEnded,
  completeVideo,
  updateVideoProgress
} from "../redux/videoSlice";
import { Colors } from "../config/color";
import Loader from "./loader";
import { useUser } from "@clerk/clerk-react";

const YouTubePlayer = forwardRef(({ videoId, onEnd }, ref) => {
  const colors = Colors();
  const dispatch = useDispatch();
  const { Text } = Typography;
  const {
    currentVideo: video,
    loading,
    error,
    savedTime,
    lastBreakpointIndex,
    selectedKey,
    items
  } = useSelector((state) => state.video);
  const { user } = useUser();
  const userId = user.id;
  const playerRef = useRef(null);
  const [apiReady, setApiReady] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playerState, setPlayerState] = useState({
    isReady: false,
    isLoaded: false,
    error: null,
    showError: false
  });
  const breakpoints = useRef([]);
  const nextBreakpointIndex = useRef(lastBreakpointIndex || 0);
  const intervalRef = useRef(null);
  const prevSelectedKeyRef = useRef(null);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const errorTimeoutRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        return playerRef.current.getCurrentTime();
      }
      return 0;
    },
    getDuration: () => {
      if (
        playerRef.current &&
        typeof playerRef.current.getDuration === "function"
      ) {
        return playerRef.current.getDuration();
      }
      return 0;
    },
    isVideoValid: () => {
      return playerState.isLoaded && playerState.isReady && !error && !playerState.error && video && videoId;
    },
    hasError: () => {
      return !playerState.isLoaded || !playerState.isReady || error || playerState.error || !video || !videoId;
    },
    getErrorMessage: () => {
      if (playerState.error || !playerState.isLoaded || !playerState.isReady) {
        return "Invalid video URL. Notes cannot be created.";
      }
      if (!video || !videoId) return "No video ID found.";
      if (error) return "No learning path found.";
      if (playerState.error) return "Something went wrong, please contact admin.";
      return "An unexpected error occurred.";
    }
  }));

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onload = () => setApiReady(true);
      document.body.appendChild(tag);
    } else {
      setApiReady(true);
    }
  }, []);

  useEffect(() => {
    if (selectedKey && videoId) {
      const parentModule = items.find((module) => 
        module.children.some((child) => child.key === selectedKey)
      );
      
      if (parentModule) {
        const isCompleted = parentModule.moduleCompleted?.[parentModule.projectId]?.[parentModule.key]?.includes(videoId);
        setIsVideoCompleted(!!isCompleted);
      }
    }
  }, [selectedKey, videoId, items]);

  useEffect(() => {
    if (
      selectedKey &&
      prevSelectedKeyRef.current !== null &&
      selectedKey !== prevSelectedKeyRef.current
    ) {
      dispatch(
        updateVideoProgress({
          clerkId: userId,
          savedTime: 0,
          lastBreakpoint: 0
        })
      );
    }
    prevSelectedKeyRef.current = selectedKey;
  }, [dispatch, userId, selectedKey]);

  useEffect(() => {
    if (playerRef.current && videoDuration > 0) {
      const totalBreakpoints = Math.max(1, Math.floor(videoDuration / 4));
      breakpoints.current = Array.from(
        { length: totalBreakpoints },
        (_, i) => (videoDuration * (i + 1)) / totalBreakpoints
      );

      breakpoints.current[breakpoints.current.length - 1] = videoDuration - 2;
    }
  }, [videoDuration]);

  const checkBreakpoints = () => {
    if (!playerRef.current || isVideoCompleted) return;
    
    const currentTime = playerRef.current.getCurrentTime();
    if (nextBreakpointIndex.current < breakpoints.current.length) {
      const nextBreakpoint = breakpoints.current[nextBreakpointIndex.current];
      if (currentTime >= nextBreakpoint && currentTime <= nextBreakpoint + 1) {
        nextBreakpointIndex.current += 1;

        if (nextBreakpointIndex.current === breakpoints.current.length) {
          if (!isVideoCompleted) {
            dispatch(
              completeVideo({
                clerkId: userId,
                videoDuration: Math.round(currentTime / 60)
              })
            );
            setIsVideoCompleted(true);
          }
          dispatch(setVideoEnded(true));
          onEnd();
          stopBreakpointCheck();
        }
      }
    }
  };

  const startBreakpointCheck = () => {
    if (!intervalRef.current && !isVideoCompleted) {
      intervalRef.current = setInterval(checkBreakpoints, 200);
    }
  };

  const stopBreakpointCheck = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const onPlayerStateChange = (event) => {
    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        startBreakpointCheck();
        break;
      case window.YT.PlayerState.PAUSED:
      case window.YT.PlayerState.BUFFERING:
        stopBreakpointCheck();
        dispatch(
          updateVideoProgress({
            clerkId: userId,
            savedTime: playerRef.current.getCurrentTime(),
            lastBreakpoint: nextBreakpointIndex.current
          })
        );
        break;
      case window.YT.PlayerState.ENDED:
        stopBreakpointCheck();
        if (nextBreakpointIndex.current !== breakpoints.current.length) {
        dispatch(setVideoEnded(false));
        }
        break;
      default:
        break;
    }
  };

  const onPlayerReady = (event) => {
    setPlayerState(prev => ({ ...prev, isReady: true, isLoaded: true }));
    setVideoDuration(event.target.getDuration());
    event.target.playVideo();
  };

  useEffect(() => {
    if (videoId) {
      setPlayerState({
        isReady: false,
        isLoaded: false,
        error: null,
        showError: false
      });
      dispatch(getVideoDetails(videoId));
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    }
  }, [videoId, dispatch]);

  useEffect(() => {
    if (!apiReady || !videoId || !video) return;
    setVideoDuration(0);
    setPlayerState({
      isReady: false,
      isLoaded: false,
      error: null,
      showError: false
    });
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    const initializePlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player("player", {
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          disablekb: 0,
          start: savedTime || 0
        },
        events: {
          onReady: (event) => {
            setPlayerState(prev => ({ ...prev, isReady: true, isLoaded: true }));
            onPlayerReady(event);
            if (savedTime > 0) {
              event.target.seekTo(savedTime, true);
            }
            event.target.playVideo();
            nextBreakpointIndex.current = lastBreakpointIndex || 0;
          },
          onStateChange: onPlayerStateChange,
          onError: (error) => {
            setPlayerState(prev => ({
              ...prev,
              isLoaded: false,
              error: "Invalid video URL. Notes cannot be created."
            }));
            console.error("YouTube Player Error:", error);
          },
        }
      });
    };

    if (window.YT?.Player) {
      initializePlayer();
    } else {
      window.onYouTubeIframeAPIReady = initializePlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPlayerState({
        isReady: false,
        isLoaded: false,
        error: null,
        showError: false
      });
    };
  }, [apiReady, videoId, video]);

  useEffect(() => {
    if ((error || playerState.error) && !playerState.showError) {
      errorTimeoutRef.current = setTimeout(() => {
        setPlayerState(prev => ({ ...prev, showError: true }));
      }, 300);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error, playerState.error]);

  if (error || playerState.error) return <Text>Invalid video URL. Notes cannot be created.</Text>;

  if (loading) {
    return (
      <Card
        style={{
          borderColor: colors.background,
          margin: "10px",
          backgroundColor: colors.background,
        }}
      >
        <Flex vertical className="relative !w-full !pt-[56.25%]">
          <Flex
            align="center"
            justify="center"
            className="absolute top-0 left-0 w-full h-full"
          >
            <Loader isConstrained={true} />
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (!loading && (!video || playerState.error || error || !videoId)) {
    return (
      <Card
        style={{
          borderColor: colors.background,
          margin: "10px",
          backgroundColor: colors.background,
        }}
      >
        <Result
          status="error"
          title="Video Error"
          subTitle={playerState.error || error || "No video ID found."}
          style={{
            backgroundColor: colors.background,
            color: colors.textcolor,
            padding: "20px",
          }}
        />
      </Card>
    );
  }

  return (
    <Card
      title={video?.snippet?.title || "Untitled Video"}
      style={{
        borderColor: colors.background,
        margin: "10px",
        backgroundColor: colors.background,
      }}
    >
      <Flex vertical className="relative !w-full !pt-[56.25%]">
        <div id="player" className="absolute top-0 left-0 w-full h-full" />
      </Flex>
    </Card>
  );
});

export { YouTubePlayer };
