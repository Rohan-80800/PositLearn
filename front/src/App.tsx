import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import { useSelector } from "react-redux";
import { useUser } from "@clerk/clerk-react";
import AppRoutes from "./routes";
import "./App.css";
import "./index.css";
import Chatbot from "../chatbot/Chatbot.jsx";
import Notification from "../src/config/Notification";

interface RootState {
  navbar: {
    isDarkTheme: boolean;
  };
}

const App: React.FC = () => {
  const { isDarkTheme } = useSelector((state: RootState) => state.navbar);
  const { isSignedIn } = useUser();
  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkTheme ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Router>
        <Notification />
        <AppRoutes />
        {isSignedIn && <Chatbot />}
      </Router>
    </ConfigProvider>
  );
};

export default App;
