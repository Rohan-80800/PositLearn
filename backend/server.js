import "dotenv/config";
import express from "express";
import routes from "./routes/index.js";
import cors from "cors";
import { requireAuth } from "@clerk/express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("joinRoom", (userId) => {
    if (userId) {
      socket.join(userId);
    }
  });

  socket.on("sendNotification", (data) => {
    socket.broadcast.emit("receiveNotification", data);
  });
});

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.get('/uploads/:folder/:file', (req, res) => {
  res.sendFile(path.join(__dirname, 'uploads', req.params.folder, req.params.file), {
    headers: {
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  });
});



app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const verifyClerkToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.CLERK_JWT_PUBLIC_KEY);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

app.get("/", (req, res) => {
  res.status(200).json({ message: "Server is running!" });
});


app.use(
  "/api",
  requireAuth({ apiKey: process.env.CLERK_API_KEY }),
  verifyClerkToken,
  routes
);

app.use(routes);

app.use((err, req, res, next) => {
  if (err.status === 401) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

server.listen(PORT, () => console.log(`Server (HTTP + WebSocket) running on port ${PORT}`));
export { io };

