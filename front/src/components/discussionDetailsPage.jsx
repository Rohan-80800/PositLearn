import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import QuillEditor from "./quillComponent";
import TimeAgo from "react-timeago";
import "../App.css";
import {
  Layout,
  Card,
  List,
  Avatar,
  Input,
  Button,
  Dropdown,
  Menu,
  ConfigProvider,
  Modal,
  Empty,
  Row,
  Col,
  Flex,
  Space,
  Typography,
  Image,
} from "antd";
import {
  SmileOutlined,
  EllipsisOutlined,
  SendOutlined,
  DoubleLeftOutlined,
  DeleteFilled,
} from "@ant-design/icons";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import {
  fetchDiscussions,
  deleteDiscussion,
  updateDiscussion,
  fetchuserProjects,
} from "../redux/discussionSlice";
import { Colors } from "../config/color";
import api from "../axios";
import MentionInputWrapper from "./mentionInputWrapper";
import ConfirmDeleteModal from "./confirm_delete_modal";
import Loader from "./loader";
import Notifier from "./notifier";
const { Content } = Layout;
const { Paragraph, Text } = Typography;

const DiscussionDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = Colors();
  const { user } = useUser();
  const userId = user.id;

  const [replyTexts, setReplyTexts] = useState({});
  const [commentText, setCommentText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});
  const [showReplyInput, setShowReplyInput] = useState({});
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState("");
  const [deleteType, setDeleteType] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [deletedImages, setDeletedImages] = useState([]);
  const [validationErrors, setValidationErrors] = useState({
    editTitle: false,
    editDescription: false,
    editDuplicateTitle: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");
  const resetModalState = () => {
    setIsEditModalVisible(false);
    setSelectedDiscussion(null);
    setSelectedFiles([]);
    setExistingImages([]);
    setValidationErrors({
      editTitle: false,
      editDescription: false,
      editDuplicateTitle: false,
    });
  };

  const { discussions, selectedProject, status } = useSelector(
    (state) => state.discussion
  );
  const { projects, status: projectStatus } = useSelector(
    (state) => state.discussion
  );
  const discussion = discussions.find((d) => d.id === parseInt(id));
  const { isDarkTheme } = useSelector((state) => state.navbar);
  const projectName = projects.find(
    (p) => p.id === (discussion?.projectId || selectedProject)
  )?.project_name;

  useEffect(() => {
    if (projectStatus === "idle" || status === "idle") {
      dispatch(fetchDiscussions());
      dispatch(fetchuserProjects());
    } else if (status === "succeeded" && !discussion) {
      if (!(window.location.pathname === "/discussions")) {
        navigate(`/error?from=discussion&id=${id}`, { replace: true });
      }
    }
  }, [dispatch, status, projects, discussion, navigate, id, userId]);

  useEffect(() => {
    if (projectStatus === "succeeded" && discussion) {
      setIsLoading(false);
    }
  }, [projectStatus, discussion]);

  if (!discussion) {
    return null;
  }

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

  const handleAddReply = async (commentId, e) => {
    e.stopPropagation();
    const replyText = replyTexts[commentId];
    if (!replyText?.trim()) return;

    try {
      const payload = {
        comment_id: commentId,
        user_id: userId,
        reply_text: replyText.trim(),
      };

      await api.post("/api/discussion/replies/create", payload);

      dispatch(fetchDiscussions());
      setExpandedReplies((prev) => ({
        ...prev,
        [commentId]: true,
      }));
      setReplyTexts({ ...replyTexts, [commentId]: "" });
    } catch {
      Notifier({
        type: "error",
        title: "Error",
        description: "Failed to add reply",
        placement: "bottomRight",
        colors,
      });
    }
  };

  const handleDeleteDiscussionClick = (discussionId) => {
    setDeleteId(discussionId);
    setDeleteType("discussion");
    setIsDeleteModalVisible(true);
  };

  const handleDeleteCommentClick = (commentId) => {
    setDeleteType("comment");
    setDeleteId(commentId);
    setIsDeleteModalVisible(true);
  };

  const handleAddComment = async () => {
    if (!commentText?.trim()) return;

    try {
      const payload = {
        discussion_id: discussion.id,
        user_id: userId,
        comment_text: commentText.trim(),
      };

      await api.post("/api/discussion/comments/create", payload);
      dispatch(fetchDiscussions());
      setCommentText("");
    } catch {
      Notifier({
        type: "error",
        title: "Error",
        description: "Failed to add comment",
        placement: "bottomRight",
        colors,
      });
    }
  };

  const handleEditClick = (discussion) => {
    setSelectedDiscussion(discussion);
    setExistingImages(discussion.image_urls || []);
    setIsEditModalVisible(true);

    setTimeout(() => {
      setSelectedDiscussion((prev) => ({ ...prev, description: "" }));
      setSelectedDiscussion({ ...discussion });
    }, 0);
  };

  const handleReplyToggle = async (commentId) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleShowReplyInput = (commentId) => {
    setShowReplyInput((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };
  const cleanHtmlContent = (html) => {
    if (!html || html === "<p></p>" || html === "<p><br></p>") return "";

    let cleaned = html
      .replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/g, "")
      .replace(/(\s*<br\s*\/>\s*)+/g, "")
      .replace(/^(<br\s*\/>)+|(<br\s*\/>)+$/g, "");

    cleaned = cleaned.trim();
    return cleaned;
  };

  const hasContent = (html) => {
    if (!html || html === "<p></p>" || html === "<p><br></p>") {
      return selectedFiles.length > 0 || existingImages.length > 0;
    }
    const strippedText = html.replace(/<[^>]*>?/gm, "").trim();
    const hasImage = /<img[^>]+src=["'][^"']+["']/.test(html);
    return (
      strippedText.length > 0 ||
      hasImage ||
      selectedFiles.length > 0 ||
      existingImages.length > 0
    );
  };

  const checkDuplicateTitle = (title, discussionId = null) => {
    if (!title.trim()) return false;
    return discussions.some(
      (d) =>
        d.projectId === selectedProject &&
        d.title.toLowerCase() === title.trim().toLowerCase() &&
        d.id !== discussionId
    );
  };

  const handleUpdateDiscussion = async () => {
    const isTitleEmpty = !selectedDiscussion?.title?.trim();
    const isDescriptionEmpty = !hasContent(
      selectedDiscussion?.description || ""
    );
    const isDuplicateTitle = checkDuplicateTitle(
      selectedDiscussion?.title,
      selectedDiscussion?.id
    );

    setValidationErrors({
      editTitle: isTitleEmpty,
      editDescription: isDescriptionEmpty,
      editDuplicateTitle: isDuplicateTitle,
    });

    if (isTitleEmpty || isDescriptionEmpty || isDuplicateTitle) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", selectedDiscussion.title);
      formData.append(
        "description",
        cleanHtmlContent(selectedDiscussion.description)
      );
      if (deletedImages.length > 0) {
        formData.append("imagesToRemove", JSON.stringify(deletedImages));
      }
      selectedFiles.forEach((fileObj) => {
        formData.append("images", fileObj.file);
      });
      const response = await api.put(
        `/api/discussion/update/${selectedDiscussion.id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      dispatch(
        updateDiscussion({
          id: selectedDiscussion.id,
          title: selectedDiscussion.title,
          description: cleanHtmlContent(selectedDiscussion.description),
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
          ? "You don't have permission to update the discussion."
          : error?.response?.data?.message || defaultMessage;

      Notifier({
        type: "error",
        title: status === 403 || status === 401 ? "Permission Error" : "Error",
        description: message,
        placement: "bottomRight",
        colors,
      });
    }
  };

  const handleConfirmDelete = async (type, id) => {
    if (!type || !id) return;

    try {
      if (type === "discussion") {
        await api.delete(`/api/discussion/delete/${id}`);
        dispatch(deleteDiscussion(id));
        navigate("/discussions");
      } else if (type === "comment") {
        await api.delete(`/api/discussion/comments/delete/${id}`);
        dispatch(fetchDiscussions());
      } else if (type === "reply") {
        await api.delete(`/api/discussion/replies/delete/${id}`);
        dispatch(fetchDiscussions());
      }
      setIsDeleteModalVisible(false);
      setDeleteType(null);
      setDeleteId(null);

      Notifier({
        type: "success",
        title: "Success",
        description: `${
          type === "discussion"
            ? "Discussion"
            : type === "comment"
            ? "Comment"
            : "Reply"
        } deleted successfully`,
        placement: "bottomRight",
        colors,
      });
    } catch (error) {
      const status = error?.response?.status;
      const isPermissionError = status === 403 || status === 401;
      const fallbackType =
        deleteType === "discussion"
          ? "discussion"
          : deleteType === "comment"
          ? "comment"
          : "reply";

      const defaultMessage = `Failed to delete ${fallbackType}`;
      const message = isPermissionError
        ? `You don't have permission to delete the ${fallbackType}.`
        : error?.response?.data?.message || defaultMessage;

      Notifier({
        type: "error",
        title: isPermissionError ? "Permission Error" : "Error",
        description: message,
        placement: "bottomRight",
        colors,
      });
    }
  };

  const handleUpdateComment = async (commentId, updatedText) => {
    if (!updatedText.trim()) {
      Notifier({
        type: "error",
        title: "Error",
        description: "Empty comment",
        placement: "bottomRight",
        colors,
      });
      return;
    }

    try {
      await api.put(`/api/discussion/comments/update/${commentId}`, {
        comment_text: updatedText.trim(),
      });
      dispatch(fetchDiscussions());
    } catch {
      Notifier({
        type: "error",
        title: "Error",
        description: "Failed to update comment",
        placement: "bottomRight",
        colors,
      });
    }
  };

  const handleUpdateReply = async (replyId) => {
    if (!editedReplyText.trim()) {
      Notifier({
        type: "error",
        title: "Error",
        description: "Empty reply",
        placement: "bottomRight",
        colors,
      });
      return;
    }

    try {
      await api.put(`/api/discussion/replies/update/${replyId}`, {
        reply_text: editedReplyText.trim(),
      });

      dispatch(fetchDiscussions());

      setEditingReplyId(null);
      setEditedReplyText("");
    } catch {
      Notifier({
        type: "error",
        title: "Error",
        description: "Empty reply",
        placement: "bottomRight",
        colors,
      });
    }
  };

  const themeConfig = {
    token: {
      motion: false,
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBorder: colors.border,
      colorBgElevated: colors.background,
    },
    components: {
      Dropdown: {
        controlItemBgHover: colors.hoverGray,
      },
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.border,
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
        controlOutline: "none",
      },
    },
  };

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

  const EmojiPicker = ({ onSelect }) => {
    const [open, setOpen] = useState(false);

    return (
      <Flex vertical>
        <Dropdown
          open={open}
          onOpenChange={(flag) => setOpen(flag)}
          trigger={["click"]}
          placement="topLeft"
          dropdownRender={() => (
            <Picker
              data={data}
              previewPosition="none"
              perLine={8}
              emojiSize={18}
              theme={isDarkTheme ? "dark" : "light"}
              onEmojiSelect={(emoji) => {
                onSelect(emoji.native);
                setOpen(false);
              }}
            />
          )}
        >
          <Button
            type="text"
            onClick={(e) => e.stopPropagation()}
            icon={
              <SmileOutlined
                className="text-sm !cursor-pointer"
                style={{ color: colors.textcolor }}
              />
            }
          />
        </Dropdown>
      </Flex>
    );
  };

  const renderTextWithMentions = (text) => {
    if (!text) return text;

    const parts = text.split(/(@\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.match(/@\*\*[^*]+\*\*/)) {
        const username = part.replace("@**", "").replace("**", "");
        return (
          <Text
            key={index}
            className="!text-[12px] !sm:text-xs !md:text-xs !lg:text-xs text-[colors.initialtext] !px-1 !py-[2px] !rounded font-bold"
            style={{ backgroundColor: colors.secondcolor }}
          >
            @{username}
          </Text>
        );
      }
      return (
        <Text
          key={index}
          className="!text-[15px] !sm:text-sm !md:text-sm !lg:text-sm"
        >
          {part}
        </Text>
      );
    });
  };

  return (
    <ConfigProvider theme={themeConfig}>
      {isLoading ? (
        <Loader isConstrained={false} />
      ) : (
        <Layout>
          <Content
            className="!p-[24px] !border-l !border-t"
            style={{
              borderColor: colors.transparent,
              backgroundColor: colors.theme,
            }}
          >
            <Row
              className="mb-4 px-1"
              style={{ borderColor: colors.border, color: colors.textcolor }}
            >
              <Col span={24}>
                <Typography.Title
                  level={1}
                  className="!mb-0"
                  style={{ fontSize: "24px" }}
                >
                  {discussion.title}
                </Typography.Title>
              </Col>
            </Row>

            <Flex
              align="center"
              className="!mb-2"
              style={{ borderColor: colors.border, color: colors.textcolor }}
            >
              <Button
                type="text"
                icon={<DoubleLeftOutlined />}
                onClick={() => navigate("/discussions")}
                style={{ color: colors.textgray, background: "none" }}
                className="!justify-start"
                size="small"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = colors.textgray)
                }
              />
              <Text style={{ color: colors.textgray, fontSize: "15px" }}>
                {projectName}
              </Text>
            </Flex>
            <Card
              className={`!mt-3 !border ${
                isDarkTheme ? "!border-gray-600" : "!border-gray-300"
              }`}
              style={{
                marginBottom: "16px",
                backgroundColor: colors.background,
              }}
              bodyStyle={{ padding: "8px 15px" }}
            >
              <Flex align="center" justify="space-between">
                <Flex align="center" gap="small">
                  <Avatar
                    src={discussion.avatar || undefined}
                    size={"small"}
                    style={{ backgroundColor: colors.primary }}
                    className="!border-none !mr-[8px] !justify-center !text-xs sm:!text-sm md:!text-sm lg:!text-sm !flex-shrink-0"
                  >
                    {!discussion.avatar && discussion.author
                      ? discussion.author.charAt(0).toUpperCase()
                      : null}
                  </Avatar>

                  <Space
                    align="baseline"
                    size="middle"
                    style={{ color: colors.textcolor }}
                  >
                    <Text className="!font-bold text-[13px] sm:text-sm md:text-sm lg:text-sm !mb-1">
                      {discussion.author}
                    </Text>
                    <Text
                      style={{
                        color: colors.textgray,
                        fontSize: "12px",
                      }}
                    >
                      <TimeAgo
                        date={discussion.time}
                        formatter={customFormatter}
                        minPeriod={60}
                      />
                      {discussion.time !== discussion.updated_at && (
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
                </Flex>

                {discussion.user_id === userId && (
                  <Dropdown
                    overlay={
                      <Menu>
                        <Menu.Item
                          key="edit"
                          onClick={() => handleEditClick(discussion)}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          key="delete"
                          onClick={() =>
                            handleDeleteDiscussionClick(discussion.id)
                          }
                        >
                          Delete
                        </Menu.Item>
                      </Menu>
                    }
                    trigger={["click"]}
                    placement="bottomLeft"
                    getPopupContainer={(trigger) => trigger.parentElement}
                  >
                    <Flex
                      align="center"
                      justify="center"
                      className="cursor-pointer transition-transform duration-150 hover:scale-120"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: colors.textcolor }}
                    >
                      <EllipsisOutlined className="text-lg font-bold" />
                    </Flex>
                  </Dropdown>
                )}
              </Flex>

              <Row className="!mt-2">
                <Col span={24}>
                  <div
                    className="!m-0 !ql-editor !text-base"
                    style={{ whiteSpace: "pre-wrap", color: colors.textcolor }}
                    dangerouslySetInnerHTML={{
                      __html: discussion.description,
                    }}
                  />
                  {discussion.image_urls?.length > 0 && (
                    <Row className="!mt-2">
                      <Col span={24}>
                        <Flex wrap="wrap" gap="small">
                          {discussion.image_urls.map((url, idx) => (
                            <Image
                              key={idx}
                              src={
                                import.meta.env.VITE_ENV === "dev"
                                  ? `${Image_URL}${url}`
                                  : `${url}`
                              }
                              alt={`Attachment ${idx + 1}`}
                              className="!base:max-w-[200px] !max-h-[150px] !sm:max-w-[300px] !sm:max-h-[200px] !object-cover"
                            />
                          ))}
                        </Flex>
                      </Col>
                    </Row>
                  )}
                </Col>
              </Row>
            </Card>
            <Flex
              align="center"
              className="!border !rounded-lg !px-3"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.background,
              }}
            >
              <EmojiPicker
                onSelect={(emoji) => setCommentText((prev) => prev + emoji)}
                placement="topLeft"
                buttonStyle={{ color: colors.textcolor }}
              />

              <MentionInputWrapper
                value={commentText}
                onChange={(value) => setCommentText(value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Type a comment"
              />

              <Button
                type="text"
                style={{ color: colors.textgray }}
                icon={<SendOutlined className="text-xl text-primary" />}
                onClick={handleAddComment}
                disabled={!commentText.trim()}
              />
            </Flex>
            <Row>
              <Col span={24}>
                <Paragraph
                  className="!m-5 !text-[15px] font-bold"
                  style={{ color: colors.textcolor }}
                >
                  {discussion.comments?.length || 0} comments
                </Paragraph>
              </Col>
            </Row>
            <List
              dataSource={[...discussion.comments].reverse()}
              className="!p-0"
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
                        No comments yet
                      </Text>
                    }
                  />
                ),
              }}
              renderItem={(comment) => (
                <Card
                  className={`!border ${
                    isDarkTheme ? "!border-gray-600" : "!border-gray-300"
                  }`}
                  style={{
                    marginBottom: "20px",
                    backgroundColor: colors.background,
                    padding: 0,
                    borderColor: colors.border,
                  }}
                  bodyStyle={{ padding: 10, paddingBottom: 0 }}
                >
                  <List.Item
                    className="!border-none !p-0 flex !items-start"
                    actions={
                      comment.user_id === userId
                        ? [
                            <Dropdown
                              overlay={
                                <Menu>
                                  <Menu.Item
                                    key="edit"
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditedCommentText(
                                        comment.comment_text
                                      );
                                    }}
                                  >
                                    Edit
                                  </Menu.Item>
                                  <Menu.Item
                                    key="delete"
                                    onClick={() =>
                                      handleDeleteCommentClick(comment.id)
                                    }
                                  >
                                    Delete
                                  </Menu.Item>
                                </Menu>
                              }
                              trigger={["click"]}
                            >
                              <EllipsisOutlined
                                className="text-lg font-bold"
                                style={{ color: colors.textcolor }}
                              />
                            </Dropdown>,
                          ]
                        : []
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={comment.avatar}
                          size={"small"}
                          className="!m-0 mr-[8px]"
                        />
                      }
                      title={
                        <Flex align="baseline" gap="middle">
                          <Text
                            className="text-[12px] sm:text-sm md:text-sm lg:text-sm"
                            style={{ color: colors.textcolor }}
                          >
                            {comment.author}
                          </Text>
                          <Text
                            style={{
                              color: colors.textgray,
                              fontSize: "12px",
                            }}
                          >
                            <TimeAgo
                              className="!text-xs"
                              date={comment.time}
                              formatter={customFormatter}
                              minPeriod={60}
                            />
                            {comment.time !== comment.updated_at && (
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
                        </Flex>
                      }
                      description={
                        editingCommentId === comment.id ? (
                          <Flex vertical gap="small">
                            <Flex
                              align="center"
                              className="!border !rounded-lg !p-2 !pr-6"
                              style={{
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                              }}
                            >
                              <EmojiPicker
                                onSelect={(emoji) => {
                                  setEditedCommentText((prev) => prev + emoji);
                                }}
                              />

                              <MentionInputWrapper
                                value={editedCommentText}
                                onChange={(value) =>
                                  setEditedCommentText(value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleUpdateComment(
                                      comment.id,
                                      editedCommentText
                                    );
                                    setEditingCommentId(null);
                                  }
                                }}
                                placeholder="Edit your comment"
                              />
                            </Flex>
                            <Flex justify="flex-end" gap="small">
                              <Button
                                size="small"
                                onClick={() => setEditingCommentId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                style={{ backgroundColor: colors.primary }}
                                onClick={() => {
                                  handleUpdateComment(
                                    comment.id,
                                    editedCommentText
                                  );
                                  setEditingCommentId(null);
                                }}
                              >
                                Save
                              </Button>
                            </Flex>
                          </Flex>
                        ) : (
                          <Paragraph
                            style={{
                              whiteSpace: "pre-wrap",
                              color: colors.textcolor,
                            }}
                            
                          >
                            {renderTextWithMentions(comment.comment_text)} 
                          </Paragraph>
                        )
                      }
                    />
                  </List.Item>
                  <Flex style={{ textAlign: "right" }}>
                    <Button
                      type="text"
                      className="!text-xs !-mt-2"
                      style={{ color: colors.textgray, background: "none" }}
                      icon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={15}
                          height={15}
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.3 16.7a9 9 0 1 1 3 3L3 21z"
                          ></path>
                        </svg>
                      }
                      onClick={() => handleReplyToggle(comment.id)}
                    >
                      {expandedReplies[comment.id]
                        ? "Hide replies"
                        : `Show replies ${
                            comment.replies.length > 0
                              ? `(${comment.replies.length})`
                              : ""
                          }`}
                    </Button>
                    <Button
                      type="text"
                      className="!text-xs !hover:text-gray-900 !-mt-2"
                      style={{ color: colors.textgray, background: "none" }}
                      icon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 6V2L1 9l7 7v-4c5 0 8.5 1.5 11 5l-.8-3l-.2-.4A12 12 0 0 0 8 6" />
                        </svg>
                      }
                      onClick={() => handleShowReplyInput(comment.id)}
                    >
                      Reply
                    </Button>
                  </Flex>

                  {expandedReplies[comment.id] && (
                    <Row>
                      <Col span={24}>
                        <List
                          className="!comment-list !mt-1 !border-t"
                          style={{ borderColor: colors.border }}
                          itemLayout="horizontal"
                          dataSource={comment.replies || []}
                          locale={{
                            emptyText: (
                              <Text
                                className="text-[12px] p-0 block"
                                style={{ color: colors.textgray }}
                              >
                                No replies
                              </Text>
                            ),
                          }}
                          renderItem={(reply) => (
                            <li>
                              <Card
                                style={{
                                  marginBottom: "5px",
                                  backgroundColor: colors.background,
                                  padding: 0,
                                }}
                                bodyStyle={{ padding: 10, paddingBottom: 0 }}
                              >
                                <List.Item
                                  className="!border-none !p-0 flex !items-start"
                                  actions={
                                    reply.user_id === userId
                                      ? [
                                          <Dropdown
                                            overlay={
                                              <Menu>
                                                <Menu.Item
                                                  key="edit"
                                                  onClick={() => {
                                                    setEditingReplyId(reply.id);
                                                    setEditedReplyText(
                                                      reply.reply_text
                                                    );
                                                  }}
                                                >
                                                  Edit
                                                </Menu.Item>
                                                <Menu.Item
                                                  key="delete"
                                                  onClick={() => {
                                                    setDeleteType("reply");
                                                    setDeleteId(reply.id);
                                                    setIsDeleteModalVisible(
                                                      true
                                                    );
                                                  }}
                                                >
                                                  Delete
                                                </Menu.Item>
                                              </Menu>
                                            }
                                            trigger={["click"]}
                                          >
                                            <EllipsisOutlined
                                              className="text-lg font-bold"
                                              style={{
                                                color: colors.textcolor,
                                              }}
                                            />
                                          </Dropdown>,
                                        ]
                                      : []
                                  }
                                >
                                  <List.Item.Meta
                                    avatar={
                                      <Avatar
                                        src={reply.avatar}
                                        size={"small"}
                                      />
                                    }
                                    title={
                                      <Flex align="baseline" gap="middle">
                                        <Text
                                          className="font-bold text-[12px] sm:text-sm md:text-sm lg:text-sm"
                                          style={{ color: colors.textcolor }}
                                        >
                                          {reply.author}
                                        </Text>
                                        <Text
                                          style={{
                                            color: colors.textgray,
                                            fontSize: "12px",
                                          }}
                                        >
                                          <TimeAgo
                                            date={reply.time}
                                            formatter={customFormatter}
                                            minPeriod={60}
                                          />
                                          {reply.time !== reply.updated_at && (
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
                                      </Flex>
                                    }
                                    description={
                                      editingReplyId === reply.id ? (
                                        <Flex vertical gap="small">
                                          <Flex
                                            align="center"
                                            className="!border !rounded-lg !p-2"
                                            style={{
                                              borderColor: colors.border,
                                              backgroundColor:
                                                colors.background,
                                            }}
                                          >
                                            <EmojiPicker
                                              onSelect={(emoji) => {
                                                setEditedReplyText(
                                                  (prev) => prev + emoji
                                                );
                                              }}
                                            />
                                            <MentionInputWrapper
                                              value={editedReplyText}
                                              onChange={(value) =>
                                                setEditedReplyText(value)
                                              }
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === "Enter" &&
                                                  !e.shiftKey
                                                ) {
                                                  e.preventDefault();
                                                  handleUpdateReply(reply.id);
                                                }
                                              }}
                                              placeholder="Edit your reply"
                                            />
                                          </Flex>
                                          <Flex
                                            justify="flex-end"
                                            gap="small"
                                            className="!mb-2"
                                          >
                                            <Button
                                              size="small"
                                              onClick={() => {
                                                setEditingReplyId(null);
                                                setEditedReplyText("");
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              type="primary"
                                              size="small"
                                              style={{
                                                backgroundColor: colors.primary,
                                              }}
                                              onClick={() =>
                                                handleUpdateReply(reply.id)
                                              }
                                            >
                                              Save
                                            </Button>
                                          </Flex>
                                        </Flex>
                                      ) : (
                                        <Paragraph
                                          style={{
                                            whiteSpace: "pre-wrap",
                                            color: colors.textcolor,
                                            marginBottom: "3px",
                                          }}
                                        >
                                          {renderTextWithMentions(
                                            reply.reply_text
                                          )}
                                        </Paragraph>
                                      )
                                    }
                                  />
                                </List.Item>
                              </Card>
                            </li>
                          )}
                        />
                      </Col>
                    </Row>
                  )}

                  {showReplyInput[comment.id] && (
                    <Row
                      className="border-t mt-2"
                      style={{
                        borderColor: colors.border,
                      }}
                    >
                      <Col span={24}>
                        <Flex
                          align="center"
                          className="!border !rounded-lg !px-3 !mt-3 !ml-[20px] !mb-3"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                          }}
                        >
                          <EmojiPicker
                            onSelect={(emoji) => {
                              setReplyTexts((prev) => ({
                                ...prev,
                                [comment.id]: (prev[comment.id] || "") + emoji,
                              }));
                            }}
                            buttonStyle={{ color: colors.textcolor }}
                          />
                          <MentionInputWrapper
                            value={replyTexts[comment.id] || ""}
                            onChange={(value) =>
                              setReplyTexts((prev) => ({
                                ...prev,
                                [comment.id]: value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAddReply(comment.id, e);
                              }
                            }}
                            placeholder="Type a reply"
                          />
                          <Button
                            type="text"
                            style={{ color: colors.textgray }}
                            icon={
                              <SendOutlined className="text-xl text-primary" />
                            }
                            onClick={(e) => handleAddReply(comment.id, e)}
                            disabled={!replyTexts[comment.id]?.trim()}
                          />
                        </Flex>
                      </Col>
                    </Row>
                  )}
                </Card>
              )}
            />

            <ConfirmDeleteModal
              visible={isDeleteModalVisible}
              onConfirm={() => handleConfirmDelete(deleteType, deleteId)}
              onCancel={() => {
                setIsDeleteModalVisible(false);
                setDeleteType(null);
                setDeleteId(null);
              }}
              title={`Confirm ${
                deleteType === "discussion"
                  ? "Discussion"
                  : deleteType === "comment"
                  ? "Comment"
                  : "Reply"
              } Deletion`}
              description={`Are you sure you want to delete this ${
                deleteType === "discussion"
                  ? "discussion"
                  : deleteType === "comment"
                  ? "comment"
                  : "reply"
              }?`}
            />

            <Modal
              title="Update Discussion"
              visible={isEditModalVisible}
              onCancel={resetModalState}
              closeIcon={<Text style={{ color: colors.textcolor }}>✕</Text>}
              footer={[
                <Button key="cancel" onClick={resetModalState}>
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  style={{ backgroundColor: colors.primary }}
                  onClick={handleUpdateDiscussion}
                >
                  Update
                </Button>,
              ]}
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
                  value={selectedDiscussion?.title || ""}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setSelectedDiscussion({
                      ...selectedDiscussion,
                      title: newTitle,
                    });
                    const isDuplicate = checkDuplicateTitle(
                      newTitle,
                      selectedDiscussion?.id
                    );
                    setValidationErrors({
                      ...validationErrors,
                      editTitle: !newTitle.trim(),
                      editDuplicateTitle: isDuplicate,
                    });
                  }}
                  maxLength={255}
                />
                <Flex justify="space-between" align="center">
                  {validationErrors.editTitle ? (
                    <Text type="danger" className="text-xs !-mt-2">
                      Title is required
                    </Text>
                  ) : (
                    <Text className="text-xs !-mt-2 !invisible">
                      Placeholder
                    </Text>
                  )}
                  <Text type="secondary" className="text-xs !-mt-2">
                    {selectedDiscussion?.title.length || 0}/255
                  </Text>
                </Flex>

                {validationErrors.editDuplicateTitle && (
                  <Flex align="center" gap={4} style={{ marginBottom: 8 }}>
                    <Text type="danger" className="text-xs">
                      A discussion with this title already exists in this
                      project
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

              <Space
                direction="vertical"
                data-theme={isDarkTheme ? "dark" : "light"}
              >
                <Text strong>
                  Description<Text type="danger">*</Text>
                </Text>
                <QuillEditor
                  value={selectedDiscussion?.description || ""}
                  onChange={(value) => {
                    setSelectedDiscussion({
                      ...selectedDiscussion,
                      description: value,
                    });
                    if (hasContent(value)) {
                      setValidationErrors({
                        ...validationErrors,
                        editDescription: false,
                      });
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
                {validationErrors.editDescription && (
                  <Text type="danger" className="text-xs mt-4 mb-8">
                    Description is required
                  </Text>
                )}
                {(existingImages.length > 0 || selectedFiles.length > 0) && (
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
                              style={{ maxWidth: "50px" }}
                            />
                            <DeleteFilled
                              className="text-red"
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
      )}
    </ConfigProvider>
  );
};

export default DiscussionDetailsPage;
