import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Button,
  Modal,
  Input,
  Card,
  Select,
  Upload,
  message,
  Empty,
  Typography,
  Flex,
  Tabs,
  ConfigProvider,
  Space,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import CustomTable from "./customTable";
import ConfirmDeleteModal from "./confirm_delete_modal";
import { Colors } from "../config/color";
import CanvasDraw from "react-canvas-draw";
import Loader from "./loader";
import Notifier from "./notifier";
import {
  fetchValidators,
  fetchAvailableProjects,
  createValidatorAsync,
  updateValidatorAsync,
  deleteValidatorAsync,
  setModalState,
  setValidatorData,
  resetValidatorData,
  setDeleteModal,
  clearError,
} from "../redux/validatorsSlice";
import FormLabel from "./formLable";
import { FaUser } from "react-icons/fa";
import { Icon } from "@iconify/react";

const { Text } = Typography;

const handleActionNotification = (action, successMessage, errorMessage, colors) => {
  if (action.type.endsWith('/fulfilled')) {
    Notifier({
      type: "success",
      ...successMessage,
      colors,
    });
  } else if (action.type.endsWith('/rejected')) {
    Notifier({
      type: "error",
      title: errorMessage.title,
      description: action.payload || errorMessage.description,
      colors,
    });
  }
};

