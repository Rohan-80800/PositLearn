import React, { useEffect } from "react";
import { Layout, Card, Row, Col, Typography, Space, Flex } from "antd";
import {
  GiftOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  AimOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useUser, useAuth } from "@clerk/clerk-react";
import { APP_NAME } from "../config/constants";
import { Colors } from "../config/color";
import ActiveProjects from "./ActiveProjects";
import TaskPerformance from "./TaskPerformance";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboardData } from "../redux/dashboardSlice";
import Loader from "../components/loader";
import api from "../axios";
import PerformanceTable from "../components/performance_table";
import { fetchUsers } from "../redux/performanceSlice";

const { Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const { orgRole } = useAuth();
  const colors = Colors();
  const { user } = useUser();
  const userId = user.id;
  const FirstName = user.firstName;
  const lastName = user.lastName;
  const email = user.primaryEmailAddress?.emailAddress;
  const image = user.imageUrl;
  const roleMap = {
    "org:admin": "ADMIN",
    "org:intern": "INTERN",
    "org:employee": "EMPLOYEE",
  };
  const mappedRole = roleMap[orgRole] || "EMPLOYEE";

  useEffect(() => {
    const updateUserInDB = async () => {
      try {
        await api.put(`api/user/create`, {
          clerk_id: userId,
          first_name: FirstName,
          last_name: lastName,
          email: email,
          user_image: image,
          role: mappedRole,
        });
      } catch (error) {
        console.error("Failed to update user in DB:", error);
      }
    };
    updateUserInDB();
  }, [
    user?.firstName,
    user?.lastName,
    user?.primaryEmailAddress?.emailAddress,
    user?.imageUrl,
    mappedRole,
  ]);

  const dispatch = useDispatch();
  const { projects, teams, activeTasks, productivity, projectData, status } =
    useSelector((state) => state.dashboard);
  const { userCount } = useSelector((state) => state.performance);

  useEffect(() => {
    dispatch(fetchDashboardData());
    dispatch(fetchUsers());
  }, [dispatch]);

  if (status === "loading") {
    return <Loader />;
  }

  const Data = [
    {
      title: "Projects",
      value: projects.total,
      completed: projects.completed,
      icon: <GiftOutlined />,
    },
    {
      title: "Teams",
      value: teams.total,
      icon: <TeamOutlined />,
    },
  ];

  if (mappedRole === "ADMIN") {
    Data.push(
      {
        title: "Interns Count",
        value: userCount.intern,
        icon: <UserOutlined />,
      },
      {
        title: "Employees Count",
        value: userCount.employee,
        icon: <UserOutlined />,
      }
    );
  } else {
    Data.push(
      {
        title: "Active Tasks",
        value: activeTasks || 0,
        completed: Math.round((activeTasks || 0) * 0.21),
        icon: <UnorderedListOutlined />,
      },
      {
        title: "Productivity",
        value: `${productivity || 0}%`,
        completed: "10%",
        icon: <AimOutlined />,
      }
    );
  }

  return (
    <Layout
      className="min-h-screen font-sans overflow-hidden"
      style={{ backgroundColor: colors.theme }}
    >
      <Content className="!overflow-auto" style={{ height: "100%" }}>
        <Row
          className="py-16 pb-32 text-center pt-10 sm:pt-[50px] pr-5 sm:pr-[20px] sm:pb-[120px] pl-5 sm:pl-[20px]"
          style={{ backgroundColor: colors.primary }}
        >
          <Col>
            <Title
              level={2}
              className="m-0 ml-2 text-center w-full sm:w-auto"
              style={{
                color: colors.white,
              }}
            >
              Welcome To {APP_NAME} {FirstName && `${FirstName} !`}
            </Title>
          </Col>
        </Row>

        <Flex
          vertical
          className="!relative !mt-[-100px] !px-5"
          style={{ width: "100%" }}
        >
          <Row gutter={[16, 16]}>
            {Data.map((item, index) => (
              <Col
                xs={24}
                sm={12}
                md={12}
                lg={12}
                xl={6}
                key={index}
              >
                <motion.div
                  whileHover={{ y: -5, transition: { duration: 0.3 } }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card
                    hoverable
                    className="rounded-lg shadow-sm relative p-2.5 min-h-[150px] flex flex-col justify-between"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: "transparent",
                    }}
                  >
                    <Space
                      direction="vertical"
                      size="small"
                      className="w-full"
                    >
                      <Text
                        strong
                        className="!text-[18px] break-words"
                        style={{ color: colors.textcolor }}
                      >
                        {item.title}
                      </Text>
                      <Title
                        level={2}
                        className="my-1 text-2xl break-words"
                        style={{ color: colors.textcolor }}
                      >
                        {item.value}
                      </Title>
                      {mappedRole !== "ADMIN" &&
                      item.completed !== undefined ? (
                        <Text
                          className="text-base break-words"
                          style={{ color: colors.textcolor }}
                        >
                          {item.completed} Completed
                        </Text>
                      ) : (
                        <Col style={{ height: "24px" }}/>
                      )}
                    </Space>
                    <Row
                      justify="end"
                      align="middle"
                      className="absolute top-2 right-2 p-2 rounded-lg"
                      style={{
                        backgroundColor: colors.secondcolor,
                        color: colors.initialtext,
                      }}
                    >
                      <Col>
                        {React.cloneElement(item.icon, {
                          style: {
                            strokeWidth: 10,
                            fontSize: "16px",
                            fontWeight: "bold",
                          },
                        })}
                      </Col>
                    </Row>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
          {mappedRole === "ADMIN" ? (
            <Row
              gutter={[16, 16]}
              className="mt-4"
            >
              <Col
                xs={24}
                lg={12}
              >
                <PerformanceTable type="intern" />
              </Col>
              <Col
                xs={24}
                lg={12}
              >
                <PerformanceTable type="employee" />
              </Col>
            </Row>
          ) : (
            <Row
              gutter={[16, 16]}
              className="mt-4"
            >
              <Col
                xs={24}
                lg={8}
              >
                <TaskPerformance clerkId={userId} />
              </Col>
              <Col
                xs={24}
                lg={16}
              >
                <ActiveProjects project={projectData} />
              </Col>
            </Row>
          )}
        </Flex>
      </Content>
    </Layout>
  );
};

export default Dashboard;
