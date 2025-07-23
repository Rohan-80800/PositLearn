import React,{ useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Colors } from "./config/color.jsx";
import {
  SignedIn,
  SignedOut,
  useOrganization,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import Dashboard from "./pages/dashboard";
import Cheatsheet from "./pages/cheatsheet";
import CheatsheetDetails from "./pages/CheatsheetDetails";
import CheatsheetFormPage from "./components/CreateCheatsheetForm";
import Discussions from "./pages/Discussions";
import DiscussionDetailsPage from "./components/discussionDetailsPage";
import Git from "./pages/git";
import Settings from "./pages/settings";
import Project from "./pages/project";
import CreateProject from "./components/createproject";
import GitHubCallback from "./config/gitHubCallback";
import ProjectDetails from "./components/projectDetails";
import Learning from "./components/project_learning";
import Layouts from "./components/layout";
import ClearLocalStorage from "./components/clearlocalstorage";
import ErrorComponent from "./components/errorComponent";
import ProtectedRoute from "./components/protectedRoutes";
import NoLearning from "./components/noLearning";
import CertificateVerifier from "./components/certificateVerifier";
import CertificatePage from "./pages/certificatePage";
import RestrictedAccess from "./components/restricted_access";
import BadgesPage from "./pages/badges_page";
import { Layout, Row, Col } from "antd";
import AutoSelectOrganization from "./components/AutoSelectOrganisation.jsx";
const { Content } = Layout;
import UserDashboard from "./components/userStats";

const routeConfig = [
  {
    path: "dashboard",
    component: Dashboard,
    requiredPermission: "org:projects:view",
  },
  {
    path: "user-performance/:userId",
    component: UserDashboard,
    requiredPermission: "org:user:manage",
  },
  {
    path: "projects",
    component: Project,
    requiredPermission: "org:projects:view",
  },
  {
    path: "projects/:id/details",
    component: ProjectDetails,
    requiredPermission: "org:projects:view",
  },
  {
    path: "git-github",
    component: Git,
    requiredPermission: "org:learning:view",
  },
  {
    path: "cheatsheets",
    component: Cheatsheet,
    requiredPermission: "org:cheetsheet:view",
  },
  {
    path: "cheatsheet/:id",
    component: CheatsheetDetails,
    requiredPermission: "org:cheetsheet:view",
  },
  {
    path: "/cheatsheet/new",
    component: CheatsheetFormPage,
    requiredPermission: "org:cheetsheet:manage",
  },
  {
    path: "/cheatsheet/edit/:id",
    component: CheatsheetFormPage,
    requiredPermission: "org:cheetsheet:manage",
  },
  {
    path: "discussions",
    component: Discussions,
    requiredPermission: "org:discussion:participate",
  },
  {
    path: "/discussions/:id",
    component: DiscussionDetailsPage,
    requiredPermission: "org:discussion:participate",
  },
  {
    path: "/learning/:projectId/active_learning",
    component: Learning,
    requiredPermission: "org:learning:view",
  },
  {
    path: "/learning/null/active_learning",
    component: NoLearning,
    requiredPermission: "org:learning:view",
  },
  {
    path: "/verify",
    component: CertificateVerifier,
    requiredPermission: "org:learning:view",
  },
  {
    path: "settings",
    component: Settings,
    requiredPermission: "org:settings:manage",
  },
  {
    path: "create-project",
    component: CreateProject,
    requiredPermission: "org:learning:manage",
  },
  {
    path: "auth/github/callback",
    component: GitHubCallback,
    requiredPermission: "org:projects:view",
  },
  {
    path: "achievements/badges",
    component: BadgesPage,
    requiredPermission: "org:projects:view",
  },
  {
    path: "achievements/certificates",
    component: CertificatePage,
    requiredPermission: "org:projects:view",
  },
];

const AppRoutes = () => {
  const colors = Colors();
  const { membership } = useOrganization();
  const dispatch = useDispatch();
  const { getToken, userId } = useAuth();

    useEffect(() => {
    let isMounted = true;

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (isMounted && userId && token) {
          dispatch({ type: "socket/connect", payload: { token, userId } });
        }
      } catch (err) {
        console.error("Socket connect error:", err);
      }
    };

    if (userId) {
      connectSocket();
    }

    return () => {
      isMounted = false;
      dispatch({ type: "socket/disconnect" });
    };
  }, [userId, dispatch, getToken]);


  return (
    <Routes>
      <Route path="/" element={<Navigate to="/sign-in" replace />} />
      <Route
        path="/sign-in/*"
        element={
          <Layout
            className="min-h-screen"
            style={{
              backgroundColor: colors.clerkbg,
            }}
          >
            <Content className="h-full">
              <Row
                justify="center"
                align="middle"
                className="min-h-screen px-4"
              >
                <Col className="flex justify-center">
                  <SignIn
                    fallbackRedirectUrl="/dashboard"
                    routing="path"
                    path="/sign-in"
                  />
                </Col>
              </Row>
            </Content>
          </Layout>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <Layout
            className="min-h-screen"
            style={{
              backgroundColor: colors.clerkbg,
            }}
          >
            <Content className="h-full">
              <Row
                justify="center"
                align="middle"
                className="min-h-screen px-4"
              >
                <Col className="flex justify-center">
                  <SignUp
                    fallbackRedirectUrl="/dashboard"
                    routing="path"
                    path="/sign-up"
                  />
                </Col>
              </Row>
            </Content>
          </Layout>
        }
      />
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <AutoSelectOrganization />
              {!membership ? <RestrictedAccess /> : <Layouts />}
            </SignedIn>
            <SignedOut>
              <ClearLocalStorage />
              <RedirectToSignIn RedirectUrl="/sign-in" />
            </SignedOut>
          </>
        }
      >
        <Route
          index
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
        {routeConfig.map((route) => {
          const Component = route.component;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute requiredPermission={route.requiredPermission}>
                  <Component />
                </ProtectedRoute>
              }
            />
          );
        })}
      </Route>
      <Route
        path="*"
        element={<ErrorComponent />}
      />
    </Routes>
  );
};
export default AppRoutes;