const CertificateValidators = () => {
  const dispatch = useDispatch();
  const colors = Colors();
  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorPrimary: colors.primary,
      colorBorderSecondary: colors.border,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
      },
      Table: {
        headerColor: colors.textcolor,
        colorText: colors.textcolor,
        rowHoverBg: colors.theme,
      },
      Select: {
        optionSelectedBg: colors.theme,
        colorTextPlaceholder: colors.placeholderGray,
        colorIcon: colors.textcolor,
        optionActiveBg: colors.hoverGray,
        hoverBorderColor: colors.primary,
        activeBorderColor: colors.primary,
      },
      Modal: {
        titleColor: colors.textcolor,
        colorIcon: colors.textcolor,
      },
      Input: {
        colorBorder: colors.border,
        hoverBorderColor: colors.primary,
        activeBorderColor: colors.primary,
      },
      Upload: { controlHeightLG: 45 },
    },
  };
  const {
    validators,
    availableProjects,
    modalState,
    validatorData,
    deleteModal,
    isLoading,
    error,
  } = useSelector((state) => state.validators);
  const [activeErrorField, setActiveErrorField] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [canvasWarning, setCanvasWarning] = useState(false);
  const [tabVisible, setTabVisible] = useState(!validatorData.signature);
  const canvasRef = useRef(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(
    validatorData.signature || null
  );

  useEffect(() => {
    dispatch(fetchValidators());
    dispatch(fetchAvailableProjects());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);

    if (!validatorData.name?.trim()) {
      setActiveErrorField("name");
      return;
    }
    if (!validatorData.designation?.trim()) {
      setActiveErrorField("designation");
      return;
    }
    if (!validatorData.signature?.trim()) {
      setActiveErrorField("signature");
      return;
    }
    setActiveErrorField(null);
    setSubmitted(false);

    const successMessage = modalState.isEdit
      ? {
            title: "Validator Updated",
            description: "The validator has been successfully updated.",
        }
      : {
            title: "Validator Created",
            description: "The validator has been successfully created.",
        };

    const errorMessage = modalState.isEdit
      ? {
          title: "Update Failed",
          description: "Failed to update validator.",
        }
      : {
            title: "Creation Failed",
            description: "Failed to create validator.",
        };

    const actionCreator = modalState.isEdit
      ? updateValidatorAsync({ id: modalState.editId, ...validatorData })
      : createValidatorAsync(validatorData);

    dispatch(actionCreator).then((action) => {
      handleActionNotification(action, successMessage, errorMessage, colors);
    });
  }, [dispatch, modalState, validatorData, colors]);

  const handleSaveSignature = () => {
    if (!canvasRef?.current) return;

    const dataURL = canvasRef.current.getDataURL();
    const img = new Image();
    img.src = dataURL;

    img.onload = () => {
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );
      const data = imageData.data;

      let isBlank = true;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] !== 0) {
          isBlank = false;
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
      }

      if (isBlank) {
        setCanvasWarning(true);
        return;
      }

      ctx.putImageData(imageData, 0, 0);

      const finalDataURL = tempCanvas.toDataURL();
      dispatch(setValidatorData({ signature: finalDataURL }));
      setCanvasWarning(false);
      setTabVisible(false);

      if (activeErrorField === "signature") {
        setActiveErrorField(null);
      }
    };
  };

  const handleSaveUploadedSignature = () => {
    if (!uploadedFile) {
      setCanvasWarning(true);
      return;
    }
    dispatch(setValidatorData({ signature: uploadedFile }));
    setTabVisible(false);
    setCanvasWarning(false);

    if (activeErrorField === "signature") {
      setActiveErrorField(null);
    }
  };

  const handleAddValidator = () => {
    dispatch(fetchAvailableProjects());
    dispatch(setModalState({ isOpen: true, isEdit: false }));
    dispatch(resetValidatorData());
    setUploadedFile(null);
  };

  const handleCancelModal = () => {
    dispatch(setModalState({ isOpen: false }));
    setSubmitted(false);
    setActiveErrorField(null);
    setCanvasWarning(false);
  };

  const renderName = (name) => (
    <Text style={{ display: "inline-flex", alignItems: "center" }}>
      <FaUser style={{ marginRight: 8, fontSize: "16px" }} /> {name}
    </Text>
  );

  const renderProjects = (_, record) => (
    <Space direction="vertical" className="w-full text-center">
      <Text>{record.projects?.length || 0}</Text>
    </Space>
  );

  const renderSignature = (sig) => (
    <Space className="flex justify-center w-full">
      {sig && (
        <img
          src={sig}
          alt="signature"
          className="h-7 object-contain bg-gray-100 p-1 rounded"
        />
      )}
    </Space>
  );

  const renderActions = (_, record) => (
    <Flex justify="center" gap={10}>
      <Icon
        icon="mdi:pencil"
        width="18"
        className={`cursor-pointer ${colors.darkGray}`}
        size="small"
        onClick={() => {
          dispatch(fetchAvailableProjects());
          dispatch(
            setModalState({ isOpen: true, isEdit: true, editId: record.id })
          );
          dispatch(
            setValidatorData({
              ...record,
              projects:
                record.projects?.map((p) => ({
                  label: p.project_name,
                  value: p.id,
                })) || [],
            })
          );
          if (record.signature) {
            setUploadedFile(record.signature);
            setTabVisible(false);
          } else {
            setTabVisible(true);
          }
        }}
      />
      <Icon
        icon="mdi:trash-can"
        width="18"
        className="cursor-pointer text-red-400"
        size="small"
        danger
        onClick={() =>
          dispatch(
            setDeleteModal({
              isOpen: true,
              validatorId: record.id,
            })
          )
        }
      />
    </Flex>
  );

  const handleDeleteValidator = (validatorId) => {
    const successMessage = {
      title: "Validator Deleted",
      description: "The validator has been successfully deleted.",
    };
    const errorMessage = {
      title: "Deletion Failed",
      description: "Failed to delete validator.",
    };

    dispatch(deleteValidatorAsync(validatorId)).then((action) => {
      handleActionNotification(action, successMessage, errorMessage, colors);
    });
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: "20%", 
      render: renderName,
    },
    {
      title: "Designation",
      dataIndex: "designation",
      key: "designation",
      width: "20%", 
      align: "center",
    },
    {
      title: "Projects",
      key: "projects",
      width: "20%",
      align: "center",
      render: renderProjects,
    },
    {
      title: "Signature",
      dataIndex: "signature",
      key: "signature",
      width: "20%", 
      align: "center",
      render: renderSignature,
    },
    {
      title: "Actions",
      key: "actions",
      width: "20%", 
      align: "center",
      render: renderActions,
    },
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <Flex justify="flex-end" style={{ marginBottom: "8px" }}>
        <Button
          type="primary"
          onClick={handleAddValidator}
          style={{
            backgroundColor: colors.primary,
            whiteSpace: "nowrap",
            boxShadow: "none",
            defaultShadow: "none",
          }}
        >
          <PlusOutlined /> Add Validator
        </Button>
      </Flex>

      <Card
        title="Certificate Validators"
        className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
        styles={{
          body: { padding: 0 },
          head: { borderBlockStyle: "none" },
        }}
        style={{ borderColor: colors.background }}
      >
        {isLoading ? (
          <Flex
            align="center"
            justify="center"
            style={{ height: "100%", width: "100%" }}
          >
            <Loader isConstrained={true} />
          </Flex>
        ) : validators.length > 0 ? (
          <CustomTable
            columns={columns}
            dataSource={validators}
            rowKey="id"
            pageSize={5}
          />
        ) : (
          <Empty
            image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
            imageStyle={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "50px",
            }}
            description={
              <Text level={4} style={{ color: colors.textcolor }}>
                No Data
              </Text>
            }
          />
        )}
      </Card>

      <Modal
        title={`${modalState.isEdit ? "Edit" : "Add"} Validator`}
        open={modalState.isOpen}
        onOk={handleSubmit}
        okText={modalState.isEdit ? "Update" : "Add"}
        confirmLoading={isLoading}
        destroyOnClose
        onCancel={handleCancelModal}
        okButtonProps={{
          style: {
            backgroundColor: colors.primary,
            whiteSpace: "nowrap",
            boxShadow: "none",
            defaultShadow: "none",
          },
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="vertical" size={1} style={{ width: "100%" }}>
            <FormLabel text="Name" required />
            <Input
              placeholder="Enter name"
              className="!shadow-none"
              value={validatorData.name}
              onChange={(e) => {
                dispatch(setValidatorData({ name: e.target.value }));
                if (activeErrorField === "name") {
                  setActiveErrorField(null);
                }
              }}
            />
            {submitted && activeErrorField === "name" && (
              <Text type="danger">Name is required</Text>
            )}
          </Space>

          <Space direction="vertical" size={1} style={{ width: "100%" }}>
            <FormLabel text="Designation" required />
            <Input
              className="!shadow-none"
              placeholder="Enter designation"
              value={validatorData.designation}
              onChange={(e) => {
                dispatch(setValidatorData({ designation: e.target.value }));
                if (activeErrorField === "designation") {
                  setActiveErrorField(null);
                }
              }}
            />
            {submitted && activeErrorField === "designation" && (
              <Text type="danger">Designation is required</Text>
            )}
          </Space>

          <Space direction="vertical" size={1} style={{ width: "100%" }}>
            <FormLabel text="Assigned Projects" />
            <Select
              mode="multiple"
              placeholder="Select projects"
              options={availableProjects.map((p) => ({
                value: p.id,
                label: p.project_name,
                disabled:
                  p.validatorId && !validatorData.projects.includes(p.id),
              }))}
              value={validatorData.projects}
              onChange={(values) =>
                dispatch(setValidatorData({ projects: values }))
              }
              className="w-full"
              optionFilterProp="label"
              showSearch
            />
          </Space>

          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <FormLabel text="Signature" required />
            {submitted && activeErrorField === "signature" && (
              <Text type="danger">Signature is required</Text>
            )}

            {validatorData.signature && !tabVisible ? (
              <Space direction="vertical" size="small">
                <img
                  src={validatorData.signature}
                  alt="signature"
                  className="!h-25 !w-65 object-contain bg-gray-100 p-1 rounded"
                />
                <Flex gap={10} style={{ marginTop: "10px" }}>
                  <Icon
                    icon="mdi:pencil"
                    width="18"
                    className={`cursor-pointer ${colors.darkGray}`}
                    size="small"
                    onClick={() => {
                      setTabVisible(true);
                      setUploadedFile(validatorData.signature || null);
                      if (canvasRef.current) canvasRef.current.clear();
                    }}
                  />
                  <Icon
                    icon="mdi:trash-can"
                    width="18"
                    className="cursor-pointer text-red-400"
                    size="small"
                    danger
                    onClick={() => {
                      dispatch(setValidatorData({ signature: "" }));
                      setUploadedFile(null);
                      if (canvasRef.current) canvasRef.current.clear();
                      setTabVisible(true);
                    }}
                  />
                </Flex>
              </Space>
            ) : (
              <Tabs
                className="custom-tabs"
                defaultActiveKey="1"
                onChange={(key) => {
                  if (key === "1") {
                    setCanvasKey((prev) => prev + 1);
                  }
                  setCanvasWarning(false);
                }}
              >
                <Tabs.TabPane tab="Draw Signature" key="1">
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    <CanvasDraw
                      key={canvasKey}
                      ref={(canvas) => {
                        if (canvas) {
                          canvasRef.current = canvas;
                          window.signatureCanvas = canvas;
                        }
                      }}
                      canvasWidth={250} 
                      canvasHeight={115}
                      brushRadius={1}
                      lazyRadius={0}
                      brushColor={colors.textcolor}
                      hideGrid
                      style={{
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                        backgroundColor: colors.background,
                      }}
                    />
                    {canvasWarning && (
                      <Text type="danger" style={{ fontSize: "12px" }}>
                        Cannot save blank signature.
                      </Text>
                    )}
                    <Flex gap={8}>
                      <Button
                        type="default"
                        onClick={() => canvasRef.current?.clear()}
                      >
                        Clear
                      </Button>
                      <Button
                        type="primary"
                        onClick={handleSaveSignature}
                        style={{
                          backgroundColor: colors.primary,
                          whiteSpace: "nowrap",
                          boxShadow: "none",
                          defaultShadow: "none",
                        }}
                      >
                        Save Signature
                      </Button>
                    </Flex>
                  </Space>
                </Tabs.TabPane>

                <Tabs.TabPane tab="Upload Signature" key="2">
                  <Space direction="vertical" size="middle">
                    <Upload
                      accept="image/*"
                      listType="picture-card"
                      maxCount={1}
                      showUploadList={{
                        showPreviewIcon: false,
                        showRemoveIcon: true,
                      }}
                      beforeUpload={(file) => {
                        const isImage = file.type.startsWith("image/");
                        if (!isImage) {
                          message.error("Only image files are allowed!");
                          return Upload.LIST_IGNORE;
                        }
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setUploadedFile(e.target.result);
                          setCanvasWarning(false);
                        };
                        reader.readAsDataURL(file);

                        return false;
                      }}
                      fileList={
                        uploadedFile
                          ? [
                              {
                                uid: "-1",
                                name: "signature.png",
                                status: "done",
                                url: uploadedFile,
                              },
                            ]
                          : []
                      }
                      onChange={(info) => {
                        if (info.file.status === "removed") {
                          setUploadedFile(null);
                          setCanvasWarning(true);
                        }
                      }}
                    >
                      {!uploadedFile && (
                        <Flex vertical align="center" gap={8}>
                          <PlusOutlined style={{ fontSize: "24px" }} />
                          <Text>Upload</Text>
                        </Flex>
                      )}
                    </Upload>

                    {canvasWarning && (
                      <Text type="danger" style={{ fontSize: "12px" }}>
                        {uploadedFile
                          ? "Cannot save blank signature."
                          : "Please upload a signature."}
                      </Text>
                    )}

                    <Button
                      type="primary"
                      onClick={handleSaveUploadedSignature}
                      disabled={!uploadedFile}
                      style={{
                        backgroundColor: colors.primary,
                        whiteSpace: "nowrap",
                        color: colors.white,
                      }}
                    >
                      Save Signature
                    </Button>
                  </Space>
                </Tabs.TabPane>
              </Tabs>
            )}
          </Space>
        </Space>
      </Modal>

      <ConfirmDeleteModal
        visible={deleteModal.isOpen}
        onConfirm={() => handleDeleteValidator(deleteModal.validatorId)}
        onCancel={() => dispatch(setDeleteModal({ isOpen: false }))}
        loading={isLoading}
        title="Delete Validator"
        content="Are you sure you want to delete this validator?"
      />
    </ConfigProvider>
  );
};

export default CertificateValidators;
