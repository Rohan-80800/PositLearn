import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Alert,
  Typography,
  Row,
  Col,
  Flex,
  ConfigProvider,
  Empty,
  Space,
  Image,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { fetchCheats, deleteCheat } from "../redux/cheatSheetSlice";
import { Colors } from "../config/color";
import ConfirmDeleteModal from "../components/confirm_delete_modal";
import Notifier from "../components/notifier";
import Loader from "../components/loader";
import { usePermissions } from "../permissions";

const { Title, Text } = Typography;

const Cheatsheet = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cheats, status, error } = useSelector((state) => state.cheats);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [cheatIdToDelete, setCheatIdToDelete] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState("idle");
  const { hasAccess } = usePermissions();

  const colors = Colors();

  useEffect(() => {
    dispatch(fetchCheats());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Notifier({
        type: "error",
        title: "Error",
        description: error,
        duration: 3,
        placement: "bottomRight",
        colors,
      });
    }
  }, [error, colors]);

  const handleDeleteCheat = (id) => {
    setCheatIdToDelete(id);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (cheatIdToDelete) {
      try {
        setDeleteStatus("loading");
        await dispatch(deleteCheat(cheatIdToDelete)).unwrap();
        Notifier({
          type: "success",
          title: "Success",
          description: "The cheatsheet has been successfully deleted.",
          duration: 3,
          placement: "bottomRight",
          colors,
        });
      } catch {
        Notifier({
          type: "error",
          title: "Error",
          description: "Failed to delete cheatsheet",
          duration: 3,
          placement: "bottomRight",
          colors,
        });
      } finally {
        setDeleteStatus("idle");
        setCheatIdToDelete(null);
        setDeleteModalVisible(false);
      }
    }
  };

  const handleCancelDelete = () => {
    setCheatIdToDelete(null);
    setDeleteModalVisible(false);
  };

  const handleViewCheat = (id) => {
    navigate(`/cheatsheet/${id}`);
  };

  const getSectionCount = (cheat) => {
    const resource =
      typeof cheat.resource === "string"
        ? JSON.parse(cheat.resource)
        : cheat.resource;
    return resource?.sections?.length || 0;
  };

  const getInitial = (title) => {
    return title ? title.charAt(0).toUpperCase() : "C";
  };

  const getInitialColor = (title) => {
    const index = title.length % colors.avatarColors.length;
    return colors.avatarColors[index];
  };

  if (status === "loading" && cheats.length === 0) {
    return (
      <Flex justify="center" align="center" className="w-full h-screen">
        <Loader isConstrained={true} />
      </Flex>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: colors.background,
          colorText: colors.textcolor,
          colorBgElevated: colors.background,
          colorPrimary: colors.menuhover,
          colorBorder: colors.border,
        },
        components: {
          Card: {
            colorBorder: colors.border,
          },
        },
      }}
    >
      <Space direction="vertical" size="large" className="p-6 w-full">
        <Flex className="flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Title
            level={2}
            className="!whitespace-nowrap text-lg sm:text-xl md:text-2xl lg:text-3xl"
          >
            Cheat Sheets
          </Title>
          {cheats.length > 0 && hasAccess("org:cheetsheet:manage") && (
            <Button
              style={{
                background: colors.primary,
                color: colors.white,
                borderColor: colors.primary,
              }}
              icon={<PlusOutlined />}
              onClick={() => navigate("/cheatsheet/new")}
            >
              Add Cheatsheet
            </Button>
          )}
        </Flex>
        {status === "failed" && (
          <Alert type="error" message={error} className="m-5" />
        )}

        {cheats.length > 0 ? (
          <Row gutter={[16, 16]}>
            {cheats.map((cheat) => {
              const sectionCount = getSectionCount(cheat);
              const initial = getInitial(cheat.title);
              const initialColor = getInitialColor(cheat.title);
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={cheat.id}>
                  <Card
                    hoverable
                    onClick={() => handleViewCheat(cheat.id)}
                    className="!h-full !flex !flex-col !p-0"
                    bodyStyle={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      padding: "10px",
                    }}
                  >
                    <Flex vertical gap={10} style={{ height: "100%" }}>
                      <Flex align="center" gap={10}>
                        <Text
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm !text-white leading-none"
                          style={{ backgroundColor: initialColor }}
                        >
                          {initial}
                        </Text>
                        <Text
                          strong
                          className="max-w-[100px] truncate overflow-hidden text-ellipsis whitespace-nowrap"
                          title={cheat.title}
                        >
                          {cheat.title}
                        </Text>
                      </Flex>
                      <Text
                        className="!m-1"
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ flex: 1 }}
                      >
                        {cheat.description}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Updated :{" "}
                        {new Date(cheat.updated_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </Text>
                      <hr
                        className="border"
                        style={{
                          borderColor: colors.border,
                          margin: "10px -10px",
                        }}
                      />
                      <Flex
                        justify="space-between"
                        align="center"
                        className="!relative !-mt-3 !pt-0"
                      >
                        <Text type="secondary">
                          {sectionCount} section{sectionCount !== 1 ? "s" : ""}
                        </Text>
                        {hasAccess("org:cheetsheet:manage") && (
                          <Space>
                            <Button
                              type="text"
                              icon={
                                <Icon
                                  icon="mdi:pencil"
                                  width="18"
                                  className={`cursor-pointer ${colors.darkGray}`}
                                />
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/cheatsheet/edit/${cheat.id}`);
                              }}
                            />
                            <Button
                              type="text"
                              danger
                              icon={
                                <Icon
                                  icon="mdi:trash-can"
                                  width="18"
                                  className="text-red-400"
                                />
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCheat(cheat.id);
                              }}
                            />
                          </Space>
                        )}
                      </Flex>
                    </Flex>
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Col
            justify="center"
            align="middle"
            style={{ height: "50vh", textAlign: "center", padding: "20px" }}
          >
            <Col>
              <Space
                direction="vertical"
                align="center"
                size="middle"
                className="border border-dashed border-gray-300 rounded-lg px-4 sm:px-8 md:px-12 lg:px-24 py-5 w-full max-w-screen-md mx-auto text-center"
              >
                <Empty
                  image={
                    <Image
                      src="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                      alt="empty"
                      preview={false}
                       className="!mb-4 !w-32 !sm:w-40 !md:w-52"
                      style={{ marginBottom: 16 }}
                    />
                  }
                  description={
                    <Text style={{ color: colors.textcolor }}>
                      No cheatsheets available.
                    </Text>
                  }
                />
                {hasAccess("org:cheetsheet:manage") && (
                  <Button
                    type="primary"
                    style={{
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      color: colors.white,
                    }}
                    onClick={() => navigate("/cheatsheet/new")}
                  >
                    Create Cheatsheet
                  </Button>
                )}
              </Space>
            </Col>
          </Col>
        )}

        <ConfirmDeleteModal
          visible={deleteModalVisible}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          title="Confirm Deletion"
          description="Are you sure you want to delete this cheatsheet? This action cannot be undone."
          confirmLoading={deleteStatus === "loading"} 
        />
      </Space>
    </ConfigProvider>
  );
};

export default Cheatsheet;
