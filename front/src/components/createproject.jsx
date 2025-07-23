import { useEffect, useState, useRef } from "react";
import {
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
  Button,
  Card,
  Avatar,
  Row,
  message,
  Col,
  List,
  Modal,
  App,
  ConfigProvider,
  Space,
  Tooltip,
  Empty,
  Typography,
  Flex,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  CloseOutlined,
  DownOutlined,
  CalendarOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "../App.css";
import { useDispatch, useSelector } from "react-redux";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  setProjectName,
  setDescription,
  setGithubUrl,
  setPriority,
  setPtype,
  setTeam,
  setTeamCategory,
  setLogoFile,
  setImageUrl,
  resetForm,
  updateVideoUrl,
  updateFileUrl,
  addModule,
  updateModule,
  deleteModule,
  setModalOpen,
  setVideoUrls,
  resetModuleForm,
  setFileUrls,
  setEditingIndex,
  clearDuplicateModuleError,
  setProjectNameError,
  setGithubRequiredError,
  setStartDateError,
  setEndDateError,
  clearRequiredErrors,
  addTechStack,
  updateTechStack,
  deleteTechStack,
  createProjectThunk,
  createModuleThunk,
  fetchTeamsThunk,
  fetchProjectDetails,
  updateProject,
  deleteProjectModule,
  uploadFile,
} from "../redux/createprojectSlice";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Colors } from "../config/color";
import ConfirmDeleteModal from "./confirm_delete_modal";
import { showLoader, hideLoader } from "../redux/loderSlice";
import moment from "moment";
import ErrorComponent from "./errorComponent";
import FormLabel from "./formLable";
import dayjs from "dayjs";
import Notifier from "./notifier";

const { Option } = Select;
const { Text } = Typography;

const toolbarOptions = [
  [{ size: [] }],
  [{ font: [] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "code-block"],
  [{ align: [] }],
  ["link"],
  ["clean"],
];

const modules = { toolbar: toolbarOptions };

const DraggableListItem = ({ index, moveItem, children }) => {
  const ref = useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: "module",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "module",
    hover: (draggedItem) => {
      if (!ref.current) return;

      const dragIndex = draggedItem.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      moveItem(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <Flex
      ref={ref}
      vertical
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {children}
    </Flex>
  );
};

const CreateProject = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [form] = Form.useForm();
  const [moduleForm] = Form.useForm();
  const [searchQuery, setSearchQuery] = useState("");
  const [displayedTeams, setDisplayedTeams] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [moduleToDeleteIndex, setModuleToDeleteIndex] = useState(null);
  const [moduleErrors, setModuleErrors] = useState({});
  const StartDateRef = useRef(null);
  const EndDateRef = useRef(null);
  const GitRef = useRef(null);
  const teamSelectRef = useRef(null);
  const projectNameRef = useRef(null);
  const descriptionRef = useRef(null);
  const videoUrlRef = useRef(null);
  const { techStack } = useSelector((state) => state.createproject);
  const [tempFiles, setTempFiles] = useState({});

  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";
  const projectId = Number(searchParams.get("id"));

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/projects");
  };

  const moveItem = (dragIndex, hoverIndex) => {
    const updatedModules = [...projectModules];
    const [draggedItem] = updatedModules.splice(dragIndex, 1);
    updatedModules.splice(hoverIndex, 0, draggedItem);

    updatedModules.forEach((module, index) => {
      dispatch(
        updateModule({
          index: index,
          moduleData: module,
        })
      );
    });
  };

  const {
    project_name,
    description,
    githubUrl,
    priority,
    project_type,
    team,
    teamCategory,
    logoFile,
    imageUrl,
    videoUrls,
    fileUrls,
    projectModules,
    isModalOpen,
    editingIndex,
    error,
    githubError,
    teams,
    projectNameError,
    githubRequiredError,
    startDateError,
    endDateError,
    loading,
  } = useSelector((state) => state.createproject);

  const { isDarkTheme } = useSelector((state) => state.navbar);

  const colors = Colors();
  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      borderRadius: 4,
      colorBorder: colors.border,
      colorBorderSecondary: colors.border,
      colorIcon: colors.textcolor,
      colorIconHover: colors.textcolor,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        borderWidth: 1,
        borderColor: colors.border,
        headerBg: colors.background,
      },
      Select: {
        colorTextPlaceholder: colors.textgray,
        colorBgContainer: "transparent",
        optionSelectedBg: colors.theme,
        colorBorder: colors.border,
        controlOutline: "transparent",
        optionActiveBg: colors.hoverGray,
      },
      DatePicker: {
        colorTextPlaceholder: colors.textgray,
        colorBgContainer: "transparent",
        colorIcon: colors.textcolor,
        colorText: colors.textcolor,
        controlOutline: "transparent",
      },
      Input: {
        colorBorder: colors.border,
        colorBgContainer: "transparent",
        activeShadow: "none",
        colorTextPlaceholder: colors.textgray,
      },
      Button: {
        colorBorder: colors.border,
        colorText: colors.textcolor,
      },
      Modal: {
        colorBorder: colors.border,
        borderWidth: 1,
        colorText: colors.textcolor,
        colorBgContainer: "transparent",
      },
      List: {
        colorText: colors.textcolor,
      },
      Option: {
        backgroundColor: colors.background,
        color: colors.textcolor,
      },
      Upload: {
        colorText: colors.textcolor,
      },
    },
  };

  const handleTechStackChange = (index, field, value) => {
    dispatch(
      updateTechStack({
        index,
        field,
        value,
      })
    );
  };

