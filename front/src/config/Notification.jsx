import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchNotifications } from "../redux/navbarSlice";
import 'antd/dist/reset.css';
import { useAuth } from "@clerk/clerk-react";
import { Colors } from "../config/color";
import Notifier from "../components/notifier";
import { APP_NAME } from "../config/constants";
import { initializeSocket } from "../utils/socketService";

const NotificationHandler = () => {
  const dispatch = useDispatch();
  const { getToken, userId } = useAuth();
  const colors = Colors();

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    const setupSocket = async () => {
      try {
        const token = await getToken();
        const socket = await initializeSocket(token, userId);

        if (!socket.hasListeners("newNotification")) {
          socket.on("newNotification", (senderId) => {
            if (senderId === userId) return;
            getToken()
              .then((freshToken) => {
                dispatch(fetchNotifications(freshToken));
              Notifier({
                type: "success",
                title: "New Notification",
                description: "You have new notifications. Please check your notification panel.",
                placement: "bottomRight",
                duration: 3,
                colors,
              });
              if (Notification.permission === "granted" && document.hidden) {
                new Notification(APP_NAME, {
                  body: "You have new notifications.",
                  icon: "/logo.png",
                });
              }
              });
          });

          socket.on("connect_error", () => {});
        }
      } catch {
        console.error("Error initializing Socket.IO:");
      }
    };

    setupSocket();
  }, [dispatch, getToken, userId]);

  return null;
};

export default NotificationHandler;
