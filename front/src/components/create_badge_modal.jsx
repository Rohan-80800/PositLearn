import { useEffect, useState, useRef } from "react";
import {
  Modal,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  Row,
  Col,
  ConfigProvider,
  Typography,
  Image,
  Flex,
} from "antd";
import {
  ProjectOutlined,
  TagOutlined,
  FileImageOutlined,
  InfoCircleOutlined,
  StarOutlined,
  TrophyOutlined,
  CloseOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import api from "../axios";
import Loader from "./loader";
import defaultBadgeImage from "../assets/badge2.png";
import AI from "../assets/AI.png";
import Notifier from "./notifier";

const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");
const { Option } = Select;
const { Text } = Typography;

const CreateBadgeModal = ({
  visible,
  onCancel,
  onSuccess,
  projects,
  colors,
  editBadge,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [generatedImage, setGeneratedImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [visibleProjects, setVisibleProjects] = useState(3);
  const abortControllerRef = useRef(null);
  const selectRef = useRef(null);

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorPrimary: colors.primary,
    },
    components: {
      Modal: {
        titleColor: colors.textcolor,
        colorIcon: colors.textcolor,
      },
      Input: { hoverBorderColor: colors.primary },
      Button: {
        colorPrimary: colors.primary,
        colorPrimaryHover: colors.primaryHover,
      },
    },
  };

  useEffect(() => {
    return () => {
      fileList.forEach((file) => {
        if (file.url && file.originFileObj) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, [fileList]);

  useEffect(() => {
    if (visible) {
      setVisibleProjects(3);
    }
    if (editBadge) {
      const badgeType = editBadge.is_special
        ? "special_badge"
        : "completion_percentage";
      const imageUrl = editBadge.image
        ? import.meta.env.VITE_ENV === "dev"
          ? `${Image_URL}${editBadge.image}`
          : editBadge.image
        : defaultBadgeImage;

      form.setFieldsValue({
        project_id: editBadge.project_id?.toString() || null,
        name: editBadge.title || "",
        description: editBadge.description || "",
        badge_type: badgeType,
        progress_percentage:
          badgeType === "completion_percentage"
            ? editBadge.badge_specific_progress
            : null,
      });

      setFileList(
        imageUrl
          ? [
              {
                uid: "-1",
                name: editBadge.image?.split("/").pop() || "badge-image",
                status: "done",
                url: imageUrl,
              },
            ]
          : []
      );
      setSelectedProject(
        projects.find(
          (p) => p.project_id.toString() === editBadge.project_id?.toString()
        )
      );
      setGeneratedImageFile(null);
      setIsGenerated(false);
    } else {
      form.resetFields();
      setFileList([]);
      setSelectedProject(null);
      setGeneratedImageFile(null);
      setIsGenerated(false);
    }
  }, [editBadge, form, projects, visible]);

  const renderLabel = (icon, text, required = false, projectName = "") => (
    <Text>
      {icon}
      {projectName ? `${projectName} - ${text}` : text}
      {required && <Text style={{ color: "red" }}>*</Text>}
    </Text>
  );

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    setSelectedProject(null);
    setGeneratedImageFile(null);
    setIsLoading(false);
    setIsGenerated(false);
    setVisibleProjects(3);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    onCancel();
  };

  const handleSubmit = async (values) => {
    if (!values.name?.trim()) {
      form.setFields([
        { name: "name", errors: ["Please enter the badge name"] },
      ]);
      return;
    }

    const formData = new FormData();
    const fieldMapper = {
      project_id: (value) => formData.append("project_id", value),
      name: (value) => formData.append("name", value),
      description: (value) => formData.append("description", value),
      badge_type: (value, values) => {
        formData.append(
          "is_special",
          value === "special_badge" ? "true" : "false"
        );
        if (value === "completion_percentage" && values.progress_percentage) {
          formData.append(
            "progress_percentage",
            String(values.progress_percentage)
          );
        }
      },
    };

    Object.entries(values).forEach(([key, value]) => {
      if (value && fieldMapper[key]) fieldMapper[key](value, values);
    });

    const file = fileList[0];
    if (file?.originFileObj) {
      formData.append("image", file.originFileObj);
    } else if (file?.url && generatedImage) {
      formData.append("image", generatedImage);
    } else if (file?.url) {
      const imageUrl =
        import.meta.env.VITE_ENV === "dev"
          ? file.url.replace(Image_URL, "")
          : file.url;
      formData.append("image_url", imageUrl);
    } else if (editBadge && !fileList.length) {
      formData.append("image", "");
    }

    try {
      const response = await api[editBadge ? "put" : "post"](
        editBadge
          ? `/api/badges/update/${editBadge.id}`
          : "/api/badges/create_badges",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status === 200) {
        Notifier({
          type: "success",
          title: "Success",
          description: `Badge ${
            editBadge ? "updated" : "created"
          } successfully`,
          duration: 3,
          placement: "bottomRight",
          colors,
        });
        handleCancel();
        onSuccess();
      } else {
        form.setFields([
          {
            name: "name",
            errors: [
              response.data?.message ||
                `Failed to ${editBadge ? "update" : "create"} badge`,
            ],
          },
        ]);
      }
    } catch (error) {
      Notifier({
        type: "error",
        title: "Error",
        description: `Error in ${
          editBadge ? "updating" : "creating"
        } the badge: ${error.message}`,
        colors,
      });
    }
  };

  const handleProjectChange = (value) => {
    const project = projects.find((p) => p.project_id.toString() === value);
    setSelectedProject(project);
    form.setFieldsValue({ project_id: value });
  };

  const handleGenerateClick = async () => {
    const badgeName = form.getFieldValue("name");
    if (!badgeName || !selectedProject) {
      Notifier({
        type: "error",
        description: "Please fill in badge name and select a project",
        colors,
      });
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await api.post(
        "/api/badges/generate-badge",
        {
          projectName: selectedProject.project_name,
          badgeName,
          description: form.getFieldValue("description"),
        },
        { signal: abortControllerRef.current.signal }
      );

      if (response.data.imageUrl) {
        const blob = await (
          await fetch(response.data.imageUrl, {
            signal: abortControllerRef.current.signal,
          })
        ).blob();
        setGeneratedImageFile(
          new File([blob], "generated-badge.png", { type: blob.type })
        );
        setIsGenerated(true);
        setFileList([
          {
            uid: "-1",
            name: "generated-badge.png",
            status: "done",
            url: response.data.imageUrl,
            originFileObj: new File([blob], "generated-badge.png", {
              type: blob.type,
            }),
          },
        ]);
        form.setFieldsValue({
          image: [
            {
              uid: "-1",
              name: "generated-badge.png",
              status: "done",
              url: response.data.imageUrl,
              originFileObj: new File([blob], "generated-badge.png", {
                type: blob.type,
              }),
            },
          ],
        });
      } else {
        throw new Error("No image URL returned from API");
      }
    } catch (error) {
      Notifier({
        type: "error",
        description: `Failed to generate badge: ${error.message}`,
        colors,
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRemoveImage = () => {
    fileList.forEach((file) => {
      if (file.url && file.originFileObj) {
        URL.revokeObjectURL(file.url);
      }
    });
    setFileList([]);
    setGeneratedImageFile(null);
    setIsGenerated(false);
    form.setFieldsValue({ image: [] });
  };

  const filterProjects = (input, option) =>
    option.children.toLowerCase().includes(input.toLowerCase());

  const dropdownRender = (menu) => (
    <Flex vertical>
      {menu}
      {visibleProjects < projects.length && (
        <Button
          type="link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVisibleProjects(projects.length);
            selectRef.current.focus();
          }}
        >
          Load More Projects
        </Button>
      )}
    </Flex>
  );

  return (
    <ConfigProvider theme={themeConfig}>
      <Modal
        title={
          <Row
            justify="space-between"
            align="middle"
            className="!px-5 !py-2 !-mx-6 !-mt-5 !mb-5 !rounded-t-lg !text-lg !font-bold"
            style={{ backgroundColor: colors.primary, color: "#fff" }}
          >
            <Col>
              <TrophyOutlined className="mr-2" />
              {editBadge ? "Edit Badge" : "Create New Badge"}
            </Col>
            <Col>
              <CloseOutlined
                className="cursor-pointer text-white text-base hover:text-red-400"
                onClick={handleCancel}
              />
            </Col>
          </Row>
        }
        closable={false}
        open={visible}
        onCancel={handleCancel}
        footer={null}
        width="90%"
        className="!max-w-[500px] !p-0"
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ badge_type: "special_badge" }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project_id"
                label={renderLabel(
                  <ProjectOutlined className="mr-2" />,
                  "Project Name",
                  true
                )}
                required={false}
                rules={[{ required: true, message: "Please select a Project" }]}
              >
                <Select
                  ref={selectRef}
                  placeholder="Select a project"
                  onChange={handleProjectChange}
                  showSearch
                  filterOption={filterProjects}
                  optionFilterProp="children"
                  dropdownRender={dropdownRender}
                >
                  {projects?.slice(0, visibleProjects).map((project) => (
                    <Option
                      key={project.project_id}
                      value={project.project_id.toString()}
                    >
                      {project.project_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label={renderLabel(
                  <TagOutlined className="mr-2" />,
                  "Badge Name",
                  true
                )}
                required={false}
                rules={[
                  { required: true, message: "Please enter the badge name" },
                  {
                    max: 20,
                    message: "Badge Name cannot exceed 20 characters",
                  },
                ]}
              >
                <Input
                  placeholder="e.g. Super Achiever"
                  onChange={(e) => {
                    form.setFieldsValue({ name: e.target.value });
                    form.validateFields(["name"]);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="description"
            label={renderLabel(
              <InfoCircleOutlined className="mr-2" />,
              "Description"
            )}
            rules={[
              { max: 100, message: "Description cannot exceed 100 characters" },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 2 }}
              maxLength={100}
              showCount
              onChange={(e) =>
                form.setFieldsValue({ description: e.target.value })
              }
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="image"
                label={renderLabel(
                  <FileImageOutlined className="mr-2" />,
                  "Badge Image"
                )}
                valuePropName="fileList"
                getValueFromEvent={(e) =>
                  Array.isArray(e) ? e : e?.fileList || []
                }
              >
                <Flex
                  wrap="wrap"
                  gap="small"
                  align="center"
                  style={{ width: "100%" }}
                >
                  <Upload
                    beforeUpload={() => false}
                    maxCount={1}
                    accept="image/*"
                    fileList={fileList}
                    listType="picture"
                    onChange={({ fileList: newFileList }) => {
                      const updatedFileList = newFileList.map((file) => {
                        if (file.originFileObj && !file.url) {
                          return {
                            ...file,
                            url: URL.createObjectURL(file.originFileObj),
                          };
                        }
                        return file;
                      });
                      setFileList(updatedFileList);
                      setIsGenerated(false);
                      form.setFieldsValue({ image: updatedFileList });
                    }}
                    showUploadList={false}
                  >
                    <Button style={{ width: "100%" }}>
                      <PlusOutlined /> Upload from Device
                    </Button>
                  </Upload>
                  <Flex align="center" style={{ position: "relative" }}>
                    <Button
                      type="primary"
                      onClick={handleGenerateClick}
                      disabled={isLoading}
                      style={{ minHeight: "32px" }}
                    >
                      {isLoading ? (
                        <Flex
                          align="center"
                          justify="center"
                          className="!w-full !h-full !scale-[0.5]"
                        >
                          <Loader isConstrained />
                        </Flex>
                      ) : isGenerated ? (
                        <Flex gap="small" align="center">
                          Regenerate
                          <Image
                            preview={false}
                            width={22}
                            src={AI}
                            alt="Generated AI icon"
                          />
                        </Flex>
                      ) : (
                        <Flex gap="small" align="center">
                          Generate
                          <Image
                            preview={false}
                            width={22}
                            src={AI}
                            alt="Generated AI icon"
                          />
                        </Flex>
                      )}
                    </Button>
                    {isLoading && (
                      <CloseOutlined
                        className="absolute top-2 left-[110px] bg-background rounded-full p-1 cursor-pointer text-red-500 text-xs"
                        onClick={() => abortControllerRef.current?.abort()}
                        style={{ backgroundColor: colors.background }}
                      />
                    )}
                  </Flex>
                </Flex>
                {fileList.length > 0 && (
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      marginTop: 8,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 4,
                      padding: 8,
                      width: 100,
                      height: 100,
                      position: "relative",
                    }}
                  >
                    <img
                      src={fileList[0].url}
                      alt="Badge Preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        borderRadius: 4,
                      }}
                      onError={(e) => (e.target.src = defaultBadgeImage)}
                    />
                    <CloseOutlined
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        backgroundColor: colors.background,
                        color: colors.textcolor,
                        borderRadius: "50%",
                        padding: 4,
                        cursor: "pointer",
                      }}
                      onClick={handleRemoveImage}
                    />
                  </Flex>
                )}
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Form.Item
                name="badge_type"
                label={renderLabel(
                  <StarOutlined className="mr-2" />,
                  "Badge Type",
                  true
                )}
                required={false}
                rules={[
                  { required: true, message: "Please select a badge type" },
                ]}
              >
                <Select
                  placeholder="Select badge type"
                  onChange={(value) =>
                    value === "special_badge" &&
                    form.setFieldsValue({ progress_percentage: null })
                  }
                >
                  <Option value="special_badge">Special Badge</Option>
                  <Option value="completion_percentage">
                    Completion Percentage
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) =>
                  prev.badge_type !== curr.badge_type
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue("badge_type") === "completion_percentage" && (
                    <Form.Item
                      name="progress_percentage"
                      label={renderLabel(null, "Progress Percentage", true)}
                      required={false}
                      rules={[
                        {
                          required: true,
                          message: "Please enter completion percentage",
                        },
                        {
                          type: "number",
                          min: 0,
                          max: 100,
                          message: "Percentage must be between 0 and 100",
                        },
                      ]}
                      validateTrigger="onBlur"
                    >
                      <InputNumber
                        placeholder="Add percentage"
                        addonAfter="%"
                        controls={false}
                        className="w-full"
                      />
                    </Form.Item>
                  )
                }
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0 }}>
            <Row justify="end" gutter={8}>
              <Col>
                <Button onClick={handleCancel}>Cancel</Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    background: colors.primary,
                    borderColor: colors.primary,
                  }}
                >
                  {editBadge ? "Update Badge" : "Create Badge"}
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default CreateBadgeModal;