const prepareProjectDescription = () => {
  const cleanedTechStack = techStack
    .map(({ title, version, description }) => {
      const item = {};
      if (title?.trim()) item.title = title.trim();
      if (version?.trim()) item.version = version.trim();
      if (description?.trim()) item.description = description.trim();

      return Object.keys(item).length ? item : null;
    })
    .filter(Boolean);

  return JSON.stringify({
    content: description,
    ...(cleanedTechStack.length && { techStack: cleanedTechStack }),
  });
};


  useEffect(() => {
    const fetchTeams = async () => {
      dispatch(showLoader());
      try {
        await dispatch(fetchTeamsThunk()).unwrap();
      } catch (error) {
        console.error(error);
        Notifier({
          type: "error",
          title: "Error",
          description: "Teams are not available",
          duration: 3,
          placement: "bottomRight",
          colors,
        });
      } finally {
        dispatch(hideLoader());
      }
    };
    fetchTeams();
    if (isEditMode && projectId) {
      dispatch(fetchProjectDetails(projectId)).then((result) => {
        if (result.payload?.data || result.payload) {
          const project = result.payload.data || result.payload;
          setStartDate(project.start_date ? moment(project.start_date) : null);
          setEndDate(project.end_date ? dayjs(project.end_date) : null);
          dispatch(setProjectName(project.project_name || ""));
          const parsedDescription = project.description
            ? typeof project.description === "string"
              ? JSON.parse(project.description).content || ""
              : project.description.content || ""
            : "";
          dispatch(setDescription(parsedDescription));
          dispatch(setGithubUrl(project.github_repository || ""));
          dispatch(setPriority(project.priority || "HIGH"));
          dispatch(setPtype(project.project_type || "WEB"));
          dispatch(setTeamCategory(project.project_for));
          dispatch(setTeam(project.teams?.map((team) => team.id) || []));
          if (project.logo_url) {
            const logoUrl =
              import.meta.env.VITE_ENV === "dev"
                ? `${Image_URL}${project.logo_url}`
                : `${project.logo_url}`;
            dispatch(setImageUrl(logoUrl));
          } else {
            const avatarUrl = generateAvatar(project.project_name || "");
            dispatch(setImageUrl(avatarUrl));
          }
        }
      });
    } else {
      dispatch(resetForm());
    }
  }, [dispatch, isEditMode, projectId]);

  useEffect(() => {
    const teamsArray = Array.isArray(teams) ? teams : [];

    const filtered = teamsArray.filter((team) => {
      const matchesCategory = teamCategory
        ? team.team_category === teamCategory
        : false;
      const matchesSearch = team.team_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    setDisplayedTeams(showMore ? filtered : filtered.slice(0, 4));
  }, [teams, searchQuery, showMore, teamCategory]);

  useEffect(() => {
    if (project_name && !logoFile) {
      const avatarBase64 = generateAvatar(project_name);
      dispatch(setImageUrl(avatarBase64));
    } else if (!project_name && !logoFile) {
      dispatch(setImageUrl(null));
    }
  }, [project_name, logoFile, dispatch]);

  if (isEditMode) {
    const parsedId = Number(projectId);
    if (isNaN(parsedId) || parsedId <= 0) {
      return <ErrorComponent errorMessage="Invalid project ID in URL" />;
    }
  }

  const handleSearch = (value) => setSearchQuery(value);
  const handleLoadMore = () => setShowMore(true);

  const handleAddVideoUrl = () => {
    dispatch(setVideoUrls([{ title: "", url: "", error: "" }, ...videoUrls]));
  };

  const handleAddFileUrl = () => {
    dispatch(
      setFileUrls([{ title: "", url: "", file: null, error: "" }, ...fileUrls])
    );
  };

  const handleVideoUrlChange = (index, field, value) => {
    dispatch(updateVideoUrl({ index, field, value }));
  };

  const handleFileUrlChange = (index, field, value) => {
    dispatch(updateFileUrl({ index, field, value }));
  };

  const handleUploadFile = async (index, file) => {
    if (!file || !file.type) {
      message.error("No file selected or file type is not supported!");
      return false;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      message.error("Upload PDF, DOC, or DOCX only");
      return false;
    }

    if (file.size / 1024 / 1024 >= 10) {
      message.error("File must be smaller than 10MB!");
      return false;
    }

    try {
      message.loading({ content: "Uploading file...", key: `upload_${index}` });

      const uploadedKey = await uploadFile(file);
      const filename = uploadedKey.split("/").pop();

      dispatch(updateFileUrl({ index, field: "file", value: filename }));
      dispatch(updateFileUrl({ index, field: "url", value: uploadedKey }));

      Notifier({
        type: "success",
        title: "Success",
        description: "File uploaded successfully!",
        duration: 3,
        placement: "bottomRight",
        colors,
        key: `upload_${index}`,
      });
    } catch (error) {
      message.error(`Failed to upload file: ${error.message}`);
    }

    return false;
  };

  const handleRemoveVideoUrl = (index) => {
    const updatedVideoUrls = videoUrls.filter((_, i) => i !== index);
    dispatch(setVideoUrls(updatedVideoUrls));
  };

  const handleRemoveFileUrl = (index) => {
    const updatedFileUrls = fileUrls.filter((_, i) => i !== index);
    dispatch(setFileUrls(updatedFileUrls));
    setTempFiles((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const showModal = () => {
    dispatch(setEditingIndex(null));
    dispatch(resetModuleForm());
    dispatch(clearDuplicateModuleError());
    moduleForm.resetFields();
    dispatch(setModalOpen(true));
    setTempFiles({});
  };

  const handleCancel = () => {
    dispatch(setModalOpen(false));
    dispatch(clearDuplicateModuleError());
    moduleForm.resetFields();
    setTempFiles({});
  };

  const handle2Submit = async () => {
    dispatch(showLoader());
    try {
      const values = await moduleForm.validateFields();
      const trimmedTitle = values.title.trim();

      const isModuleNameExists = projectModules.some(
        (module, idx) =>
          module.title.trim() === trimmedTitle && idx !== editingIndex
      );

      if (isModuleNameExists) {
        moduleForm.setFields([
          {
            name: "title",
            errors: ["A module with this name already exists."],
          },
        ]);
        return;
      }

      const filteredVideoUrls = videoUrls.filter(
        (video) => video.title.trim() !== "" && video.url.trim() !== ""
      );
      const filteredFileUrls = fileUrls.filter(
        (file) =>
          file.title.trim() !== "" && (file.url.trim() !== "" || file.file)
      );

      const hasVideoUrlError = filteredVideoUrls.some(
        (video) => (video.title && !video.url) || video.error
      );
      if (hasVideoUrlError) {
        message.error("Please fix the Video URL errors before submitting.");
        return;
      }

      const hasFileError = filteredFileUrls.some(
        (file) => file.title && !file.file && !file.url
      );
      if (hasFileError) {
        message.error(
          "Please upload a file for each titled entry before submitting."
        );
        return;
      }

      const uploadedFileUrls = await Promise.all(
        filteredFileUrls.map(async (file, index) => {
          if (tempFiles[index]) {
            try {
              const uploadedUrl = await uploadFile(tempFiles[index]);
              dispatch(
                updateFileUrl({ index, field: "url", value: uploadedUrl })
              );
              dispatch(updateFileUrl({ index, field: "file", value: null }));
              return { title: file.title, url: uploadedUrl };
            } catch (error) {
              message.error(`Failed to upload file: ${error.message}`);
              throw error;
            }
          }
          return { title: file.title, url: file.url };
        })
      );

      const formattedValues = {
        ...values,
        title: trimmedTitle,
        video: filteredVideoUrls.map(({ title, url }) => ({ title, url })),
        file: uploadedFileUrls,
      };

      try {
        if (editingIndex !== null) {
          dispatch(
            updateModule({ index: editingIndex, moduleData: formattedValues })
          );
          Notifier({
            type: "success",
            title: "Success",
            description: "Module Updated Successfully",
            duration: 3,
            placement: "bottomRight",
            colors,
          });
        } else {
          dispatch(addModule(formattedValues));
          Notifier({
            type: "success",
            title: "Success",
            description: "Module Added Successfully",
            duration: 3,
            placement: "bottomRight",
            colors,
          });
        }
      } finally {
        dispatch(setModalOpen(false));
        moduleForm.resetFields();
        dispatch(setVideoUrls([]));
        dispatch(setFileUrls([]));
        setTempFiles({});
      }
    } catch (errorInfo) {
      console.log("Validation failed:", errorInfo);
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleEdit = (index) => {
    const module = projectModules[index];
    dispatch(setEditingIndex(index));
    dispatch(
      setVideoUrls(
        (module.video || []).map((video) => ({
          title: video.title,
          url: video.url,
          error: "",
        }))
      )
    );
    dispatch(
      setFileUrls(
        (module.file || []).map((file) => ({
          title: file.title,
          url: file.url,
          file: null,
          error: "",
        }))
      )
    );
    moduleForm.setFieldsValue({
      title: module.title,
      description: module.description,
    });
    dispatch(setModalOpen(true));
    setTempFiles({});
  };

  const handleDeleteModule = (index) => {
    setModuleToDeleteIndex(index);
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDeleteModule = async () => {
    if (moduleToDeleteIndex === null) return;
    try {
      const moduleToDelete = projectModules[moduleToDeleteIndex];
      if (moduleToDelete.id) {
        await dispatch(
          deleteProjectModule({
            projectId,
            moduleId: moduleToDelete.id,
          })
        ).unwrap();
      }
      dispatch(deleteModule(moduleToDeleteIndex));
      setModuleErrors((prev) => {
        const updatedErrors = { ...prev };
        delete updatedErrors[moduleToDeleteIndex];
        return updatedErrors;
      });
      Notifier({
        type: "success",
        title: "Success",
        description: "Module Deleted Successfully",
        duration: 3,
        placement: "bottomRight",
        colors,
      });
    } catch (error) {
      message.error("Failed to delete module: " + error.message);
    } finally {
      setIsDeleteModalVisible(false);
      setModuleToDeleteIndex(null);
    }
  };

  const handleCancelDeleteModule = () => {
    setIsDeleteModalVisible(false);
    setModuleToDeleteIndex(null);
  };

  const handleUpload = ({ file }) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      dispatch(setImageUrl(e.target.result));
      dispatch(setLogoFile(file));
    };
    reader.readAsDataURL(file);
  };

  const generateAvatar = (name) => {
    return name && name.trim() !== ""
      ? `https://ui-avatars.com/api/?name=${name
          .substring(0, 2)
          .toUpperCase()}&background=566D7E&color=fff&size=128`
      : "";
  };

  const validateModuleContent = (module, index) => {
    let errorMessage = "";
    if (module.video.some((v) => v.title && !v.url)) {
      errorMessage += "Video URLs are missing for some titles. ";
    }
    if (module.file.some((f) => f.title && !f.url && !f.file)) {
      errorMessage += "Files are missing for some titles.";
    }
    if (errorMessage) {
      setModuleErrors((prev) => ({ ...prev, [index]: errorMessage.trim() }));
      return false;
    }
    setModuleErrors((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    return true;
  };

  const handleSubmit = async () => {
    dispatch(showLoader());
    dispatch(clearRequiredErrors());
    setModuleErrors({});

    let hasError = false;
    let firstEmptyRef = null;

    if (!project_name || project_name.trim() === "") {
      dispatch(setProjectNameError("Project name is required"));
      firstEmptyRef = projectNameRef;
      hasError = true;
    }
    if (!startDate) {
      dispatch(setStartDateError("Please select start date"));
      firstEmptyRef = firstEmptyRef || StartDateRef;
      hasError = true;
    }
    if (!githubUrl || githubUrl.trim() === "") {
      dispatch(setGithubRequiredError("Please insert Github repository"));
      firstEmptyRef = firstEmptyRef || GitRef;
      hasError = true;
    }

    let moduleValidationError = false;
    projectModules.forEach((module, index) => {
      if (!validateModuleContent(module, index)) {
        moduleValidationError = true;
      }
    });

    if (hasError || error || githubError || moduleValidationError) {
      if (firstEmptyRef) firstEmptyRef.current.focus();
      dispatch(hideLoader());
      return;
    }

    try {
      const projectDescription = prepareProjectDescription();

      if (isEditMode && projectId) {
        const projectData = {
          project_name,
          description: projectDescription,
          github_repository: githubUrl,
          start_date: startDate ? startDate.format("YYYY-MM-DD") : null,
          end_date: endDate ? endDate.format("YYYY-MM-DD") : null,
          priority,
          project_type,
          team,
          status: "IN_PROGRESS",
          project_for: teamCategory || "",
        };
        if (logoFile) projectData.logo_url = logoFile;

        await dispatch(
          updateProject({
            projectId,
            projectData,
            modules: projectModules,
          })
        ).unwrap();
        Notifier({
          type: "success",
          title: "Success",
          description: "Project Updated Successfully",
          duration: 3,
          placement: "bottomRight",
          colors,
        });
        handleNavigate();
      } else {
        const formData = new FormData();
        formData.append("project_name", project_name);
        formData.append(
          "description",
          projectDescription || JSON.stringify({ content: "", techStack: [] })
        );
        formData.append("github_repository", githubUrl);
        formData.append("start_date", startDate.format("YYYY-MM-DD"));
        formData.append("project_for", teamCategory || "");
        if (endDate) formData.append("end_date", endDate.format("YYYY-MM-DD"));
        formData.append("priority", priority);
        formData.append("project_type", project_type);
        if (team.length > 0) formData.append("team_ids", JSON.stringify(team));
        if (logoFile instanceof File) {
          formData.append("logo_url", logoFile);
        }

        const projectResponse = await dispatch(
          createProjectThunk(formData)
        ).unwrap();
        try {
          if (projectResponse.success) {
            const projectId = projectResponse.project.id;

            if (projectModules.length > 0) {
              for (const module of projectModules) {
                await dispatch(
                  createModuleThunk({
                    moduleData: {
                      title: module.title,
                      description: module.description,
                      video: JSON.stringify(module.video),
                      file: JSON.stringify(module.file),
                    },
                    projectId,
                  })
                ).unwrap();
              }
            }
          }
          Notifier({
            type: "success",
            title: "Success",
            description: "Project Created Successfully",
            duration: 3,
            placement: "bottomRight",
            colors,
          });
        } finally {
          dispatch(setImageUrl(null));
          dispatch(setLogoFile(null));
          dispatch(resetForm());
          setStartDate(null);
          setEndDate(null);
          form.resetFields();
          handleNavigate();
        }
      }
    } catch (error) {
      const status = error?.status;
      const errorMessage =
        status === 401 || status === 403
          ? error?.message
          : "Failed to save project.";

      if (
        !isEditMode &&
        errorMessage === "A project with the same name already exists."
      ) {
        dispatch(setProjectNameError(errorMessage));
        projectNameRef.current?.focus();
        projectNameRef.current?.select();
      } else {
        Notifier({
          type: "error",
          title: "Error",
          description: { errorMessage },
          duration: 3,
          placement: "bottomRight",
          colors,
        });
      }
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleDateChange = (field, value) => {
    if (field === "startDate") {
      dispatch(setStartDateError(""));
      setStartDate(value);
      if (endDate && value && endDate < value) {
        setEndDate(null);
        dispatch(setEndDateError("End date must be after start date"));
      }
    } else if (field === "endDate") {
      dispatch(setEndDateError(""));
      if (!value) {
        setEndDate(null);
      } else if (startDate && value < startDate) {
        dispatch(setEndDateError("End date must be after start date"));
      } else {
        setEndDate(value);
      }
    }
  };

  const disabledDate = (current) =>
    startDate ? current && current < startDate.startOf("day") : false;

  const dateRender = (current) => {
    const isBeforeStart = startDate && current < startDate.startOf("day");
    const isSelected =
      (startDate && current.isSame(startDate, "day")) ||
      (endDate && current.isSame(endDate, "day"));

    return (
      <Text
        className={`!ant-picker-cell-inner !rounded-full !w-full !h-full !inline-block !text-center !leading-[32px]
        ${isBeforeStart ? "cursor-not-allowed" : "cursor-pointer"}
      `}
        style={{
          color: isBeforeStart ? colors.darkGray : colors.textcolor,
          background: isSelected ? colors.avatarGray : "transparent",
        }}
      >
        {current.date()}
      </Text>
    );
  };

  const handleEnterKey = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <App>
        <Flex
          vertical
          className="!container !mx-auto !px-4 !overflow-x-hidden !mt-6"
          data-theme={isDarkTheme ? "dark" : "light"}
        >
          <Row gutter={16}>
            <Col xs={24} lg={18}>
              <Card title={isEditMode ? "Edit Project" : "Create New Project"}>
                <Form form={form} layout="vertical">
                  <Form.Item
                    label={<FormLabel text="Name" required />}
                    validateStatus={projectNameError ? "error" : ""}
                    help={
                      projectNameError && (
                        <Text type="danger">{projectNameError}</Text>
                      )
                    }
                  >
                    <Input
                      placeholder="Enter project title"
                      value={project_name}
                      maxLength={100}
                      onChange={(e) =>
                        dispatch(setProjectName(e.target.value.trimStart()))
                      }
                      onKeyPress={(e) => handleEnterKey(e, descriptionRef)}
                      style={{ color: colors.textcolor }}
                      ref={projectNameRef}
                    />
                  </Form.Item>

                  <Form.Item label="Description">
                    <ReactQuill
                      className="custom-quill"
                      theme="snow"
                      value={description}
                      onChange={(value) => dispatch(setDescription(value))}
                      onKeyPress={(e) => handleEnterKey(e, StartDateRef)}
                      modules={modules}
                      style={{
                        color: colors.textcolor,
                        backgroundColor: colors.background,
                        "--quill-border-color": colors.border,
                      }}
                      ref={descriptionRef}
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label={<FormLabel text="Start Date" required />}
                        validateStatus={startDateError ? "error" : ""}
                        help={
                          startDateError && (
                            <Text type="danger">{startDateError}</Text>
                          )
                        }
                      >
                        <DatePicker
                          value={startDate}
                          ref={StartDateRef}
                          style={{ width: "100%", color: colors.textcolor }}
                          onChange={(date) =>
                            handleDateChange("startDate", date)
                          }
                          disabled={isEditMode}
                          disabledDate={disabledDate}
                          dateRender={dateRender}
                          onKeyPress={(e) => handleEnterKey(e, EndDateRef)}
                          suffixIcon={
                            <CalendarOutlined
                              style={{ color: colors.textcolor }}
                            />
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="End Date"
                        validateStatus={endDateError ? "error" : ""}
                        help={<Text type="danger">{endDateError}</Text>}
                      >
                        <DatePicker
                          style={{ width: "100%", color: colors.textcolor }}
                          disabled={!startDate}
                          ref={EndDateRef}
                          value={endDate}
                          onChange={(date) => handleDateChange("endDate", date)}
                          disabledDate={disabledDate}
                          dateRender={dateRender}
                          onKeyPress={(e) => handleEnterKey(e, GitRef)}
                          suffixIcon={
                            <CalendarOutlined
                              style={{ color: colors.textcolor }}
                            />
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Project Type">
                        <Select
                          value={project_type}
                          onChange={(value) => dispatch(setPtype(value))}
                          style={{ color: colors.textcolor }}
                          onKeyPress={(e) => handleEnterKey(e, teamSelectRef)}
                          dropdownStyle={{
                            backgroundColor: colors.background,
                          }}
                          suffixIcon={
                            <DownOutlined style={{ color: colors.textcolor }} />
                          }
                        >
                          <Option value="WEB">Web</Option>
                          <Option value="MOBILE">Mobile</Option>
                          <Option value="DESKTOP">Desktop</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Priority">
                        <Select
                          placeholder="Set Priority"
                          value={priority}
                          onChange={(value) => dispatch(setPriority(value))}
                          style={{ color: colors.textcolor }}
                          onKeyPress={(e) => handleEnterKey(e, null)}
                          dropdownStyle={{
                            backgroundColor: colors.background,
                          }}
                          suffixIcon={
                            <DownOutlined style={{ color: colors.textcolor }} />
                          }
                        >
                          <Option value="HIGH">High</Option>
                          <Option value="MEDIUM">Medium</Option>
                          <Option value="LOW">Low</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="Project Logo">
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        handleUpload({ file });
                        return false;
                      }}
                      onChange={handleUpload}
                    >
                      <Avatar
                        src={imageUrl}
                        size={75}
                        style={{ marginRight: 10 }}
                      >
                        {!imageUrl &&
                          project_name?.substring(0, 2).toUpperCase()}
                      </Avatar>
                    </Upload>
                    {logoFile && (
                      <Button
                        type="default"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          dispatch(setImageUrl(null));
                          dispatch(setLogoFile(null));
                        }}
                        style={{ marginTop: 10 }}
                      />
                    )}
                  </Form.Item>
                </Form>
              </Card>
              <Space style={{ height: 16 }} />
              <DndProvider backend={HTML5Backend}>
                <Card
                  title={
                    <Button
                      type="primary"
                      onClick={showModal}
                      style={{ background: "#6a40ff", color: "#fff" }}
                    >
                      Add Module
                    </Button>
                  }
                  className="!mt-3"
                >
                  <List
                    locale={{
                      emptyText: (
                        <Text style={{ color: colors.textcolor }}>
                          No modules added
                        </Text>
                      ),
                    }}
                    itemLayout="horizontal"
                    dataSource={projectModules}
                    renderItem={(item, index) => (
                      <DraggableListItem index={index} moveItem={moveItem}>
                        <List.Item
                          actions={[
                            <EditOutlined
                              onClick={() => handleEdit(index)}
                              style={{ color: colors.textcolor }}
                            />,
                            <DeleteOutlined
                              onClick={() => handleDeleteModule(index)}
                              style={{ color: colors.textcolor }}
                            />,
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <Text style={{ color: colors.textcolor }}>
                                {item.title}
                              </Text>
                            }
                            description={
                              moduleErrors[index] && (
                                <Text style={{ color: colors.danger }}>
                                  {moduleErrors[index]}
                                </Text>
                              )
                            }
                          />
                        </List.Item>
                      </DraggableListItem>
                    )}
                  />
                </Card>
              </DndProvider>
            </Col>

            <Col xs={24} lg={6} className="mt-4 lg:mt-0">
              <Card title="Teams">
                <Form.Item style={{ marginBottom: 12 }}>
                  <Select
                    className="w-full"
                    placeholder="Select Category"
                    value={teamCategory}
                    onChange={(value) => dispatch(setTeamCategory(value))}
                    style={{ color: colors.textcolor }}
                    dropdownStyle={{ backgroundColor: colors.background }}
                    suffixIcon={
                      <DownOutlined style={{ color: colors.textcolor }} />
                    }
                  >
                    <Option value="Interns">Interns</Option>
                    <Option value="Employee">Employee</Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Select
                    className="w-full"
                    placeholder="Select Teams"
                    mode="multiple"
                    disabled={!teamCategory}
                    value={team}
                    onChange={(value) => dispatch(setTeam(value))}
                    showSearch
                    onSearch={handleSearch}
                    filterOption={false}
                    ref={teamSelectRef}
                    style={{ color: colors.textcolor }}
                    onKeyPress={(e) => handleEnterKey(e, GitRef)}
                    dropdownStyle={{ backgroundColor: colors.background }}
                    suffixIcon={
                      <DownOutlined style={{ color: colors.textcolor }} />
                    }
                    notFoundContent={
                      <Empty
                        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                        description={
                          <Text
                            style={{ color: colors.textcolor, fontSize: 14 }}
                          >
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
                    }
                  >
                    {displayedTeams.map((team) => (
                      <Option key={team.id} value={team.id}>
                        {team.team_name}
                      </Option>
                    ))}
                    {!showMore && displayedTeams.length > 3 && (
                      <Option key="load-more" disabled>
                        <Button type="link" onClick={handleLoadMore}>
                          Load More...
                        </Button>
                      </Option>
                    )}
                  </Select>
                </Form.Item>
              </Card>

              <Space style={{ height: 16 }} />
              <Card title="GitHub" className="!mt-3">
                <Form.Item
                  label={<FormLabel text="GitHub Repository" required />}
                  colon={false}
                  validateStatus={
                    githubError || githubRequiredError ? "error" : ""
                  }
                  help={
                    (githubError || githubRequiredError) && (
                      <Text style={{ color: colors.danger }}>
                        {githubError || githubRequiredError}
                      </Text>
                    )
                  }
                >
                  <Input
                    placeholder="Enter GitHub Repository URL"
                    value={githubUrl}
                    maxLength={255}
                    ref={GitRef}
                    onChange={(e) => dispatch(setGithubUrl(e.target.value))}
                    allowClear
                    style={{ color: colors.textcolor }}
                    onKeyPress={(e) => handleEnterKey(e, null)}
                  />
                </Form.Item>
              </Card>
              <Space style={{ height: 16 }} />
              <Card
                title="Tech Stack"
                className="[&_.ant-card-body]:!pb-0 !mt-3"
              >
                <Form.Item>
                  <Flex
                    vertical
                    className="!max-h-[290px] overflow-y-auto !mb-2"
                  >
                    {techStack.map((stack, index) => (
                      <Flex key={index} gap={8} align="center" className="mb-2">
                        {!stack.isSaved ? (
                          <>
                            <Form.Item className="flex-1 mb-0 !min-w-[90px]">
                              <Input
                                placeholder="Technology (e.g. React)"
                                value={stack.title}
                                onChange={(e) =>
                                  handleTechStackChange(
                                    index,
                                    "title",
                                    e.target.value
                                  )
                                }
                                autoFocus
                              />
                            </Form.Item>
                            <Form.Item className="flex-1 mb-0 min-w-[80px]">
                              <Input
                                placeholder="Version (e.g. 18.2.0)"
                                value={stack.version}
                                onChange={(e) =>
                                  handleTechStackChange(
                                    index,
                                    "version",
                                    e.target.value
                                  )
                                }
                              />
                            </Form.Item>
                            <Form.Item className="flex-2 mb-0 min-w-[100px]">
                              <Input
                                placeholder="Description (optional)"
                                value={stack.description}
                                onChange={(e) =>
                                  handleTechStackChange(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                              />
                            </Form.Item>
                          </>
                        ) : (
                          <>
                            <Text
                              className="!flex-1 !min-w-[70px] font-semibold truncate"
                              style={{ color: colors.textcolor }}
                            >
                              {stack.title}
                            </Text>
                            <Text
                              className="!flex-1 !min-w-[60px] truncate"
                              style={{ color: colors.textcolor }}
                            >
                              {stack.version}
                            </Text>
                            <Tooltip
                              title={stack.description}
                              placement="topLeft"
                              overlayClassName="!max-w-[200px]"
                            >
                              <Text
                                className="!flex-2 !min-w-[50px] truncate"
                                style={{ color: colors.textgray }}
                              >
                                {stack.description || "No description"}
                              </Text>
                            </Tooltip>
                            <Space className="!ml-auto">
                              <Button
                                type="text"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => dispatch(deleteTechStack(index))}
                              />
                            </Space>
                          </>
                        )}
                      </Flex>
                    ))}
                  </Flex>

                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    block
                    onClick={() => {
                      if (techStack.some((stack) => !stack.isSaved)) {
                        const unsavedIndex = techStack.findIndex(
                          (stack) => !stack.isSaved
                        );
                        const unsavedStack = techStack[unsavedIndex];
                        if (
                          unsavedStack.title.trim() &&
                          unsavedStack.version.trim()
                        ) {
                          dispatch(
                            updateTechStack({
                              index: unsavedIndex,
                              field: "isSaved",
                              value: true,
                            })
                          );
                          Notifier({
                            type: "success",
                            title: "Success",
                            description: "Technology saved successfully!",
                            duration: 3,
                            placement: "bottomRight",
                            colors,
                          });
                        } else {
                          Notifier({
                            type: "error",
                            title: "Failed",
                            description:
                              "Please enter a Technology Name and Version",
                            duration: 3,
                            placement: "bottomRight",
                            colors,
                          });
                        }
                      } else {
                        dispatch(
                          addTechStack({
                            title: "",
                            version: "",
                            description: "",
                            isSaved: false,
                          })
                        );
                      }
                    }}
                    style={{
                      background: colors.primary,
                      borderColor: colors.primary,
                      color: colors.white,
                    }}
                  >
                    {techStack.some((stack) => !stack.isSaved)
                      ? "Save Technology"
                      : "Add Technology"}
                  </Button>
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Modal
            title={editingIndex !== null ? "Edit Module" : "Add Module"}
            open={isModalOpen}
            onCancel={handleCancel}
            footer={null}
          >
            <Form form={moduleForm} onFinish={handle2Submit} layout="vertical">
              <Form.Item
                name="title"
                required={false}
                label={<FormLabel text="Title" required />}
                rules={[
                  { required: true, message: "Title is required" },
                  {
                    validator: (_, value) =>
                      /^[^a-zA-Z]/.test(value?.trim())
                        ? Promise.reject(
                            "Title should not start with a symbol or number."
                          )
                        : Promise.resolve(),
                  },
                ]}
                validateTrigger={["onSubmit", "onChange"]}
              >
                <Input
                  placeholder="Enter title"
                  style={{ color: colors.textcolor }}
                  onKeyPress={(e) => handleEnterKey(e, videoUrlRef)}
                  maxLength={100}
                />
              </Form.Item>

              <Form.Item label="Video URLs">
                <Flex
                  vertical
                  className={`mb-2 ${
                    videoUrls.length > 2
                      ? "max-h-[80px] overflow-y-auto"
                      : "max-h-none overflow-visible"
                  }`}
                >
                  {videoUrls.map((video, index) => (
                    <Flex key={index} gap={8} style={{ marginBottom: 16 }}>
                      <Input
                        placeholder="Video Title"
                        value={video.title}
                        onChange={(e) =>
                          handleVideoUrlChange(index, "title", e.target.value)
                        }
                        style={{
                          flex: "1 1 100px",
                          minWidth: 100,
                          color: colors.textcolor,
                        }}
                        ref={index === 0 ? videoUrlRef : null}
                        onKeyPress={(e) => handleEnterKey(e, null)}
                        maxLength={100}
                      />

                      <Flex
                        vertical
                        style={{
                          flex: "2 1 150px",
                          minWidth: 150,
                          position: "relative",
                        }}
                      >
                        {video.error && (
                          <Text
                            className="absolute !-top-[22px] left-0 text-[12px] leading-none"
                            style={{ color: colors.errorMsg }}
                          >
                            {video.error}
                          </Text>
                        )}

                        <Input
                          placeholder="Video URL"
                          value={video.url}
                          onChange={(e) =>
                            handleVideoUrlChange(index, "url", e.target.value)
                          }
                          style={{
                            width: "100%",
                            color: colors.textcolor,
                          }}
                          onKeyPress={(e) => handleEnterKey(e, null)}
                          maxLength={255}
                        />
                      </Flex>

                      <Button
                        type="text"
                        danger
                        icon={
                          <CloseOutlined
                            className={`${
                              isDarkTheme
                                ? `text-[${colors.danger}]`
                                : `text-[${colors.errorMsg}]`
                            }`}
                          />
                        }
                        onClick={() => handleRemoveVideoUrl(index)}
                        className="!flex-none !p-0 !w-6 !h-6"
                      />
                    </Flex>
                  ))}
                </Flex>
                <Button onClick={handleAddVideoUrl}>+ Add Video</Button>
              </Form.Item>

              <Form.Item name="description" label="Description">
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 4 }}
                  placeholder="Enter description"
                  style={{ color: colors.textcolor }}
                  onKeyPress={(e) => handleEnterKey(e, videoUrlRef)}
                />
              </Form.Item>

              <Form.Item label="Other attachments">
                <Flex
                  vertical
                  className={`mb-2 ${
                    fileUrls.length > 2
                      ? "max-h-[80px] overflow-y-auto"
                      : "max-h-none overflow-visible"
                  }`}
                >
                  {fileUrls.map((file, index) => (
                    <Flex key={index} gap={8} style={{ marginBottom: 16 }}>
                      <Input
                        placeholder="File Title"
                        maxLength={100}
                        value={file.title}
                        onChange={(e) =>
                          handleFileUrlChange(index, "title", e.target.value)
                        }
                        className="flex-1 min-w-[100px]"
                        style={{ color: colors.textcolor }}
                      />

                      <Flex vertical className="flex-[2_1_150px] min-w-[150px]">
                        {file.url ? (
                          <Flex gap={8} align="center">
                            <Input
                              value={file.url}
                              maxLength={255}
                              disabled
                              className="w-full"
                              style={{ color: colors.textcolor }}
                            />
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                handleFileUrlChange(index, "url", "");
                                handleFileUrlChange(index, "file", null);
                              }}
                            />
                          </Flex>
                        ) : (
                          <Flex gap={8} align="center">
                            <Upload
                              accept=".pdf,.doc,.docx"
                              showUploadList={false}
                              beforeUpload={(file) =>
                                handleUploadFile(index, file)
                              }
                            >
                              <Button
                                className="px-4 py-1 border text-sm font-medium rounded"
                                style={{
                                  backgroundColor: colors.filebtn,
                                  borderColor: colors.border,
                                  color: colors.textcolor,
                                }}
                              >
                                Choose File
                              </Button>
                            </Upload>
                            {file.file && (
                              <>
                                <Text style={{ color: colors.textcolor }}>
                                  {file.file}
                                </Text>
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    handleFileUrlChange(index, "file", null);
                                    setTempFiles((prev) => {
                                      const updated = { ...prev };
                                      delete updated[index];
                                      return updated;
                                    });
                                  }}
                                />
                              </>
                            )}
                          </Flex>
                        )}
                      </Flex>
                      <Button
                        type="text"
                        danger
                        icon={
                          <CloseOutlined
                            className={`${
                              isDarkTheme
                                ? `text-[${colors.danger}]`
                                : `text-[${colors.errorMsg}]`
                            }`}
                          />
                        }
                        onClick={() => handleRemoveFileUrl(index)}
                        className="w-6 h-6 p-0 flex items-center justify-center"
                      />
                    </Flex>
                  ))}
                </Flex>
                <Button onClick={handleAddFileUrl}>+ Add File</Button>
              </Form.Item>

              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  {editingIndex !== null ? "Update" : "Submit"}
                </Button>
                <Button onClick={handleCancel}>Cancel</Button>
              </Space>
            </Form>
          </Modal>

          <Row className="mt-4" gutter={0} justify="start">
            <Col xs={24} lg={18}>
              <Flex justify="flex-end" className="mb-4">
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  disabled={loading || error || githubError}
                  loading={loading}
                  className="text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  {isEditMode ? "Update Project" : "Create Project"}
                </Button>
              </Flex>
            </Col>
          </Row>

          <ConfirmDeleteModal
            title="Confirm Deletion"
            visible={isDeleteModalVisible}
            onConfirm={handleConfirmDeleteModule}
            onCancel={handleCancelDeleteModule}
            description="Are you sure you want to delete this module?"
          />
        </Flex>
      </App>
    </ConfigProvider>
  );
};

export default CreateProject;
