import React, { useState, useMemo, createRef, useEffect } from "react";
import { useOrganization } from "@clerk/clerk-react";
import {
  Space,
  Tag,
  Modal,
  Input,
  Select,
  Button,
  ConfigProvider,
  Card,
  Empty,
  Typography,
  Row,
  Col,
  Form,
} from "antd";
import { Icon } from "@iconify/react";
import { PlusOutlined } from "@ant-design/icons";
import { Colors } from "../config/color";
import CustomTable from "./customTable";
import Loader from "./loader";
import ConfirmDeleteModal from "./confirm_delete_modal";
import { useSelector, useDispatch } from "react-redux";
import { fetchUsers, updateUserRole, deleteUser } from "../redux/userSlice";
import Notifier from "./notifier";

const { Option } = Select;

const ManageUsers = () => {
  const colors = Colors();
  const { organization, memberships } = useOrganization({
    memberships: { pageSize: 100, keepPreviousData: true },
  });
  const dispatch = useDispatch();
  const { users, loading, error, operationLoading, operationError } =
    useSelector((state) => state.users);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState({ email: "", role: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const { Text, Paragraph } = Typography;

  const emailRef = createRef();
  const roleRef = createRef();

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Notifier({
        type: "error",
        title: "Fetch Failed",
        description: error,
        placement: "bottomRight",
        colors
      });
    }
    if (operationError) {
      Notifier({
        type: "error",
        title: "Operation Failed",
        description: operationError,
        placement: "bottomRight",
        colors
      });
    }
  }, [error, operationError, colors.background]);

  const columns = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        width: "25%",
        render: (text) => text || "N/A",
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        width: "35%",
        render: (text) => text || "N/A",
      },
      {
        title: "Role",
        key: "role",
        dataIndex: "role",
        width: "25%",
        render: (role) =>
          role ? (
            <Tag
              color={
                role === "org:admin"
                  ? "volcano"
                  : role === "org:intern"
                  ? "green"
                  : "geekblue"
              }
              key={role}
            >
              {role.toUpperCase().replace("ORG:", "")}
            </Tag>
          ) : (
            "-"
          ),
      },
      {
        title: "Actions",
        key: "actions",
        width: "15%",
        render: (_, record) => (
          <Space size="middle">
            <Icon
              icon="mdi:pencil"
              width="18"
              className="cursor-pointer"
              style={{ color: colors.text }}
              onClick={() => record.onEdit(record)}
            />
            <Icon
              icon="mdi:trash-can"
              width="18"
              className="cursor-pointer text-red-400"
              onClick={() => record.onDelete(record)}
            />
          </Space>
        ),
      },
    ],
    [colors.text]
  );

  const formattedUsers = useMemo(
    () =>
      users.map((user) => ({
        key: user.clerk_id,
        name: `${user.first_name} ${user.last_name}`.trim() || "Unknown",
        email: user.email,
        role:
          user.role === "ADMIN"
            ? "org:admin"
            : user.role === "INTERN"
            ? "org:intern"
            : "org:employee",
        userId: user.clerk_id,
        onEdit: (record) => showInviteModal(record),
        onDelete: (record) => showDeleteModal(record),
      })),
    [users]
  );

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
        colorTextDisabled: colors.textcolor,
      },
      Button: {
        defaultShadow: "none",
      },
    },
  };

  const validateForm = () => {
    const newErrors = {
      email: !email.trim() ? "Email is required." : "",
      role: !role ? "Please select a role." : "",
    };
    setErrors(newErrors);

    const refs = { email: emailRef, role: roleRef };
    Object.keys(newErrors).some((key) =>
      newErrors[key] ? (refs[key]?.current?.focus(), true) : false
    );

    return !Object.values(newErrors).some((error) => error);
  };

  const handleInvite = async () => {
    setFormSubmitted(true);
    if (!validateForm()) return;

    try {
      await organization.inviteMember({ emailAddress: email, role });
      Notifier({
        type: "success",
        title: "Invitation Sent",
        description: `Invitation sent to ${email}`,
        placement: "bottomRight",
        colors
      });
      setEmail("");
      setRole("");
      setIsModalOpen(false);
      setFormSubmitted(false);
      setErrors({ email: "", role: "" });
      dispatch(fetchUsers());
    } catch (error) {
      Notifier({
        type: "error",
        title: "Invite Failed",
        description: `Failed to send invite: ${error.message}`,
        placement: "bottomRight",
        colors
      });
    }
  };

  const handleUpdateRole = async () => {
    setFormSubmitted(true);
    if (!role) {
      setErrors((prev) => ({ ...prev, role: "Please select a role." }));
      roleRef.current?.focus();
      return;
    }

    try {
      const membership = memberships?.data?.find(
        (m) => m.publicUserData?.userId === selectedUser.userId
      );


      const backendRole =
        role === "org:admin"
          ? "ADMIN"
          : role === "org:intern"
          ? "INTERN"
          : "EMPLOYEE";

      if (!membership) {
        throw new Error("Membership not found in current data.");
      }

      if (!selectedUser.key) {
        throw new Error("Invalid memberId: undefined or empty.");
      }

      await organization.updateMember({
        userId: selectedUser.userId,
        role: role,
      });

      await dispatch(
        updateUserRole({
          userId: selectedUser.userId,
          role: backendRole,
          organizationId: organization.id,
        })
      ).unwrap();

      Notifier({
        type: "success",
        title: "Role Updated",
        description: `${selectedUser.name}'s role updated to ${role.replace(
          "org:",
          ""
        )}.`,
        placement: "bottomRight",
        colors
      });
      setIsModalOpen(false);
      setEmail("");
      setRole("");
      setFormSubmitted(false);
      setErrors({ email: "", role: "" });
      setSelectedUser(null);
      await memberships?.revalidate();
    } catch (error) {
      Notifier({
        type: "error",
        title: "Update Failed",
        description: `Failed to update role: ${
          error.message.includes("Resource not found")
            ? "User membership not found. Please refresh and try again."
            : error.message
        }`,
        placement: "bottomRight",
        colors
      });
    }
  };

  const showInviteModal = (record) => {
    setSelectedUser(record);
    setEmail(record.email || "");
    setRole(record.role || "");
    setIsModalOpen(true);
    setErrors({ email: "", role: "" });
    setFormSubmitted(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEmail("");
    setRole("");
    setErrors({ email: "", role: "" });
    setFormSubmitted(false);
    setSelectedUser(null);
  };

  const showDeleteModal = (record) => {
    setUserToDelete(record);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteUser(userToDelete.userId)).unwrap();
      Notifier({
        type: "success",
        title: "User Deleted",
        description: `${userToDelete.name} has been deleted`,
        placement: "bottomRight",
        colors
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <>
        <Row className="flex justify-end mb-2 sticky top-4 right-4 z-10">
          <Button
            type="primary"
            onClick={() => showInviteModal({})}
            className="w-auto px-3 py-1 text-sm md:text-base md:px-4 md:py-2"
            style={{
              backgroundColor: colors.primary,
              whiteSpace: "nowrap",
              boxShadow: "none",
            }}
            disabled={operationLoading}
          >
            <PlusOutlined />
            Invite Users
          </Button>
        </Row>
        <Card
          title={
            <Text
              className="flex items-center font-bold text-lg"
              style={{ color: colors.textcolor }}
            >
              Users
            </Text>
          }
          className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
          styles={{
            body: { padding: 0, display: "flex", flexDirection: "column" },
            head: { borderBlockStyle: "none" },
          }}
          style={{ borderColor: colors.background }}
        >
          {loading ? (
            <Row align="middle" justify="center" style={{ minHeight: 400 }}>
              <Col>
                <Loader isConstrained={true} />
              </Col>
            </Row>
          ) : formattedUsers.length === 0 ? (
            <Empty
              description="No users found. Invite users to get started!"
              style={{ marginTop: "100px" }}
            />
          ) : (
            <CustomTable
              columns={columns}
              dataSource={formattedUsers}
              rowKey="key"
              loading={loading || operationLoading}
              totalItems={formattedUsers.length}
            />
          )}
        </Card>
        <Modal
          title={
            <Text className="flex items-center gap-2 text-lg font-semibold">
              {selectedUser?.name ? `Edit ${selectedUser.name}` : "Invite User"}
            </Text>
          }
          open={isModalOpen}
          onCancel={handleCancel}
          centered
          width={500}
          footer={[
            <Space className="mt-4 flex justify-end gap-2" key="footer">
              <Button
                key="cancel"
                onClick={handleCancel}
                type="default"
                disabled={operationLoading}
              >
                Cancel
              </Button>
              <Button
                key="submit"
                type="primary"
                className="!shadow-none !border-none"
                style={{ backgroundColor: colors.primary, color: colors.white }}
                onClick={selectedUser?.name ? handleUpdateRole : handleInvite}
                loading={operationLoading}
              >
                {selectedUser?.name ? "Update Role" : "Send Invitation"}
              </Button>
            </Space>,
          ]}
        >
        <Form layout="vertical">
          <Form.Item
            label={
            <Paragraph className="font-medium flex items-center gap-2 !mb-2 after:content-['*'] after:text-red-400 after:-ml-2">
              <Icon icon="mdi:email" width="18" />
              Email
            </Paragraph>
              }
              validateStatus={formSubmitted && errors.email ? "error" : ""}
              help={formSubmitted && errors.email ? errors.email : null}
            >
            <Input
              ref={emailRef}
              type="email"
              placeholder="Enter user email"
              value={email}
              onChange={(e) => {
                const val = e.target.value;
                setEmail(val);
                setErrors((prev) => ({
                  ...prev,
                  email: val.trim() ? "" : "Email is required.",
                }));
              }}
              className="w-full !shadow-none"
              variant="outlined"
              disabled={!!selectedUser?.email || operationLoading}
            />
          </Form.Item>
          <Form.Item
              label={
            <Paragraph className="font-medium flex items-center gap-2 !mb-2 after:content-['*'] after:text-red-400 after:-ml-2">
              <Icon icon="mdi:account" width="18" />
              Role
            </Paragraph>
              }
              validateStatus={formSubmitted && errors.role ? "error" : ""}
              help={formSubmitted && errors.role ? errors.role : null}
            >
            <Select
              ref={roleRef}
              className="w-full"
              value={role}
              onChange={(value) => {
                setRole(value);
                setErrors((prev) => ({
                  ...prev,
                  role: value ? "" : "Please select a role.",
                }));
              }}
              placeholder="Select role"
              disabled={operationLoading}
            >
              <Option value="org:intern">Intern</Option>
              <Option value="org:employee">Employee</Option>
              <Option value="org:admin">Admin</Option>
            </Select>
          </Form.Item>
          </Form>
        </Modal>
        <ConfirmDeleteModal
          visible={isDeleteModalOpen}
          onConfirm={handleDelete}
          onCancel={() => {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
          }}
          title="Confirm User Deletion"
          description={`Are you sure you want to delete ${
            userToDelete?.name || "this user"
          }? This action cannot be undone.`}
          confirmLoading={operationLoading}
        />
      </>
    </ConfigProvider>
  );
};

export default ManageUsers;
