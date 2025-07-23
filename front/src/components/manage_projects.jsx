import { useEffect, useState } from "react";
import {
  Layout,
  ConfigProvider,
  Tabs,
  Avatar,
  Space,
  Card,
  Tooltip,
  Button,
  Empty,
  Typography,
  Row,
  Col,
  Flex
} from "antd";
import { Icon } from "@iconify/react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProjects, removeProject } from "../redux/projectSlice";
import { Colors } from "../config/color";
import CustomTable from "./customTable";
import ConfirmDeleteModal from "./confirm_delete_modal";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../axios";
import { usePermissions } from "../permissions";
import Loader from "./loader";
import AvatarWithFallback from "./avtarfallback";
import Notifier from "./notifier";
const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");

function ManageProjects() {
  const { Content } = Layout;
  const dispatch = useDispatch();
  const { intern_projects, employee_projects, not_assigned_projects, status } =
    useSelector((state) => state.projects);
  const colors = Colors();
  const navigate = useNavigate();
  const { hasAccess } = usePermissions();
  const { Title, Paragraph, Text } = Typography;

  const themeConfig = {
    token: {
      motion: false,
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorPrimary: colors.primary,
      colorBorderSecondary: colors.border,
    },
    components: {
      Tabs: {
        itemColor: colors.textcolor,
        itemHoverColor: colors.sidebarbg,
        itemSelectedColor: colors.sidebarbg,
      },
      Button: {
        colorPrimary: colors.primary,
        colorPrimaryHover: colors.primaryHover || colors.primary,
      },
    },
  };

  const getColor = (index) =>
    colors.avatarColors
      ? colors.avatarColors[index % colors.avatarColors.length]
      : ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae"][index % 4];

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const getProjectTypeLabel = (type) => {
    const typeMap = {
      WEB: "Web application",
      MOBILE: "Mobile application",
      DESKTOP: "Desktop application",
    };
    return typeMap[type] || "No type specified";
  };
  const employeeDataSource = employee_projects.map((project) => ({
    id: project.id,
    logo: project.logo_url,
    title: project.project_name,
    subtitle: getProjectTypeLabel(project.project_type),
    teamName: project.teams?.[0]?.team_name || "No team assigned",
    teamMembers:
      project.teams
        ?.flatMap((team) => team.users || [])
        .filter(
          (user, index, self) =>
            index === self.findIndex((u) => u.clerk_id === user.clerk_id)
        ) || [],
    originalProject: project,
  }));

  const internDataSource = intern_projects.map((project) => ({
    id: project.id,
    logo: project.logo_url,
    title: project.project_name,
    subtitle: getProjectTypeLabel(project.project_type),
    teamName: project.teams?.[0]?.team_name || "No team assigned",
    teamMembers:
      project.teams
        ?.flatMap((team) => team.users || [])
        .filter(
          (user, index, self) =>
            index === self.findIndex((u) => u.clerk_id === user.clerk_id)
        ) || [],
    originalProject: project,
  }));

  const notAssignedDataSource = not_assigned_projects.map((project) => ({
    id: project.id,
    logo: project.logo_url,
    title: project.project_name,
    subtitle: getProjectTypeLabel(project.project_type),
    teamName: "No team assigned",
    teamMembers: [],
    originalProject: project,
  }));

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const handleCreateProject = () => {
    navigate("/create-project");
  };

  const handleEditClick = (record) => {
    navigate(`/create-project?edit=true&id=${record.id}`);
  };

  const handleViewDetails = (record) => {
    navigate(`/projects/${record.id}/details`, {
      state: { project: record },
    });
  };

  const handleDeleteClick = (record) => {
    setSelectedProject(record);
    setIsModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject.id) return;

    try {
      const { data: allDiscussionsData } = await api.get("/api/discussion/get");
      const discussions = (allDiscussionsData?.data || []).filter(
        (d) => d.project_id === selectedProject.id
      );

      for (const discussion of discussions) {
        const imageUrls = discussion.image_urls || [];
        if (imageUrls.length > 0) {
          const deleteImagePromises = imageUrls.map(async (url) => {
            const filename = url.split("/uploads/")[1] || url.split("/").pop();
            if (filename) {
              try {
                await api.delete(`/api/upload/${filename}`);
              } catch {
                Notifier({
                  type: "error",
                  title: "Error",
                  description: "Failed to delete images in the discussion",
                  colors,
                });
              }
            }
          });
          await Promise.all(deleteImagePromises);
        }
      }

      const response = await api.delete(
        `/api/projects/delete/${selectedProject.id}`
      );
      if (response.status !== 200 && response.status !== 204) {
        throw new Error(`Unexpected response from server: ${response.status}`);
      }
      dispatch(removeProject(selectedProject.id));
      Notifier({
        type: "success",
        title: "Success",
        description: `${selectedProject?.title} Project Deleted successfully`,
        colors,
      });
    } catch {
      Notifier({
        type: "error",
        title: "Error",
        description: `Failed to delete the project ${selectedProject?.title}`,
        colors,
      });
    } finally {
      setIsModalVisible(false);
      setSelectedProject(null);
    }
  };

  const columns = [
    {
      title: "Project Title",
      key: "project",
      width: 200,
      render: (_, record) => {
        const fallbackText = record.title
          ? record.title.substring(0, 2).toUpperCase()
          : "";
        const hasLogo = record.logo && record.logo.length > 0;
        const avatarSrc = hasLogo
          ? import.meta.env.VITE_ENV === "dev"
            ? `${Image_URL}${record.logo}`
            : `${record.logo}`
          : null;

        return (
          <Space size="small">
            <AvatarWithFallback
              src={avatarSrc}
              alt="project logo"
              fallbackText={fallbackText}
              size="default"
              shape="circle"
              className="!mr-2"
            />
            <Space direction="vertical" size={0}>
              <Text className="!text-xm !font-semibold">{record.title}</Text>
              <Text className="!text-xs !text-gray-500">{record.subtitle}</Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Team Name",
      dataIndex: "teamName",
      key: "teamName",
      width: 150,
    },
    {
      title: "Team Members",
      dataIndex: "teamMembers",
      key: "teamMembers",
      width: 150,
      render: (members) => {
        if (!members || members.length === 0) {
          return (
            <Space className="flex items-center text-gray-500 ml-4">
              <Text> --- </Text>
            </Space>
          );
        }
        return (
          <Row align="middle">
            <Space size={0} className="overflow-hidden">
              {members.slice(0, 3).map((user, index) => (
                <Tooltip
                  key={user.clerk_id}
                  title={`${user.first_name} ${user.last_name}`}
                >
                  <Avatar
                    size={30}
                    className={`!font-bold !text-[12px] !border-2 ${
                      index === 0 ? "!ml-0" : "!-ml-3"
                    }`}
                    style={
                      user.user_image
                        ? { borderColor: colors.background }
                        : {
                            backgroundColor: getColor(index),
                            borderColor: colors.background,
                            color: colors.white,
                          }
                    }
                    src={user.user_image || undefined}
                  >
                    {!user.user_image && user.first_name?.[0]}
                  </Avatar>
                </Tooltip>
              ))}
              {members.length > 3 && (
                <Avatar
                  size={30}
                  className="!text-[12px]  !border-2 !-ml-4"
                  style={{
                    backgroundColor: colors.theme,
                    color: colors.black,
                    borderColor: colors.background,
                  }}
                >
                  +{members.length - 3}
                </Avatar>
              )}
            </Space>
          </Row>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) =>
        hasAccess("org:learning:manage") ? (
          <Space size="small">
            <Icon
              icon="mdi:eye"
              width="20"
              className={"cursor-pointer !text-blue-600"}
              onClick={() => handleViewDetails(record)}
            />
            <Icon
              icon="mdi:pencil"
              width="20"
              className={`cursor-pointer ${colors.darkGray}`}
              onClick={() => handleEditClick(record)}
            />
            <Icon
              icon="mdi:trash-can"
              width="20"
              className="cursor-pointer text-red-400"
              onClick={() => handleDeleteClick(record)}
            />
          </Space>
        ) : null,
    },
  ];

  const [activeTab, setActiveTab] = useState("1");

  const allowedTabs = [
    {
      key: "1",
      label: "Intern Projects",
      children: (
        <Card
          title="Intern Projects"
          className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
          styles={{
            body: { padding: 0 },
            head: { borderBlockStyle: "none" },
          }}
          style={{ borderColor: colors.background }}
        >
          {status === "loading" ? (
            <Row justify="center" align="middle" style={{ minHeight: 310 }}>
              <Col>
                <Loader isConstrained={true} />
              </Col>
            </Row>
          ) : internDataSource.length === 0 ? (
            <Flex className="items-center justify-center min-h-[310px]">
              <Empty
                image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                description={
                  <Text style={{ color: colors.textcolor, fontSize: 14 }}>
                    No Data Found
                  </Text>
                }
                imageStyle={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  margin: "auto",
                }}
              />
            </Flex>
          ) : (
            <CustomTable
              columns={columns}
              dataSource={internDataSource}
              rowKey="id"
              pageSize={4}
            />
          )}
        </Card>
      ),
    },
    {
      key: "2",
      label: "Employee Projects",
      children: (
        <Card
          title="Employee Projects"
          className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
          styles={{
            body: { padding: 0 },
            head: { borderBlockStyle: "none" },
          }}
          style={{ borderColor: colors.background }}
        >
          {status === "loading" ? (
            <Flex className="!items-center !justify-center min-h-[310px]">
              <Loader isConstrained={true} />
            </Flex>
          ) : employeeDataSource.length === 0 ? (
            <Flex className="items-center justify-center min-h-[310px]">
              <Empty
                image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                description={
                  <Text style={{ color: colors.textcolor, fontSize: 14 }}>
                    No Data Found
                  </Text>
                }
                imageStyle={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  margin: "auto",
                }}
              />
            </Flex>
          ) : (
            <CustomTable
              columns={columns}
              dataSource={employeeDataSource}
              rowKey="id"
              pageSize={4}
            />
          )}
        </Card>
      ),
    },
    {
      key: "3",
      label: "Team Not Assigned",
      children: (
        <Card
          title="Team Not Assigned"
          className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
          styles={{
            body: { padding: 0 },
            head: { borderBlockStyle: "none" },
          }}
          style={{ borderColor: colors.background }}
        >
          {status === "loading" ? (
            <Flex className="items-center justify-center min-h-[310px]">
              <Loader isConstrained={true} />
            </Flex>
          ) : notAssignedDataSource.length === 0 ? (
            <Flex className="items-center justify-center min-h-[310px]">
              <Empty
                image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                description={
                  <Text style={{ color: colors.textcolor, fontSize: 14 }}>
                    No Data Found
                  </Text>
                }
                imageStyle={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  margin: "auto",
                }}
              />
            </Flex>
          ) : (
            <CustomTable
              columns={columns}
              dataSource={notAssignedDataSource}
              rowKey="id"
              pageSize={4}
            />
          )}
        </Card>
      ),
    },
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="!m-0 !p-0 min-h-screen overflow-hidden">
        <Content
          className="!m-0 !p-0 h-full overflow-auto"
          style={{ backgroundColor: colors.theme }}
        >
          <Flex className="!p-4 !h-38" vertical>
            <Title className="text-3xl font-bold">Projects</Title>
            <Paragraph style={{ color: colors.modaltext }}>
              Manage Projects of Employee, Interns, and Unassigned
            </Paragraph>

            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key)}
              tabBarStyle={{ borderBottom: "none" }}
              className="border-none !mt-6"
              items={allowedTabs}
              tabBarExtraContent={
                hasAccess("org:learning:manage")
                  ? {
                      right: (
                        <Button
                          type="primary"
                          onClick={handleCreateProject}
                        >
                          <PlusOutlined /> Create Project
                        </Button>
                      ),
                    }
                  : null
              }
            />
          </Flex>
          <ConfirmDeleteModal
            visible={isModalVisible}
            onConfirm={handleConfirmDelete}
            onCancel={() => setIsModalVisible(false)}
            title="Confirm Deletion"
            description={`Are you sure you want to delete project ${selectedProject?.title}?`}
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default ManageProjects;
