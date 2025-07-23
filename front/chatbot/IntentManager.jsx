import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchIntents,
  createIntent,
  updateIntent,
  deleteIntent,
} from "../src/redux/intentSlice";
import {
  Button,
  Input,
  Modal,
  Form,
  Card,
  List,
  Typography,
  Flex,
  ConfigProvider,
  Empty,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Colors } from "../src/config/color";
import Loader from "../src/components/loader";
import FormLabel from "../src/components/formLable";
import ConfirmDeleteModal from "../src/components/confirm_delete_modal";
import { FaRobot } from "react-icons/fa";
import { Icon } from "@iconify/react";
import CustomTable from "../src/components/customTable";
import Notifier from "../src/components/notifier";

const { Text } = Typography;

const IntentManager = () => {
  const dispatch = useDispatch();
  const colors = Colors();
  const { intents, loading } = useSelector((state) => state.intent);
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIntent, setEditIntent] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    intentName: null,
  });

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
      List: {
        colorText: colors.textcolor,
        colorTextDescription: colors.textcolor,
      },
      Input: {
        hoverBorderColor: colors.primary,
      },
      Modal: {
        titleColor: colors.textcolor,
        colorIcon: colors.textcolor,
      },
    },
  };

  useEffect(() => {
    dispatch(fetchIntents());
  }, [dispatch]);

  const onFinish = (values) => {
    const formattedValues = {
      name: values.intentName,
      training_phrases: Array.isArray(values.trainingPhrases)
        ? values.trainingPhrases.map((s) => s.trim())
        : typeof values.trainingPhrases === "string"
        ? values.trainingPhrases.split(",").map((s) => s.trim())
        : [],
      response: values.responses,
    };

    const handleResult = (result, successMsg) => {
      if (result.meta?.requestStatus === "fulfilled") {
        Notifier({
          type: "success",
          description: successMsg,
          colors,
        });
        setIsModalOpen(false);
        form.resetFields();
        setEditIntent(null);
      } else if (result.payload) {
        Notifier({
          type: "error",
          title: result.payload.title,
          description: result.payload.message,
          colors,
        });
      } else {
        Notifier({
          type: "error",
          description: result.error?.message || "Something went wrong",
          colors,
        });
      }
    };

    if (editIntent) {
      dispatch(
        updateIntent({
          intentName: editIntent.name,
          updatedIntent: formattedValues,
        })
      ).then((result) => handleResult(result, "Intent updated successfully"));
    } else {
      dispatch(createIntent(formattedValues)).then((result) =>
        handleResult(result, "Intent created successfully")
      );
    }
  };

  const handleAddIntent = () => {
    form.resetFields();
    setEditIntent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (intent) => {
    setEditIntent(intent);
    form.setFieldsValue({
      intentName: intent.name,
      trainingPhrases: intent.training_phrases,
      responses: intent.response,
    });
    setIsModalOpen(true);
  };

  const handleDeleteIntent = async (intentName) => {
    try {
      const result = await dispatch(deleteIntent(intentName));

      if (result.meta.requestStatus === "fulfilled") {
        Notifier({
          type: "success",
          description: `"${intentName}" has been successfully deleted.`,
          colors,
        });
      } else {
        const errorMessage =
          result.payload?.message ||
          `Could not delete "${intentName}". Please try again.`;

        Notifier({
          type: "error",
          description: errorMessage,
          colors,
        });
      }
    } catch (error) {
      Notifier({
        type: "error",
        description:
          error.message ||
          `An unexpected error occurred while deleting "${intentName}"`,
        colors,
      });
    } finally {
      setDeleteModal({ isOpen: false, intentName: null });
    }
  };

  const renderIntentName = (name) => (
    <Text className="!inline-flex !items-center">
      <FaRobot className="!mr-2 !text-[16px]" /> {name}
    </Text>
  );

  const renderTrainingPhrases = (phrases) => (
    <List
      split={false}
      size="small"
      dataSource={phrases}
      renderItem={(item) => (
        <List.Item style={{ padding: 0 }}>
          <Text>{item}</Text>
        </List.Item>
      )}
    />
  );

  const renderResponses = (responses) => (
    <Text className="!whitespace-pre-wrap !break-words !max-w-[250px] !inline-block">
      {responses}
    </Text>
  );

  const renderActions = (intent) => (
    <div className="flex justify-center gap-2">
      <Icon
        icon="mdi:pencil"
        width="18"
        className={`cursor-pointer ${colors.darkGray}`}
        size="small"
        onClick={() => handleEdit(intent)}
      />
      <Icon
        icon="mdi:trash-can"
        width="18"
        className="cursor-pointer text-red-400"
        size="small"
        onClick={() =>
          setDeleteModal({
            isOpen: true,
            intentName: intent.name,
          })
        }
      />
    </div>
  );

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: renderIntentName,
    },
    {
      title: "Training Phrases",
      dataIndex: "training_phrases",
      key: "training_phrases",
      render: renderTrainingPhrases,
    },
    {
      title: "Responses",
      dataIndex: "response",
      key: "response",
      render: renderResponses,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      align: "center",
      render: renderActions,
    },
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <Flex
        justify="flex-end"
        style={{ marginBottom: "8px" }}
      >
        <Button
          type="primary"
          onClick={handleAddIntent}
          style={{
            backgroundColor: colors.primary,
            whiteSpace: "nowrap",
            boxShadow: "none",
          }}
        >
          <PlusOutlined /> Add Intent
        </Button>
      </Flex>

      <Card
        title="Intent Manager"
        className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
        styles={{
          body: { padding: 0 },
          head: { borderBlockStyle: "none" },
        }}
        style={{ borderColor: colors.background }}
      >
        {loading ? (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <Loader isConstrained={true} />
          </div>
        ) : intents.length > 0 ? (
          <CustomTable
            columns={columns}
            dataSource={intents}
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
              <Text
                level={4}
                style={{ color: colors.textcolor }}
              >
                No Intents Found
              </Text>
            }
          />
        )}
      </Card>

      <Modal
        title={`${editIntent ? "Edit" : "Add"} Intent`}
        open={isModalOpen}
        onOk={() => form.submit()}
        okText={editIntent ? "Update" : "Add"}
        confirmLoading={loading}
        destroyOnClose
        onCancel={() => {
          setIsModalOpen(false);
          setEditIntent(null);
        }}
        okButtonProps={{
          style: {
            backgroundColor: colors.primary,
            whiteSpace: "nowrap",
            boxShadow: "none",
          },
        }}
      >
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="intentName"
            label={
              <FormLabel
                text="Intent Name"
                required
              />
            }
            rules={[
              {
                validator: (_, value) => {
                  if (!value || !value.trim()) {
                    return Promise.reject(
                      new Error("Please enter a valid intent name")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder="Enter intent name"
              className="!shadow-none"
              disabled={!!editIntent}
            />
          </Form.Item>

          <Form.Item
            name="trainingPhrases"
            label={<FormLabel text="Training Phrases" />}
            tooltip="Enter comma-separated training phrases"
          >
            <Input.TextArea
              placeholder="Enter training phrases, separated by commas"
              className="!shadow-none"
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>

          <Form.Item
            name="responses"
            label={<FormLabel text="Responses" />}
            tooltip="Enter comma-separated responses"
          >
            <Input.TextArea
              placeholder="Enter responses, separated by commas"
              className="!shadow-none"
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDeleteModal
        visible={deleteModal.isOpen}
        onConfirm={() => handleDeleteIntent(deleteModal.intentName)}
        onCancel={() => setDeleteModal({ isOpen: false, intentName: null })}
        loading={loading}
        title="Delete Intent"
        content="Are you sure you want to delete this intent?"
      />
    </ConfigProvider>
  );
};

export default IntentManager;
