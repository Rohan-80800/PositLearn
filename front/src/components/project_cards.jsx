import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Dropdown,
  Menu,
  Tooltip,
  Progress,
  ConfigProvider,
  Empty,
  Select,
  Typography,
  Divider,
  Input,
  Space,
  Flex,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  SearchOutlined,
  EllipsisOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Colors } from "../config/color";
import { fetchProjects, removeProject } from "../redux/projectSlice";
import api from "../axios";
import ConfirmDeleteModal from "./confirm_delete_modal";
import Loader from "./loader";
import { usePermissions } from "../permissions";
import AvatarWithFallback from "./avtarfallback";
import AvatarGroup from "./avtarGroup";
import Notifier from "./notifier";

const getUniqueUsersMap = (teams) => {
  const userMap = new Map();
  teams?.forEach((team) => {
    (team.users || []).forEach((user) => {
      if (user.clerk_id && !userMap.has(user.clerk_id)) {
        userMap.set(user.clerk_id, user);
      }
    });
  });
  return userMap;
};

const getStatusStyle = (progressPercentage, colors) => {
  const isCompleted = progressPercentage >= 100;
  if (!colors || !colors.statusColors) {
    console.warn(
      "Colors or statusColors is undefined. Falling back to default."
    );
    return {
      textColor: colors?.textcolor || "#000",
      progressColor: colors?.progressback || "#ccc",
    };
  }
  return (
    colors.statusColors[isCompleted ? "COMPLETED" : "IN_PROGRESS"] ||
    colors.statusColors.Default || {
      textColor: colors.textcolor,
      progressColor: colors.progressback,
    }
  );
};

const getSubtitle = (subtitle) =>
  ({
    WEB: "Web Application",
    MOBILE: "Mobile Application",
    DESKTOP: "Desktop Application",
  }[subtitle] || "Other");

