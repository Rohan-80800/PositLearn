import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL;

let socketInstance = null;

export const initializeSocket = async (token, userId) => {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit("joinRoom", userId);
    return socketInstance;
  }

  return new Promise((resolve, reject) => {
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    newSocket.on("connect", () => {
      newSocket.emit("joinRoom", userId);
      socketInstance = newSocket;
      resolve(newSocket);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      reject(error);
    });
  });
};

export const getSocket = () => {
  if (!socketInstance) {
    throw new Error("Socket not initialized");
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
