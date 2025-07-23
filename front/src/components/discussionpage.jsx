import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import QuillEditor from "./quillComponent";
import Loader from "./loader";
import TimeAgo from "react-timeago";
import "../App.css";
import {
  Layout,
  Menu,
  Input,
  Button,
  List,
  Avatar,
  Dropdown,
  Badge,
  ConfigProvider,
  notification,
  Modal,
  Empty,
  Typography,
  Space,
  Flex,
  Row,
  Col,
  Image
} from "antd";
import {
  CaretDownOutlined,
  SearchOutlined,
  CommentOutlined,
  MoreOutlined,
  DeleteFilled,
} from "@ant-design/icons";
import {
  setSelectedProject,
  deleteDiscussion,
  setTopFilter,
  updateScreenSize,
  setSearchText,
  fetchDiscussions,
  updateDiscussion,
  updateDiscussionTitle,
  updateDiscussionDescription,
  fetchuserProjects,
  resetProjectStatus,
} from "../redux/discussionSlice";
import { Colors } from "../config/color";
import api from "../axios";
import ConfirmDeleteModal from "./confirm_delete_modal";
import AvatarWithFallback from "./avtarfallback";

const { Text, Title, Paragraph } = Typography;
const { Sider, Content } = Layout;

const Discussionpage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = Colors();
  const { user } = useUser();
  const userId = user.id;

  const themeConfig = {
    token: {
      motion: false,
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBorder: colors.border,
      colorBgElevated: colors.background,
      colorPrimary: colors.primary,
    },
    components: {
      Dropdown: {
        controlItemBgHover: colors.hoverGray,
      },
      Modal: {
        contentBg: colors.background,
        headerBg: colors.background,
        footerBg: colors.background,
        titleColor: colors.textcolor,
      },
      Menu: {
        itemColor: colors.textcolor,
        ItemBg: colors.background,
        colorBgElevated: colors.background,
        itemHoverBg: "transparent",
        itemHoverColor: "#725fff",
        itemSelectedBg: "transparent",
        itemSelectedColor: "#725fff",
        controlItemBgActive: "transparent",
      },
      Input: {
        hoverBorderColor: colors.primary,
      },
    },
  };

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [duplicateDiscussionId, setDuplicateDiscussionId] = useState(null);
  const [deletedImages, setDeletedImages] = useState([]);
  const [validationErrors, setValidationErrors] = useState({
    title: false,
    description: false,
    duplicateTitle: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const { isDarkTheme, isMobile } = useSelector((state) => state.navbar);
  const {
    newDiscussionTitle,
    newDiscussionDescription,
    projects,
    projectStatus,
    discussions,
    selectedProject,
    topFilter,
    isSidebarVisible,
    searchText,
  } = useSelector((state) => state.discussion);
  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");

  useEffect(() => {
    if (projectStatus === "idle") {
      dispatch(fetchuserProjects());
    }
  }, [dispatch, projectStatus]);

  useEffect(() => {
    dispatch(resetProjectStatus());
  }, [projects.length]);

  useEffect(() => {
    if (selectedProject) {
      dispatch(fetchDiscussions());
    }
  }, [dispatch, selectedProject]);

  useEffect(() => {
    if (projects.length > 0) {
      const storedProjectId = localStorage.getItem("selectedProject");
      const isValidStoredProject =
        storedProjectId &&
        projects.some((p) => p.id === parseInt(storedProjectId));
      const isValidCurrentProject = projects.some(
        (p) => p.id === selectedProject
      );

      if (isValidStoredProject) {
        dispatch(setSelectedProject(parseInt(storedProjectId)));
      } else if (!isValidCurrentProject) {
        dispatch(setSelectedProject(projects[0].id));
      }
    }
  }, [dispatch, projects, selectedProject]);

  useEffect(() => {
    if (projectStatus === "succeeded" || projectStatus === "failed") {
      setIsLoading(false);
    }
  }, [projectStatus]);

  const customFormatter = (value, unit, _fix, epochSeconds) => {
    const now = new Date();
    const todayStartUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    );
    const messageDate = new Date(epochSeconds);
    const isTodayUTC = messageDate.getTime() >= todayStartUTC;

    if (unit === "second" && value < 60) {
      return "just now";
    } else if (unit === "minute") {
      return `${value} min ago`;
    } else if (isTodayUTC) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    } else {
      return messageDate.toLocaleDateString("en-GB", {
        timeZone: "UTC",
      });
    }
  };

  const handleDeleteImage = (index, isExisting = false) => {
    if (isExisting) {
      setExistingImages((prev) => {
        const imageToRemove = prev[index];
        setDeletedImages((prevDeleted) => [...prevDeleted, imageToRemove]);
        return prev.filter((_, i) => i !== index);
      });
    } else {
      setSelectedFiles((prev) => {
        const file = prev[index];
        if (file.tempUrl) URL.revokeObjectURL(file.tempUrl);
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  const handleEditClick = (id, title, description, image_urls) => {
    setSelectedDiscussionId(id);
    dispatch(updateDiscussionTitle(title));
    dispatch(updateDiscussionDescription(description));
    setSelectedFiles([]);
    setExistingImages(
      Array.isArray(image_urls) ? image_urls.filter((url) => url) : []
    );
    setIsModalVisible(true);

    setTimeout(() => {
      dispatch(updateDiscussionDescription(""));
      dispatch(updateDiscussionDescription(description));
    }, 0);
  };

  const handleDeleteClick = (id) => {
    setSelectedDiscussionId(id);
    setIsDeleteModalVisible(true);
  };

  const handleSearchChange = (e) => {
    dispatch(setSearchText(e.target.value));
  };

  const filteredDiscussions = discussions.filter((d) => {
    const discussionDate = new Date(d.created_at);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (d.projectId !== selectedProject) return false;
    if (!d.title.toLowerCase().includes(searchText.toLowerCase())) return false;

    switch (topFilter) {
      case "Today":
        return discussionDate.toDateString() === today.toDateString();
      case "This week":
        return discussionDate >= startOfWeek;
      case "This month":
        return discussionDate >= startOfMonth;
      case "All":
      default:
        return true;
    }
  });

  useEffect(() => {
    const handleResize = () => dispatch(updateScreenSize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  const collapsed = useSelector((state) => state.sidebar.collapsed);
  const topFilterOptions = ["Today", "This week", "This month", "All"];

  const resetModalState = () => {
    setIsModalVisible(false);
    setSelectedDiscussionId(null);
    dispatch(updateDiscussionTitle(""));
    dispatch(updateDiscussionDescription(""));
    setSelectedFiles((prev) => {
      prev.forEach((file) => URL.revokeObjectURL(file.tempUrl));
      return [];
    });
    setExistingImages([]);
    setDuplicateDiscussionId(null);
    setValidationErrors({
      title: false,
      description: false,
      duplicateTitle: false,
    });
  };

  const cleanHtmlContent = (html) => {
    if (!html || html === "<p></p>" || html === "<p><br></p>") return "";

    let cleaned = html
      .replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/g, "")
      .replace(/(<br\s*\/?>)+$/g, "")
      .replace(/<p>\s+$/g, "<p>")
      .replace(/\s+<\/p>/g, "</p>")
      .replace(/(<br\s*\/?>)+/g, "<br>");

    cleaned = cleaned.trim();
    return cleaned;
  };

  const hasContent = (html) => {
    if (!html || html === "<p><br></p>") {
      return selectedFiles.length > 0 || existingImages.length > 0;
    }
    const strippedText = html.replace(/<[^>]*>?/gm, "").trim();
    return (
      strippedText.length > 0 ||
      selectedFiles.length > 0 ||
      existingImages.length > 0
    );
  };

  const checkDuplicateTitle = (title) => {
    if (!title.trim()) return false;
    const duplicateDiscussion = discussions.find(
      (d) =>
        d.projectId === selectedProject &&
        d.title.toLowerCase() === title.trim().toLowerCase() &&
        d.id !== selectedDiscussionId
    );
    setDuplicateDiscussionId(
      duplicateDiscussion ? duplicateDiscussion.id : null
    );
    return !!duplicateDiscussion;
  };

  const handleCreateDiscussion = async () => {
    const cleanedDescription = cleanHtmlContent(newDiscussionDescription);
    const isDuplicate = checkDuplicateTitle(newDiscussionTitle);

    if (
      !newDiscussionTitle.trim() ||
      !hasContent(cleanedDescription) ||
      isDuplicate
    ) {
      setValidationErrors({
        title: !newDiscussionTitle.trim(),
        description: !hasContent(cleanedDescription),
        duplicateTitle: isDuplicate,
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("project_id", selectedProject);
      formData.append("title", newDiscussionTitle);
      formData.append("description", cleanedDescription);
      selectedFiles.forEach((file) => {
        formData.append("images", file.file);
      });
      await api.post("/api/discussion/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      dispatch(fetchDiscussions());
      resetModalState();
      notification.success({
        message: <Text style={{ color: colors.textcolor }}>Success</Text>,
        description: (
          <Text style={{ color: colors.textcolor }}>
            Discussion created successfully
          </Text>
        ),
        placement: "bottomRight",
        closeIcon: <Text style={{ color: colors.textcolor }}>✕</Text>,
        style: { backgroundColor: colors.background },
      });
    } catch (error) {
      const status = error?.response?.status;
      const defaultMessage = "Failed to create discussion";
      const message =
        status === 403 || status === 401
          ? "You don't have permission to create a discussion."
          : error?.response?.data?.message || defaultMessage;

      notification.error({
        message: (
          <Text style={{ color: colors.textcolor }}>
            {status === 401 || status === 403 ? "Permission Error" : "Error"}
          </Text>
        ),
        description: <Text style={{ color: colors.textcolor }}>{message}</Text>,
        placement: "bottomRight",
        closeIcon: <Text style={{ color: colors.textcolor }}>✕</Text>,
        style: { backgroundColor: colors.background },
      });
    }
  };

  const handleUpdateDiscussion = async () => {
    const cleanedDescription = cleanHtmlContent(newDiscussionDescription);
    const isDuplicate = checkDuplicateTitle(newDiscussionTitle);

    if (
      !newDiscussionTitle.trim() ||
      !hasContent(cleanedDescription) ||
      isDuplicate
    ) {
      setValidationErrors({
        title: !newDiscussionTitle.trim(),
        description: !hasContent(cleanedDescription),
        duplicateTitle: isDuplicate,
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", newDiscussionTitle);
      formData.append("description", cleanedDescription);
      if (deletedImages.length > 0) {
        formData.append("imagesToRemove", JSON.stringify(deletedImages));
      }
      selectedFiles.forEach((file) => {
        formData.append("images", file.file);
      });

      const response = await api.put(
        `api/discussion/update/${selectedDiscussionId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      dispatch(
        updateDiscussion({
          id: selectedDiscussionId,
          title: newDiscussionTitle,
          description: cleanedDescription,
          image_urls: response.data.data.image_urls,
          updated_at: new Date(),
        })
      );

      resetModalState();
    } catch (error) {
      const status = error?.response?.status;
      const defaultMessage = "Failed to update discussion";
      const message =
        status === 403 || status === 401
          ? "You don't have permission to update this discussion."
          : error?.response?.data?.message || defaultMessage;

      notification.error({
        message: (
          <Text style={{ color: colors.textcolor }}>
            {status === 401 || status === 403 ? "Permission Error" : "Error"}
          </Text>
        ),
        description: <Text style={{ color: colors.textcolor }}>{message}</Text>,
        placement: "bottomRight",
        closeIcon: <Text style={{ color: colors.textcolor }}>✕</Text>,
        style: { backgroundColor: colors.background },
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDiscussionId) return;

    try {
      await api.delete(`/api/discussion/delete/${selectedDiscussionId}`);
      dispatch(deleteDiscussion(selectedDiscussionId));
      setIsDeleteModalVisible(false);
      setSelectedDiscussionId(null);

      notification.success({
        message: <Text style={{ color: colors.textcolor }}>Success</Text>,
        description: (
          <Text style={{ color: colors.textcolor }}>
            Discussion deleted successfully
          </Text>
        ),
        placement: "bottomRight",
        closeIcon: <Text style={{ color: colors.textcolor }}>✕</Text>,
        style: { backgroundColor: colors.background },
      });
    } catch (error) {
      const status = error?.response?.status;
      const defaultMessage = "Failed to delete discussion";
      const message =
        status === 403 || status === 401
          ? "You don't have permission to delete this discussion."
          : error?.response?.data?.message || defaultMessage;

      notification.error({
        message: (
          <Text style={{ color: colors.textcolor }}>
            {status === 401 || status === 403 ? "Permission Error" : "Error"}
          </Text>
        ),
        description: <Text style={{ color: colors.textcolor }}>{message}</Text>,
        placement: "bottomRight",
        closeIcon: <Text style={{ color: colors.textcolor }}>✕</Text>,
        style: { backgroundColor: colors.background },
      });
    }
  };

  const getLogoUrl = (project, Image_URL) => {
    if (!project.logo_url || project.logo_url.length === 0) return null;
    return import.meta.env.VITE_ENV === "dev"
      ? `${Image_URL}${project.logo_url}`
      : project.logo_url;
  };

  const getFallbackText = (project) =>
    project.project_name
      ? project.project_name.substring(0, 2).toUpperCase()
      : "";

  const renderMenuItem = (project, dispatch, Image_URL) => (
    <Menu.Item
      key={project.id}
      icon={
        <AvatarWithFallback
          shape="circle"
          size={32}
          src={getLogoUrl(project, Image_URL)}
          alt={project.project_name}
          fallbackText={getFallbackText(project)}
        />
      }
      onClick={() => dispatch(setSelectedProject(project.id))}
    >
      {project.project_name}
    </Menu.Item>
  );

  return (
    <ConfigProvider theme={themeConfig}>
      {isLoading ? (
        <Loader isConstrained={false} />
      ) : (
        <Layout
          className="transition-[margin-left] duration-300 ease-in-out fixed top-[55px] left-0 right-0 bottom-0 overflow-y-auto"
          style={{
            backgroundColor: colors.theme,
            marginLeft: isMobile ? 0 : collapsed ? 70 : 210,
          }}
        >
          <Layout
            className="m-2 sm:m-3 md:m-3 lg:m-4"
            style={{ backgroundColor: colors.theme }}
          >
            {isSidebarVisible ? (
              <Sider
                className="rounded-lg p-3 "
                style={{ backgroundColor: colors.background }}
              >
                <Title level={5} className="!ml-3 !mb-2">
                  Projects
                </Title>
                <Menu
                  mode="inline"
                  selectedKeys={[selectedProject.toString()]}
                  className="!border-none"
                >
                  {projects.map((project) =>
                    renderMenuItem(project, dispatch, Image_URL)
                  )}
                </Menu>
              </Sider>
            ) : (
              <Dropdown
                overlay={
                  <Menu
                    onClick={({ key }) =>
                      dispatch(setSelectedProject(parseInt(key)))
                    }
                  >
                    {projects.map((project) =>
                      renderMenuItem(project, dispatch, Image_URL)
                    )}
                  </Menu>
                }
                trigger={["click"]}
              >
                <Button className="w-full !block !overflow-hidden text-ellipsis">
                  {selectedProject
                    ? projects.find((p) => p.id === selectedProject)
                        ?.project_name
                    : "Select Project"}{" "}
                  <CaretDownOutlined />
                </Button>
              </Dropdown>
            )}
            <Layout
              className="!p-3 !pb-0"
              style={{ backgroundColor: colors.theme }}
            >
              <Content
                className="!overflow-x-auto"
                style={{ backgroundColor: colors.theme }}
              >
                <Title level={5} className="!mb-2">
                  Discussions
                </Title>
                <Flex
                  wrap="wrap"
                  gap={8}
                  className="!mb-5 flex-col sm:flex-col md:flex-row md:items-center md:justify-between"
                >
                <Flex className="w-full md:flex-1 md:mr-4">
                  <Input
                    placeholder="Search all discussions"
                    prefix={<SearchOutlined />}
                    className="w-full focus:outline-none"
                    style={{ boxShadow: "none", borderColor: colors.border }}
                    value={searchText}
                    onChange={handleSearchChange}
                  />
                </Flex>

                  <Flex className="w-full flex gap-4 sm:flex-row md:w-auto md:flex-nowrap justify-between sm:justify-start md:justify-end">
                    <Dropdown
                      overlay={
                        <Menu
                          onClick={({ key }) => dispatch(setTopFilter(key))}
                        >
                          {topFilterOptions.map((filter) => (
                            <Menu.Item key={filter}>{filter}</Menu.Item>
                          ))}
                        </Menu>
                      }
                      trigger={["click"]}
                    >
                      <Button
                        className="w-full sm:w-[50%] md:w-[140px] truncate overflow-hidden whitespace-nowrap"
                        style={{ backgroundColor: colors.background }}
                      >
                        <Text className="truncate inline-block max-w-full">
                          {topFilter}
                        </Text>{" "}
                        <CaretDownOutlined />
                      </Button>
                    </Dropdown>

                    <Button
                      style={{
                        backgroundColor: colors.primary,
                        color: "white",
                      }}
                      className="w-full sm:w-[50%] md:w-[160px]"
                      onClick={() => setIsModalVisible(true)}
                    >
                      Create Discussion
                    </Button>
                  </Flex>
                </Flex>

                <List
                  itemLayout="vertical"
                  dataSource={[...filteredDiscussions].reverse()}
                  className={`overflow-y-auto ${
                    isSidebarVisible
                      ? "!max-h-[calc(100vh-190px)]"
                      : "!max-h-[calc(100vh-280px)]"
                  } min-h-[100px]`}
                  locale={{
                    emptyText: (
                      <Empty
                        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                        imageStyle={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          margin: "auto",
                          height: 100,
                        }}
                        description={
                          <Text style={{ color: colors.textcolor }}>
                            No discussions yet
                          </Text>
                        }
                      />
                    ),
                  }}
                  renderItem={(item) => (
                    <List.Item
                      className="!border-none cursor-pointer rounded !py-1 !px-2 !mb-2"
                      style={{
                        backgroundColor: colors.background,
                      }}
                      onClick={() => navigate(`/discussions/${item.id}`)}
                    >
                      <Flex align="flex-start" className="!w-full !mb-2 !mt-1">
                        <Avatar
                          src={item.avatar || undefined}
                          size={"small"}
                          style={{ backgroundColor: colors.primary }}
                          className="!border-none !mr-1 !justify-center !text-xs sm:!text-sm md:!text-sm lg:!text-sm !flex-shrink-0"
                        >
                          {!item.avatar && item.author
                            ? item.author.charAt(0).toUpperCase()
                            : null}
                        </Avatar>
                        <Flex
                          vertical
                          flex={1}
                          className="pl-2 overflow-hidden"
                        >
                          <Space align="baseline">
                            <Text strong className="!mb-1">
                              {item.author}
                            </Text>
                            <Text type="secondary" style={{ fontSize: "10px" }}>
                              <TimeAgo
                                date={item.time}
                                formatter={customFormatter}
                                minPeriod={60}
                              />
                              {item.time !== item.updated_at && (
                                <Text
                                  style={{
                                    marginLeft: "8px",
                                    color: colors.textgray,
                                    fontSize: "10px",
                                  }}
                                >
                                  Edited
                                </Text>
                              )}
                            </Text>
                          </Space>
                          <Paragraph
                            ellipsis={!item.expanded}
                            className="!mt-1 !m-0 !mr-5 !text-sm"
                          >
                            {item.title} 
                          </Paragraph>
                        </Flex>
                        <Flex vertical align="flex-end" className="!mr-0.5">
                          {item.user_id === userId && (
                            <Dropdown
                              overlay={
                                <Menu
                                  onClick={(e) => {
                                    e.domEvent.stopPropagation();

                                    if (e.key === "edit") {
                                      handleEditClick(
                                        item.id,
                                        item.title,
                                        item.description,
                                        item.image_urls
                                      );
                                    } else if (e.key === "delete") {
                                      handleDeleteClick(item.id);
                                    }
                                  }}
                                  style={{ backgroundColor: colors.replyBg }}
                                >
                                  <Menu.Item key="edit">Edit</Menu.Item>
                                  <Menu.Item key="delete">Delete</Menu.Item>
                                </Menu>
                              }
                              trigger={["click"]}
                              placement="bottomLeft"
                              getPopupContainer={(trigger) =>
                                trigger.parentElement
                              }
                            >
                              <Flex
                                align="center"
                                justify="center"
                                className="cursor-pointer !mb-4 transition-transform duration-150 hover:scale-120"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreOutlined className="hover:font-bold" />
                              </Flex>
                            </Dropdown>
                          )}
                          <Badge
                            size="small"
                            offset={[-5, -1]}
                            count={item.repliesCount}
                            overflowCount={99}
                            style={{
                              backgroundColor: colors.primary,
                              fontSize: "8px",
                              boxShadow: "none",
                              marginTop: item.user_id === user.id ? "0" : "8px",
                            }}
                          >
                            <Flex className="cursor-pointer">
                              <CommentOutlined
                                style={{
                                  color: colors.textgray,
                                  marginTop:
                                    item.user_id === user.id ? "0" : "9px",
                                  fontSize: "16px",
                                }}
                              />
                            </Flex>
                          </Badge>
                        </Flex>
                      </Flex>
                    </List.Item>
                  )}
                />
                <ConfirmDeleteModal
                  visible={isDeleteModalVisible}
                  onConfirm={handleConfirmDelete}
                  onCancel={() => setIsDeleteModalVisible(false)}
                  title="Confirm Discussion Deletion"
                  description="Are you sure you want to delete this discussion?"
                />
                <Modal
                  title={
                    selectedDiscussionId
                      ? "Update Discussion"
                      : "Create Discussion"
                  }
                  visible={isModalVisible}
                  onCancel={resetModalState}
                  closeIcon={<Text style={{ color: colors.textcolor }}>✕</Text>}
                  footer={[
                  <Space
                    key="footer-buttons"
                    className="mt-10 sm:mt-0 flex justify-end w-full"
                  >
                    <Button key="cancel" onClick={resetModalState}>
                      Cancel
                    </Button>
                    <Button
                      key="submit"
                      type="primary"
                      style={{ backgroundColor: colors.primary }}
                      onClick={
                        selectedDiscussionId
                          ? handleUpdateDiscussion
                          : handleCreateDiscussion
                      }
                    >
                      {selectedDiscussionId ? "Update" : "Start Discussion"}
                    </Button>
                  </Space>
                  ]}
                  styles={{
                    body: {
                      paddingBottom: window.innerWidth < 768 ? 75 : 26
                    },
                  }}
                >
                  <Space direction="vertical" size="small" className="w-full">
                    <Text strong className="!mb-0">
                      Title<Text type="danger">*</Text>
                    </Text>
                    <Input
                      className="w-full focus:outline-none"
                      style={{
                        boxShadow: "none",
                        borderColor: colors.border,
                        marginBottom: 4,
                      }}
                      placeholder="Enter title"
                      value={newDiscussionTitle}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        dispatch(updateDiscussionTitle(newTitle));
                        const isDuplicate = checkDuplicateTitle(newTitle);
                        setValidationErrors((prev) => ({
                          ...prev,
                          title: !newTitle.trim(),
                          duplicateTitle: isDuplicate,
                        }));
                      }}
                      maxLength={255}
                    />
                    <Flex justify="space-between" align="center">
                      {validationErrors.title ? (
                        <Text type="danger" className="text-xs !-mt-2">
                          Title is required
                        </Text>
                      ) : (
                        <Text className="text-xs !-mt-2 !invisible">
                          Placeholder
                        </Text>
                      )}

                      <Text type="secondary" className="text-xs !-mt-2">
                        {newDiscussionTitle.length}/{255}
                      </Text>
                    </Flex>
                    {validationErrors.duplicateTitle && (
                      <Flex align="center" gap={4} style={{ marginBottom: 8 }}>
                        <Text type="danger" className="text-xs">
                          A discussion with this title already exists.
                        </Text>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => {
                            navigate(`/discussions/${duplicateDiscussionId}`);
                            resetModalState();
                          }}
                          className="!text-xs"
                          style={{ color: colors.primary }}
                        >
                          View Discussion
                        </Button>
                      </Flex>
                    )}
                  </Space>

                  <Space direction="vertical" data-theme={isDarkTheme ? "dark" : "light"}>
                    <Text strong>
                      Description<Text type="danger">*</Text>
                    </Text>
                    <QuillEditor
                      value={newDiscussionDescription}
                      onChange={(value) => {
                        dispatch(updateDiscussionDescription(value));
                        if (hasContent(value)) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            description: false,
                          }));
                        }
                      }}
                      toolbarOptions="full"
                      onFilesChange={(files) => {
                        const newFiles = files.map((file) => ({
                          file,
                          tempUrl: URL.createObjectURL(file),
                        }));
                        setSelectedFiles((prev) => [...prev, ...newFiles]);
                      }}
                      isDarkTheme={isDarkTheme}
                      className="!mt-1"
                    />
                    {validationErrors.description && (
                      <Text type="danger" className="text-xs mt-4 mb-8">
                        Description is required
                      </Text>
                    )}
                    {(existingImages.length > 0 ||
                      selectedFiles.length > 0) && (
                      <Space direction="vertical" size="small" className="mt-2">
                        <Text>Images:</Text>
                        <Row gutter={[8, 8]}>
                          {existingImages.map((url, idx) => (
                            <Col key={url}>
                              <Flex gap={8}>
                                <Image
                                  src={
                                    import.meta.env.VITE_ENV === "dev"
                                      ? `${Image_URL}${url}`
                                      : `${url}`
                                  }
                                  alt={`Existing ${idx + 1}`}
                                  style={{ maxWidth: "50px" }}
                                />
                                <DeleteFilled
                                  className="text-red"
                                  onClick={() => handleDeleteImage(idx, true)}
                                  danger
                                />
                              </Flex>
                            </Col>
                          ))}
                          {selectedFiles.map((file, idx) => (
                            <Col key={file.tempUrl}>
                              <Flex align="center" gap={8}>
                                <Image
                                  src={file.tempUrl}
                                  alt={`Selected ${idx + 1}`}
                                  preview={false}
                                  style={{ maxWidth: "50px" }}
                                />
                                <DeleteFilled
                                  onClick={() => handleDeleteImage(idx)}
                                  danger
                                />
                              </Flex>
                            </Col>
                          ))}
                        </Row>
                      </Space>
                    )}
                  </Space>
                </Modal>
              </Content>
            </Layout>
          </Layout>
        </Layout>
      )}
    </ConfigProvider>
  );
};

export default Discussionpage;