const getStatus = (progressPercentage) => {
  if (progressPercentage === 0) {
    return "PENDING";
  } else if (progressPercentage > 0 && progressPercentage < 100) {
    return "IN PROGRESS";
  } else if (progressPercentage === 100) {
    return "COMPLETED";
  }
  return "PENDING";
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const Project_cards = () => {
  const { startDate, endDate } = useSelector((state) => ({
    startDate: state.sidebar.startDate,
    endDate: state.sidebar.endDate,
  }));

  const colors = Colors();
  const themeConfig = {
    token: {
      motion: false,
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBorder: colors.background,
      colorBgElevated: colors.background,
      colorPrimary: colors.primary,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
      },
      Dropdown: {
        controlItemBgHover: colors.hoverGray,
      },
      Select: {
        colorTextPlaceholder: colors.placeholderGray,
        optionSelectedBg: colors.hoverGray,
        optionActiveBg: colors.hoverGray,
        colorPrimaryHover: colors.primary,
        colorBorder: colors.border,
      },
      Input: {
        hoverBorderColor: colors.primary,
      },
    },
  };
  const dispatch = useDispatch();
  const { projects, status } = useSelector((state) => state.projects);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const navigate = useNavigate();
  const { hasAccess } = usePermissions();
  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");
  const { Title, Paragraph, Text } = Typography;

  const handleNavigate = () => {
    navigate("/create-project");
  };

  const handleCardClick = (project) => {
    navigate(`/projects/${project.id}/details`, {
      state: { project },
    });
  };

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const projectStatuses = [
    ...new Set(projects.map((project) => getStatus(project.progress_percentage.progress))),
  ];

  const handleDeleteClick = (project) => {
    setSelectedProject(project);
    setIsModalVisible(true);
  };

  const handleEditClick = (project) => {
    navigate(`/create-project?edit=true&id=${project.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject.id) return;

    try {
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
        description: `${selectedProject?.project_name} Project Deleted successfully`,
        colors,
      });
    } catch {
      Notifier({
        type: "error",
        title: "Error",
        description: `Failed to delete the project ${selectedProject?.project_name}`,
        colors,
      });
    } finally {
      setIsModalVisible(false);
      setSelectedProject(null);
    }
  };

  if (status === "loading") return <Loader />;

  const filteredProjects = projects
    .filter((project) =>
      project.project_name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((project) =>
      filter ? getStatus(project.progress_percentage.progress) === filter : true
    );

  return (
    <ConfigProvider theme={themeConfig}>
      <Flex className="!p-5 min-h-screen" vertical>
        <Row className="justify-start mb-4">
          <Col>
            <Title className="text-1xl sm:text-2xl md:text-3xl font-bold">
              Projects
            </Title>
          </Col>
        </Row>
        {projects.length > 0 && (
          <Flex className="sm:flex-row sm:items-center sm:justify-between gap-2 !mb-4">
            <Flex className="w-full sm:w-auto">
              <Space
                direction="vertical"
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "200px",
                }}
              >
                <Input
                  type="text"
                  placeholder="Search by project name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full !pl-6 pr-1 py-1.5 border rounded-md focus:outline-none placeholder-[#8da0b3]"
                  style={{
                    color: colors.textColor,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  }}
                />
                <Text
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "12px",
                  }}
                >
                  <SearchOutlined />
                </Text>
              </Space>
            </Flex>

            <Flex className="w-full sm:w-auto">
              <Select
                value={filter}
                onChange={(value) => setFilter(value)}
                className="w-[150px] !text-xs rounded-md"
                placeholder="Filter"
                optionSelectedColor
              >
                <Select.Option value="">Filter</Select.Option>
                {projectStatuses.map((status, index) => (
                  <Select.Option
                    key={index}
                    value={status}
                  >
                    {status}
                  </Select.Option>
                ))}
              </Select>
            </Flex>
          </Flex>
        )}

        {filteredProjects.length === 0 && projects.length === 0 ? (
          <Flex className="flex-col items-center justify-center">
            <Empty
              image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
              imageStyle={{
                height: "100px",

                margin: "auto",

                marginTop: "50px",
              }}
              description={
                <Text style={{ color: colors.textcolor }}>
                  No Projects Assigned
                </Text>
              }
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            />
            {hasAccess("org:learning:manage") && (
              <Row
                gutter={[16, 16]}
                className="mt-4"
              >
                <Col
                  xs={24}
                  sm={24}
                  md={12}
                  lg={8}
                  xl={6}
                >
                  <Card
                    bordered={false}
                    className="w-full h-full flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-shadow duration-200"
                    bodyStyle={{ height: "100%", minHeight: "250px" }}
                    onClick={handleNavigate}
                  >
                    <Flex className="flex-grow flex-col justify-center items-center w-full h-full">
                      <Flex
                        className="w-12 h-12 flex items-center justify-center rounded-full"
                        style={{
                          backgroundColor: colors.secondcolor,
                        }}
                      >
                        <PlusOutlined className="text-2xl text-black" />
                      </Flex>
                      <Paragraph
                        className="!mt-2 text-sm"
                        style={{
                          color: colors.textcolor,
                        }}
                      >
                        Add Project
                      </Paragraph>
                    </Flex>
                  </Card>
                </Col>
              </Row>
            )}
          </Flex>
        ) : (
          <Row
            gutter={[16, 16]}
            wrap
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr"
          >
            {filteredProjects.map((project) => {
              const progressPercentage =
                project.progress_percentage.progress || 0;
              const { progressColor } = getStatusStyle(
                progressPercentage,
                colors
              );

              const hasLogo = project.logo_url && project.logo_url.length > 0;
              const avatarSrc = hasLogo
                ? import.meta.env.VITE_ENV === "dev"
                  ? `${Image_URL}${project.logo_url}`
                  : `${project.logo_url}`
                : undefined;

              const fallbackText = project.project_name
                ? project.project_name.substring(0, 2).toUpperCase()
                : "";

              const start_date = startDate?.[project.id] || 0;
              const end_date = endDate?.[project.id] || 0;

              return (
                <Col
                  xs={24}
                  sm={24}
                  md={12}
                  lg={8}
                  xl={6}
                  key={project.id}
                >
                  <Card
                    bordered={false}
                    className="w-full h-full flex flex-col relative"
                    bodyStyle={{ padding: 0 }}
                    style={{
                      backgroundColor: colors.background,
                      colors: colors.textcolor,
                    }}
                  >
                    <Flex
                      className="cursor-pointer"
                      onClick={() => handleCardClick(project)}
                      vertical
                    >
                      <Flex className="!p-4" vertical>
                        <Flex className="items-center justify-between w-full overflow-hidden">
                          <Flex className="items-center flex-1 min-w-0">
                            <AvatarWithFallback
                              src={avatarSrc}
                              alt="project logo"
                              fallbackText={fallbackText}
                              className="!border-2 flex-shrink-0 !mr-2"
                              size="large"
                              shape="circle"
                            />
                            <Flex
                              className="flex-1 min-w-0 overflow-hidden"
                              vertical
                            >
                              <Paragraph
                                className="!font-bold !mb-0 !truncate"
                                style={{ color: colors.textcolor }}
                              >
                                {project.project_name}
                              </Paragraph>
                              <Text
                                className="text-xs !m-0 truncate"
                                style={{ color: colors.avtar }}
                              >
                                {getSubtitle(project.project_type)}
                              </Text>
                            </Flex>
                          </Flex>
                          <Flex className="!w-6" />
                        </Flex>
                        <Flex className="flex-1">
                          <Paragraph
                            className="text-[11px] leading-[17px] !mt-2.5 h-[31px] overflow-hidden text-ellipsis line-clamp-2"
                            style={{
                              color: colors.textgray,
                            }}
                          >
                            <Tooltip
                              title={
                                <Paragraph
                                  style={{
                                    display: "-webkit-box",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: 3,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxHeight: "4.5em",
                                    whiteSpace: "normal",
                                  }}
                                >
                                  {
                                    new DOMParser().parseFromString(
                                      project.description?.content || "",
                                      "text/html"
                                    ).body.innerText
                                  }
                                </Paragraph>
                              }
                            >
                              {
                                new DOMParser().parseFromString(
                                  project.description?.content || "",
                                  "text/html"
                                ).body.innerText
                              }
                            </Tooltip>
                          </Paragraph>
                        </Flex>
                        <Flex className="mt-2.5 items-center justify-between">
                          <Flex className="overflow-hidden min-h-[30px]">
                            <AvatarGroup
                              members={Array.from(getUniqueUsersMap(project.teams).values()).map(user => ({
                                name: `${user.first_name} ${user.last_name}`,
                                user_image: user.user_image,
                              }))}
                            />
                          </Flex>
                          <Text
                            className="font-bold ml-2.5 !text-[12px]"
                            style={{
                              color: getStatus(progressPercentage) === "PENDING"
                                ? colors.errorMsg
                                : progressColor
                            }}
                          >
                            {getStatus(progressPercentage)}
                          </Text>
                        </Flex>

                        <Flex className="justify-between mt-2.5">
                          <Text className="text-[10px]">Progress</Text>
                          <Text className="text-[10px]">
                            {progressPercentage}%
                          </Text>
                        </Flex>

                        <Progress
                          percent={progressPercentage}
                          showInfo={false}
                          strokeColor={progressColor}
                          trailColor={colors.progressback}
                        />
                      </Flex>

                      <Divider
                        className="border"
                        style={{ borderColor: colors.border, margin: 0 }}
                      />

                      <Row className="!grid !grid-cols-[1fr_auto_1fr] !items-center">
                        <Flex
                          className="!w-full !flex-1 !overflow-hidden !pt-2 !pb-3"
                          vertical
                        >
                          <Text
                            className="!text-xs pl-3"
                            style={{
                              color: Colors.textSecondary,
                            }}
                          >
                            Start Date
                          </Text>
                          <Text className="!text-xs !w-full !overflow-hidden !text-ellipsis pl-3 !<truncate> !whitespace-nowrap">
                            {start_date ? formatDate(start_date) : "----"}
                          </Text>
                        </Flex>

                        <Divider
                          type="vertical"
                          className="!w-[1px] !h-full !m-0"
                          style={{
                            backgroundColor: colors.border,
                          }}
                        />

                        <Flex
                          className="!flex !w-full !flex-1 !overflow-hidden !pb-3 !pl-3 !items-start"
                          vertical
                        >
                          <Text
                            className="!text-xs"
                            style={{
                              color: Colors.textSecondary,
                            }}
                          >
                            End Date
                          </Text>
                          <Text className="!text-xs !w-full !overflow-hidden !text-ellipsis !truncate !whitespace-nowrap">
                            {end_date ? formatDate(end_date) : "----"}
                          </Text>
                        </Flex>
                      </Row>
                    </Flex>
                    {hasAccess("org:learning:manage") && (
                      <Flex className="absolute top-4 right-4">
                        <Dropdown
                          overlay={
                            <Menu
                              style={{ backgroundColor: colors.background }}
                              onClick={(e) => e.domEvent.stopPropagation()}
                            >
                              <Menu.Item
                                key="1"
                                onClick={() => handleEditClick(project)}
                              >
                                Edit
                              </Menu.Item>
                              <Menu.Item
                                key="2"
                                onClick={(e) => {
                                  e.domEvent.stopPropagation();
                                  handleDeleteClick(project);
                                }}
                              >
                                Delete
                              </Menu.Item>
                            </Menu>
                          }
                          trigger={["click"]}
                        >
                          <EllipsisOutlined
                            className="text-lg cursor-pointer rotate-90"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        </Dropdown>
                      </Flex>
                    )}
                  </Card>
                  <ConfirmDeleteModal
                    visible={isModalVisible}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setIsModalVisible(false)}
                    title="Confirm Deletion"
                    description={`Are you sure you want to delete project ${selectedProject?.project_name}?`}
                  />
                </Col>
              );
            })}
          </Row>
        )}
      </Flex>
    </ConfigProvider>
  );
};

export default Project_cards;
