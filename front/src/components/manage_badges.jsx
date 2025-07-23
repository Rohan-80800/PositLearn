import { useEffect, useState } from "react";
import {
  Layout,
  ConfigProvider,
  Select,
  Avatar,
  Space,
  Card,
  Tooltip,
  Button,
  Modal,
  Empty,
  Typography,
  Row,
  Col,
  Flex,
} from "antd";
import { Icon } from "@iconify/react";
import { useDispatch, useSelector } from "react-redux";
import { showLoader, hideLoader } from "../redux/loderSlice";
import { Colors } from "../config/color";
import CustomTable from "./customTable";
import ConfirmDeleteModal from "./confirm_delete_modal";
import { PlusOutlined } from "@ant-design/icons";
import { useUser } from "@clerk/clerk-react";
import Loader from "../components/loader";
import api from "../axios";
import { usePermissions } from "../permissions";
import CreateBadgeModal from "./create_badge_modal";
import { motion } from "framer-motion";
import defaultBadgeImage from "../assets/badge2.png";
import Notifier from "./notifier";

const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");

function ManageBadges() {
  const { Content } = Layout;
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.loader);
  const { user } = useUser();
  const colors = Colors();
  const { hasAccess } = usePermissions();
  const [badges, setBadges] = useState({ data: [], projects: [] });
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [editBadge, setEditBadge] = useState(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all");
  const { Title, Paragraph, Text } = Typography;

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorTextPlaceholder: colors.placeholderGray,
      colorPrimary: colors.primary,
      colorBorderSecondary: colors.border,
      motion: false,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
      },
      Select: {
        colorTextPlaceholder: colors.placeholderGray,
      },
      Table: {
        headerColor: colors.textcolor,
        colorText: colors.textcolor,
        rowHoverBg: colors.theme,
      },
      Input: {
        hoverBorderColor: colors.primary,
      },
      Button: {
        colorPrimary: colors.primary,
        colorPrimaryHover: colors.primaryHover || colors.primary,
      },
      Modal: {
        contentBg: colors.badges,
        headerBg: colors.badges,
        titleColor: colors.textcolor,
        colorIcon: colors.textcolor,
      },
    },
  };

  const fetchBadges = async () => {
    dispatch(showLoader());
    try {
      const response = await api.get(`api/badges/`);
      const result = response.data || response;
      const isSuccess = response.status >= 200 && response.status < 300;
      if (isSuccess) {
        setBadges({
          data: result.data || [],
          projects: result.projects || [],
        });
      }
    } finally {
      dispatch(hideLoader());
    }
  };

  useEffect(() => {
    fetchBadges();
  }, [dispatch, user.id]);

  const handleCreateBadge = () => {
    setEditBadge(null);
    setIsCreateModalVisible(true);
  };

  const handleCreateCancel = () => {
    setIsCreateModalVisible(false);
    setEditBadge(null);
  };

  const handleEditClick = (record) => {
    setEditBadge(record);
    setIsCreateModalVisible(true);
  };

  const handleViewDetails = (record) => {
    setSelectedBadge(record);
    setIsViewModalVisible(true);
  };

  const handleDeleteClick = (record) => {
    setSelectedBadge(record);
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBadge?.id) return;

    try {
      const response = await api.delete(
        `/api/badges/delete/${selectedBadge.id}`,
        {
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );
      if (response.status === 200) {
        await fetchBadges();
        Notifier({
          type: "success",
          description: `Badge ${selectedBadge?.title} deleted successfully`,
          colors,
        });
      } else {
        throw new Error(response.data?.message || "Failed to delete badge");
      }
    } catch (error) {
      Notifier({
        type: "error",
        description: `Failed to delete badge ${selectedBadge?.title}: ${error.message}`,
        colors,
      });
    } finally {
      setIsDeleteModalVisible(false);
      setSelectedBadge(null);
    }
  };

  const handleProjectSelect = (value) => {
    setSelectedProjectFilter(value);
  };

  const dataSource = badges.data
    .filter((badge) =>
      selectedProjectFilter === "all"
        ? true
        : badge.project_id?.toString() === selectedProjectFilter
    )
    .map((badge) => ({
      ...badge,
      key: badge.id,
    }));

  const columns = [
    {
      title: "Badge",
      key: "badge",
      width: 200,
      render: (_, record) => {

        return (
          <Space size="small">
            <Avatar
              src={
                record.image
                  ? import.meta.env.VITE_ENV === "dev"
                    ? `${Image_URL}${record.image}`
                    : `${record.image}`
                  : defaultBadgeImage
              }
              size="default"
              shape="square"
            />
            <Space direction="vertical" size={0}>
              <Text className="text-xm font-semibold block">
                {record.title}
              </Text>
              <Text type="secondary" className="text-xs block text-gray-500">
                {record.project || "No project"}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Completion Percentage",
      dataIndex: "badge_specific_progress",
      key: "completion_percentage",
      width: 150,
      render: (percentage) => (
        <Text style={{ color: colors.textcolor }}>{percentage || 0}%</Text>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      width: 250,
      render: (text) => (
        <Tooltip title={text}>
          <Text
            className="text-sm truncate block max-w-[200px]"
            style={{ color: colors.textgray }}
          >
            {text || "No description"}
          </Text>
        </Tooltip>
      ),
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
              className="cursor-pointer !text-blue-600"
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

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="!m-0 !p-0 min-h-screen overflow-hidden">
        <Content
          className="!m-0 !p-0 h-full overflow-auto"
          style={{ backgroundColor: colors.theme }}
        >
          <Layout.Content className="p-4">
            <Title className="text-3xl font-bold">Badge Studio</Title>
            <Paragraph style={{ color: colors.modaltext }}>
              Manage Badges for Projects
            </Paragraph>

            <Flex
              direction="row"
              className="mt-6 justify-end w-full !space-x-4"
              align="center"
            >
              {badges.projects.length > 0 && (
                <Select
                  showSearch
                  placeholder="Select project"
                  optionFilterProp="label"
                  onChange={handleProjectSelect}
                  value={selectedProjectFilter}
                  style={{ width: 150, height: 35 }}
                  dropdownStyle={{
                    maxHeight: 300,
                    overflowY: "auto",
                    backgroundColor: colors.background,
                  }}
                  filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  <Select.Option value="all" label="All Badges">
                    All Badges
                  </Select.Option>
                  {badges.projects.map((project) => (
                    <Select.Option
                      key={project.project_id.toString()}
                      value={project.project_id.toString()}
                      label={project.project_name}
                    >
                      {project.project_name}
                    </Select.Option>
                  ))}
                </Select>
              )}
              {hasAccess("org:learning:manage") && (
                <Button
                  type="primary"
                  onClick={handleCreateBadge}
                  style={{ width: "150px", height: "35px" }}
                  className="!px-4 !py-2 text-white font-semibold rounded-md"
                >
                  <PlusOutlined /> Create Badge
                </Button>
              )}
            </Flex>

            <Card
              title="Badges"
              className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden !mt-3"
              styles={{
                body: { padding: 0 },
                head: { borderBlockStyle: "none" },
              }}
              style={{ borderColor: colors.background }}
            >
              {isLoading ? (
                <Row className="flex items-center justify-center min-h-[310px] w-full">
                <Col>
                  <Loader />
                </Col>
               </Row>
              ) : dataSource.length === 0 ? (
                <Row justify="center" align="middle" className="min-h-[310px]">
                  <Col>
                  <Paragraph style={{ color: colors.textgray }}>
                    {selectedProjectFilter === "all" ? (
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
                            No Badges available
                          </Text>
                        }
                      />
                    ) : (
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
                            No badges available for this project
                          </Text>
                        }
                      />
                    )}
                  </Paragraph>
                </Col>
               </Row>
              ) : (
                <CustomTable
                  columns={columns}
                  dataSource={dataSource}
                  rowKey="key"
                  pageSize={4}
                  rowClassName="consistent-row"
                />
              )}
            </Card>
          </Layout.Content>

          <CreateBadgeModal
            visible={isCreateModalVisible}
            onCancel={handleCreateCancel}
            onSuccess={fetchBadges}
            projects={badges.projects}
            colors={colors}
            editBadge={editBadge}
          />
          <ConfirmDeleteModal
            visible={isDeleteModalVisible}
            onConfirm={handleConfirmDelete}
            onCancel={() => setIsDeleteModalVisible(false)}
            title="Confirm Deletion"
            description={`Are you sure you want to delete badge ${selectedBadge?.title}?`}
          />
          <Modal
            title={null}
            open={isViewModalVisible}
            onCancel={() => setIsViewModalVisible(false)}
            footer={null}
            width="90vw"
            className="!max-w-[400px] !text-center"
            centered
          >
            {selectedBadge && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={modalVariants}
              >
                <Title
                  className="!text-lg !font-bold !mb-4"
                  style={{ color: colors.darkBlueGray }}
                >
                  {selectedBadge.title}
                </Title>
                <motion.img
                  src={
                    selectedBadge.image
                      ? import.meta.env.VITE_ENV === "dev"
                        ? `${Image_URL}${selectedBadge.image}`
                        : `${selectedBadge.image}`
                      : defaultBadgeImage
                  }
                  alt={selectedBadge.title}
                  className="!w-32 !h-32 !mx-auto !mb-4 md:!w-40 md:!h-40"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                <Paragraph className="!text-sm !mb-4 !text-gray-500">
                  {selectedBadge.description || "No description"}
                </Paragraph>
                {selectedBadge.project && (
                  <Paragraph className="!text-sm !font-semibold !text-[#4A90E2] !mt-4">
                    <Text className="!font-normal !text-gray-500">
                      Project Name -{" "}
                    </Text>
                    {selectedBadge.project}
                  </Paragraph>
                )}
                {selectedBadge.badge_specific_progress > 0 && (
                  <Paragraph className="!text-sm !text-gray-500 !mt-4">{`${selectedBadge.badge_specific_progress}% Completion`}</Paragraph>
                )}
                {selectedBadge.is_special && (
                  <Paragraph className="!text-xs !text-yellow-600 !mt-2">
                    Special Achievement
                  </Paragraph>
                )}
              </motion.div>
            )}
          </Modal>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default ManageBadges;
