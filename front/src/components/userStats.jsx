import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Space,
  Typography,
  Drawer,
  Flex,
  Button,
  ConfigProvider,
} from "antd";
import { GiftOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Bar } from "react-chartjs-2";
import { motion } from "framer-motion";
import { Colors } from "../config/color";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserData } from "../redux/userprogressSlice";
import Loader from "./loader";
import UserProfileCard from "./UserProfileCard";
import TeamProgressCard from "./TeamProgressCard"; 
import { FaBars } from "react-icons/fa";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const { Title, Text } = Typography;

const UserDashboard = () => {
  const { userId } = useParams();
  const dispatch = useDispatch();
  const colors = Colors();
  const { data: user, loading } = useSelector((state) => state.userprogress);
  const userProjects = useMemo(() => {
    if (!user?.projects) return [];
    return user.projects.map((proj) => {
      const progressEntry = user?.projectProgress?.find(
        (p) => p.projectId === proj.id
      );
      return {
        id: proj.id,
        name: proj.project_name,
        progress: progressEntry?.progress ?? 0,
      };
    });
  }, [user]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  useEffect(() => {
    const handleResize = () => {
      const smallScreen = window.innerWidth < 1025;
      setIsSmallScreen(smallScreen);
      if (!smallScreen) {
        setSidebarVisible(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserData(userId));
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (userProjects.length > 0 && !selectedProject) {
      setSelectedProject(userProjects[0].id);
    }
  }, [userProjects, selectedProject]);

  const prevUserId = useRef();

  useEffect(() => {
    if (loading || !user?.clerk_id || user.clerk_id === prevUserId.current)
      return;

    const initialProject =
      user.projects?.find((proj) =>
        user.projectProgress?.some((p) => p.projectId === proj.id)
      ) ?? user.projects?.[0];

    if (initialProject) {
      setSelectedProject(initialProject.id);
    }

    prevUserId.current = user.clerk_id;
  }, [user, loading]);

  const getProgressColor = (progress) => {
    if (progress < 50) return "red";
    if (progress < 100) return colors.warning;
    return "green";
  };

  const userProgressData = useMemo(() => {
    return {
      labels: userProjects.map((item) => item.name),
      datasets: [
        {
          label: "Progress",
          data: userProjects.map((item) => item.progress),
          backgroundColor: userProjects.map((item) =>
            getProgressColor(item.progress)
          ),
          borderRadius: 6,
          maxBarThickness: 40,
          barPercentage: 0.8,
          categoryPercentage: 0.8
        },
      ],
    };
  }, [userProjects]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.raw}%`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: colors.textcolor,
          callback: function (val) {
            const label = this.getLabelForValue(val);
            return label.length > 12 ? label.slice(0, 12) + "..." : label;
          }
        },
        grid: { color: colors.border },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: colors.textcolor,
          callback: (value) => `${value}%`,
        },
        grid: { color: colors.border },
      },
    },
  };

  if (loading || !user) return <Loader />;

  const currentProject = user.projects?.find(
    (proj) => proj.id === user.current_project_id
  );

  const statData = [
    {
      title: "Projects Completed",
      value: user.projectsCompleted || 0,
      Total: `Total Projects ${userProjects.length}`,
      icon: <GiftOutlined />,
    },
    {
      title: "Badges Earned",
      value: user.badgesEarned || 0,
      Total: `Total Badges ${user.totalPossibleBadges}`,
      icon: <UnorderedListOutlined />,
    },
    {
      title: "Modules Completed",
      value: user.totalCompletedModules || 0,
      Total: `Total Modules ${user.totalModules}`,
      icon: <GiftOutlined />,
    },
  ];

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorBorderSecondary: colors.border,
      colorPrimary: colors.primary,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
      },
      Select: {
        optionSelectedBg: colors.theme,
        colorTextPlaceholder: colors.placeholderGray,
        colorIcon: colors.textcolor,
        optionActiveBg: colors.hoverGray,
        hoverBorderColor: colors.primary,
        activeBorderColor: colors.primary,
        colorBgContainer: "transparent",
      },
      Tag: {
        colorText: colors.textcolor,
      },
    },
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <Row
        className="my-6 ml-6"
        style={{ backgroundColor: colors.theme }}
      >
        <Title
          level={3}
          className="!mb-8 !w-full"
          style={{ color: colors.textcolor }}
        >
          User Performance Dashboard
        </Title>
        {isSmallScreen && (
          <Button
            className="!mb-4 !transition-none"
            icon={<FaBars />}
            onClick={toggleSidebar}
          >
            User info
          </Button>
        )}
        <Row
          gutter={[24, 24]}
          className="!w-full"
        >
          {!isSmallScreen && (
            <Col span={6}>
              <UserProfileCard
                user={user}
                colors={colors}
                currentProject={currentProject}
              />
            </Col>
          )}

          <Col span={isSmallScreen ? 24 : 18}>
            <Row
              gutter={[16, 16]}
              style={{ marginBottom: 20 }}
            >
              {statData.map((item, index) => (
                <Col
                xs={24} sm={12} md={12} lg={12} xl={8} key={index}
                >
                  <motion.div
                    whileHover={{ y: -5, transition: { duration: 0.3 } }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card
                      hoverable
                      className="!rounded-lg !shadow-sm !h-full !border-transparent"
                      style={{ backgroundColor: colors.background }}
                    >
                      <Space
                        direction="vertical"
                        size="small"
                        className="!w-full"
                      >
                        <Text
                          strong
                          className="!text-lg"
                          style={{ color: colors.textcolor }}
                        >
                          {item.title}
                        </Text>
                        <Title
                          level={2}
                          className="!my-1"
                          style={{ color: colors.textcolor }}
                        >
                          {item.value}
                        </Title>
                        <Text style={{ color: colors.textcolor }}>
                          {item.Total}
                        </Text>
                      </Space>
                      <Row
                        justify="end"
                        align="middle"
                        className="!absolute !top-2 !right-2 !p-2 !rounded-lg"
                        style={{
                          backgroundColor: colors.secondcolor,
                          color: colors.initialtext,
                        }}
                      >
                        {React.cloneElement(item.icon, {
                          className: "!text-base !font-bold",
                          style: { color: colors.initialtext },
                        })}
                      </Row>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
            <Row gutter={[16, 16]}>
              <Col span={isSmallScreen ? 24 : 12}>
                <Card
                  title="User Project Progress"
                  className="!h-full !border-transparent"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.textcolor,
                  }}
                  styles={{
                    body: {
                      height: "calc(100% - 56px)"
                    },
                    header: {
                      color: colors.textcolor,
                      borderBottom: `1px solid ${colors.borderColor}`,
                      paddingBottom: 8,
                      marginBottom: 16
                    }
                  }}
                >
                  <Flex className="!h-75">
                    <Bar
                      data={userProgressData}
                      options={chartOptions}
                    />
                  </Flex>
                </Card>
              </Col>
              <Col span={isSmallScreen ? 24 : 12}>
                <TeamProgressCard
                  selectedProject={selectedProject}
                  setSelectedProject={setSelectedProject}
                  userProjects={userProjects}
                  colors={colors}
                  chartOptions={chartOptions}
                />
              </Col>
            </Row>
          </Col>
        </Row>
        <Drawer
          title="User Profile"
          placement="right"
          onClose={toggleSidebar}
          open={sidebarVisible && isSmallScreen}
          width={280}
          closable={false}
          styles={{
            body: {
              padding: 0
            }
          }}
        >
          <UserProfileCard
            user={user}
            colors={colors}
            currentProject={currentProject}
          />
        </Drawer>
      </Row>
    </ConfigProvider>
  );
};

export default UserDashboard;
