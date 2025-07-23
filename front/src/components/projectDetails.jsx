import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Typography,
  Avatar,
  Button,
  Space,
  Flex,
  Layout,
  Col,
} from "antd";
import { Colors } from "../config/color";
import Overviews from "../components/overviews";
import Roadmap from "./roadmap";
import Files from "../components/files";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProjectDetails,
  fetchUserBadges,
} from "../redux/projectDetailSlice";
import Loader from "../components/loader";
import { useUser } from "@clerk/clerk-react";
import { usePermissions } from "../permissions";
import defaultBadgeImage from "../assets/badge2.png";

const ProjectDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const colors = Colors();
  const { project, loading, error } = useSelector(
    (state) => state.projectDetail
  );
  const { badges } = useSelector((state) => state.projectDetail);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const { hasAccess } = usePermissions();

  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");
  const { Title, Text } = Typography;
  const { Content } = Layout;

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserBadges({ userId, projectId: id }));
    }
  }, [dispatch, userId, id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (isLoaded && id) {
      dispatch(fetchProjectDetails({ projectId: id }));
    }
  }, [isLoaded, id, dispatch]);

  useEffect(() => {
    try {
      const storedTab = localStorage.getItem("activeTab");
      if (storedTab) {
        setActiveTab(storedTab);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("activeTab", activeTab);
    } catch (e) {
      console.error("Error accessing localStorage:", e);
    }
  }, [activeTab]);
  const tabs = ["overview", "roadmap", "files"];

  if (!isLoaded) {
    return <Loader />;
  }

  if (loading) {
    return (
      <Flex className="min-h-screen !w-full items-center justify-center">
        <Loader />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </Flex>
    );
  }

  if (!project) {
    return (
      <Flex className="min-h-screen flex items-center justify-center">
        No project found
      </Flex>
    );
  }

  const { project_name, logo_url, project_type, github_repository } = project;
  const projectTitleInitials = project_name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();

  const latestBadge = badges?.projectBadgeStatus?.[id]?.latestBadge;

  return (
    <Layout className="!m-0 !p-0 min-h-screen overflow-hidden">
      <Flex
        vertical
        className="!p-5 !pb-0 shadow-md"
        style={{ background: colors.theme }}
      >
        <Flex wrap="wrap" className="flex-col sm:flex-row gap-4">
          <Flex
            align="center"
            justify="space-between"
            className="sm:justify-start gap-3 flex-shrink-0"
          >
            {logo_url ? (
              <img
                src={
                  import.meta.env.VITE_ENV === "dev"
                    ? `${Image_URL}${logo_url}`
                    : `${logo_url}`
                }
                alt="Project Logo"
                preview={false}
                className="!w-14 !h-14 rounded-md"
              />
            ) : (
              <Avatar
                style={{
                  background: colors.secondcolor,
                  color: colors.initialtext
                }}
                size={48}
                className="rounded-md text-lg font-semibold flex items-center justify-center"
              >
                {projectTitleInitials}
              </Avatar>
            )}

            {latestBadge && (
              <Col className="sm:hidden flex-shrink-0">
                <img
                  src={
                    import.meta.env.VITE_ENV === "dev"
                      ? `${Image_URL}${latestBadge.image}`
                      : `${latestBadge.image}`
                  }
                  alt="Project Badge"
                  preview={false}
                  className="!w-14 !h-14"
                  style={{
                    filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))",
                    transform: "translateY(6px)"
                  }}
                />
              </Col>
            )}
          </Flex>

          <Flex
            vertical
            className="!mt-3 sm:flex-1 min-w-0 order-1 sm:order-none"
          >
            <Title
              level={2}
              className="!font-bold !truncate !text-lg !sm:text-xl !md:text-2xl"
              style={{ color: colors.textcolor }}
            >
              {project_name} -{" "}
              <Text className="font-normal">{project_type}</Text>
            </Title>
            <Text
              className="flex flex-wrap gap-2 text-xs sm:text-sm md:text-base"
              style={{
                color: colors.textcolor,
                display: "flex",
                alignItems: "center"
              }}
            >
              <Space align="center">
                <Text
                  strong
                  style={{ color: colors.textcolor, marginRight: 4 }}
                >
                  Create Date:
                </Text>
                <Text style={{ color: colors.textcolor }}>
                  {new Date(project.start_date).toLocaleDateString("en-US")}
                </Text>
              </Space>
              <>
                <Text className="mx-2">|</Text>
                <Space align="center">
                  <Text
                    strong
                    style={{ color: colors.textcolor, marginRight: 4 }}
                  >
                    End Date:
                  </Text>
                  <Text style={{ color: colors.textcolor }}>
                    {project.end_date
                      ? new Date(project.end_date).toLocaleDateString("en-US")
                      : "-"}
                  </Text>
                </Space>
              </>
            </Text>
          </Flex>

          {latestBadge && (
            <img
              preview={false}
              src={
                latestBadge?.image
                  ? import.meta.env.VITE_ENV === "dev"
                    ? `${Image_URL}${latestBadge.image}`
                    : `${latestBadge.image}`
                  : defaultBadgeImage
              }
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultBadgeImage;
              }}
              alt="Badge"
              className="hidden sm:block flex-shrink-0 ml-auto sm:ml-2 group !w-20 !h-20 md:!w-24 md:!h-24 transform transition-transform duration-1000 ease-in-out group-hover:rotate-y-180"
            />
          )}
        </Flex>

        <Flex wrap="wrap" className="!mt-5 !gap-2">
          {tabs.map((tab) => (
            <Button
              type="text"
              key={tab}
              className={`px-3 py-2 !font-semibold transition duration-300 !border-b-2 text-center whitespace-nowrap flex-shrink-0 ${
                activeTab === tab
                  ? "text-blue-600 border-blue-900"
                  : "text-black border-transparent"
              }`}
              onClick={() => setActiveTab(tab)}
              style={{
                color: activeTab === tab ? colors.primary : undefined,
                borderBottomColor:
                  activeTab === tab ? colors.primary : undefined,
                borderRadius: "0"
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
          {hasAccess("org:learning:view") && (
            <Button
              type="primary"
              className="w-full sm:w-auto !ml-auto !mb-2 sm:mt-0"
              onClick={() => navigate(`/learning/${id}/active_learning`)}
              disabled={!project.modules || project.modules.length === 0}
              style={{
                background: colors.primary,
                borderColor: colors.primary,
                color: colors.white
              }}
            >
              Start Learning
            </Button>
          )}
        </Flex>
      </Flex>
      <Content className="break-words">
        {activeTab === "overview" && <Overviews />}
        {activeTab === "roadmap" && <Roadmap />}
        {activeTab === "files" && (
          <Files githubRepository={github_repository} />
        )}
      </Content>
    </Layout>
  );
};

export default ProjectDetails;
