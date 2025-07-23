import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Button,
  Modal,
  Input,
  Space,
  Avatar,
  Card,
  Select,
  ConfigProvider,
  notification,
  Typography,
  Empty,
  Tabs,
  Flex,
} from "antd";
import {
  fetchProjects,
  fetchMembers,
  fetchTeams,
  createTeamAsync,
  updateTeamAsync,
  deleteTeamAsync,
  setModalState,
  setTeamData,
  setDeleteModal,
} from "../redux/teamsSlice";
import { PlusOutlined } from "@ant-design/icons";
import { Colors } from "../config/color";
import CustomTable from "./customTable";
import { Icon } from "@iconify/react";
import ConfirmDeleteModal from "./confirm_delete_modal";
import AvatarGroup from "./avtarGroup";
import { showLoader, hideLoader } from "../redux/loderSlice";
import { useUser } from "@clerk/clerk-react";
const { Text } = Typography;

const Teams = () => {
  const colors = Colors();
  const nameRef = React.createRef();
  const membersRef = React.createRef();
  const { user } = useUser();

  const userRole = user.organizationMemberships?.[0]?.role
    ?.split(":")[1]
    ?.toUpperCase();

  const themeConfig = {
    token: {
      colorBgContainer: "transparent",
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
        hoverBorderColor: colors.primary,
        activeBorderColor: colors.primary,
        colorIcon: colors.textcolor,
        optionActiveBg: colors.hoverGray,
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
      Tabs: {
        cardBg: "transparent",
        colorBorderSecondary: "transparent",
        itemSelectedColor: colors.sidebartext,
      },
      Button: {
        colorBorder: colors.border,
        hoverBorderColor: colors.primary,
        activeBorderColor: colors.primary,
      },
    },
  };

  const dispatch = useDispatch();
  useEffect(() => {
    const loadData = async () => {
      dispatch(showLoader());
      try {
        await Promise.all([
          dispatch(fetchTeams()),
          dispatch(fetchMembers(userRole)),
          dispatch(fetchProjects()),
        ]);
      } catch (error) {
        notification.error({
          message: (
            <Text style={{ color: colors.textcolor }}>
              {error.includes("Unauthorized") ? "Authentication Error" : "Error"}
            </Text>
          ),
          description: (
            <Text style={{ color: colors.textcolor }}>
              {error.includes("Unauthorized")
                ? "Please log in to access this page."
                : error}
            </Text>
          ),
          placement: "bottomRight",
          style: { backgroundColor: colors.background },
        });
      } finally {
        dispatch(hideLoader());
      }
    };
    loadData();
  }, [dispatch]);

  const [errors, setErrors] = useState({
    name: "",
    members: "",
    team_category: "",
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const {
    teams,
    modalState,
    teamData,
    projectOptions,
    members: memberOptions,
    iconOptions,
    deleteModal,
  } = useSelector((state) => state.teams);

  const updateTeamData = (updatedValues) =>
    dispatch(setTeamData({ ...teamData, ...updatedValues }));

  const filteredMemberOptions = useMemo(() => {
    if (!teamData.team_category) return [];
    return memberOptions.filter((member) =>
      teamData.team_category === "Interns"
        ? member.role === "INTERN"
        : member.role === "EMPLOYEE"
    );
  }, [memberOptions, teamData.team_category]);

  const handleTeamCategoryChange = (value) => {
    dispatch(setTeamData({ ...teamData, team_category: value, members: [] }));
    setErrors((prev) => ({
      ...prev,
      team_category: value ? "" : "Please select a team type.",
      members: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {
      name: !teamData.name.trim() ? "Team name is required." : "",
      members:
        teamData.members.length === 0
          ? "Please select at least one member."
          : "",
      team_category: !teamData.team_category
        ? "Please select a team type."
        : "",
    };
    setErrors(newErrors);
    const refs = {
      name: nameRef,
      members: membersRef,
    };

    Object.keys(newErrors).some((key) =>
      newErrors[key] ? (refs[key]?.current?.focus(), true) : false
    );
    return !Object.values(newErrors).some((error) => error);
  };

  const openModal = (isEdit = false, team = null) => {
    dispatch(setModalState({ isOpen: true, isEdit, editId: team?.id || null }));
    updateTeamData(
      isEdit
        ? {
            ...team,
            icon: team.icon || "mdi:account-group",
            members: team.members.map((member) => member.id),
            projects: team.projects.map((project) => project.id),
            team_category: team.team_category || "",
          }
        : {
            name: "",
            color: colors.avtar,
            members: [],
            projects: [],
            icon: "mdi:account-group",
            team_category: "",
          }
    );
    setErrors({ name: "", members: "", team_category: "" });
  };

  const closeModal = () => {
    dispatch(setModalState({ isOpen: false, isEdit: false, editId: null }));
    dispatch(
      setTeamData({
        name: "",
        color: colors.avtar,
        members: [],
        projects: [],
        icon: "mdi:account-group",
        team_category: "",
      })
    );
    setErrors({ name: "", members: "", team_category: "" });
    setFormSubmitted(false);
  };

  const handleSubmit = () => {
    setFormSubmitted(true);
    if (!validateForm()) return;
    dispatch(showLoader());
    const handleData = modalState.isEdit
      ? dispatch(updateTeamAsync({ id: modalState.editId, ...teamData }))
      : dispatch(createTeamAsync(teamData));

    handleData
      .unwrap()
      .then(() => {
        dispatch(fetchTeams());
        notification.success({
          message: (
            <Text style={{ color: colors.textcolor }}>
              {modalState.isEdit ? "Team Updated" : "Team Created"}
            </Text>
          ),
          description: (
            <Text style={{ color: colors.textcolor }}>
              The {teamData.name} has been successfully{" "}
              {modalState.isEdit ? "updated" : "created"}.
            </Text>
          ),
          placement: "bottomRight",
          style: {
            backgroundColor: colors.background,
          },
        });
        closeModal();
        setFormSubmitted(false);
      })
      .catch((error) => {
        notification.error({
          message: (
            <Text style={{ color: colors.textcolor }}>
              {error.title || "Error"}
            </Text>
          ),
          description: (
            <Text style={{ color: colors.textcolor }}>
              {error.message || "An error occurred while processing the team."}
            </Text>
          ),
          placement: "bottomRight",
          style: { backgroundColor: colors.background },
        });
        setFormSubmitted(false);
      })
      .finally(() => {
        dispatch(hideLoader());
      });
  };

  const handleIconChange = (value) => {
    const selectedIcon = iconOptions.find((option) => option.value === value);
    dispatch(
      setTeamData({
        ...teamData,
        icon: value,
        color: selectedIcon?.color || "#000000",
      })
    );
  };

  const handleMemberChange = (selectedMembers) => {
    updateTeamData({ members: selectedMembers });
    setErrors((prev) => ({
      ...prev,
      members:
        selectedMembers.length > 0 ? "" : "Please select at least one member.",
    }));
  };

  const handleProjectChange = (values) => {
    updateTeamData({ projects: values });
  };

  const columns = [
    {
      title: "Team",
      dataIndex: "name",
      key: "name",
      render: (text, record) => {
        const teamIcon = record.icon || "mdi:account-group";
        const iconColor =
          iconOptions.find((option) => option.value === teamIcon)?.color ||
          "#000000";
        return (
          <Text className="flex items-center gap-2">
            <Icon
              icon={teamIcon}
              width="25"
              className={`${colors.text} mr-4`}
              style={{ color: iconColor }}
            />
            {text}
          </Text>
        );
      },
    },
    {
      title: "Members",
      dataIndex: "members",
      key: "members",
      width: "100px",
      render: (members) => (
        <AvatarGroup
          members={members.map((m) => ({
            name: m?.name || "Member",
            user_image: m?.user_image,
          }))}
        />
      ),
    },
    {
      title: "Projects",
      dataIndex: "projects",
      key: "projects",
      align: "center",
      width: "400px",
      render: (projects) => <Text>{projects.length}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Icon
            icon="mdi:pencil"
            width="18"
            className={`cursor-pointer ${colors.darkGray}`}
            onClick={() => openModal(true, record)}
          />
          <Icon
            icon="mdi:trash-can"
            width="18"
            className="cursor-pointer text-red-400"
            onClick={() =>
              dispatch(setDeleteModal({ isOpen: true, teamId: record.id }))
            }
          />
        </Space>
      ),
    },
  ];

  const sortedTeams = [...teams].sort((a, b) => b.id - a.id);

  return (
    <ConfigProvider theme={themeConfig}>
      <>
        <Flex className="justify-end !mb-2 sticky top-4 right-4 z-10">
          <Button
            type="primary"
            onClick={() => openModal(false)}
            className="w-auto px-3 py-1 text-sm md:text-base md:px-4 md:py-2"
            style={{
              backgroundColor: colors.primary,
              whiteSpace: "nowrap",
              boxShadow: "none",
              defaultShadow: "none",
            }}
          >
            <PlusOutlined /> Create Team
          </Button>
        </Flex>

        <Card
          className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
          styles={{
            body: { padding: 0 },
            head: { borderBlockStyle: "none" },
          }}
          style={{ borderColor: colors.background }}
        >
          <Tabs
            defaultActiveKey="interns"
            type="card"
            className="h-full !mt-1"
            style={{ height: "100%" }}
            items={[
              {
                key: "interns",
                label: (
                  <Flex className="items-center font-bold text-base ml-1">
                    Interns Team
                  </Flex>
                ),
                children: (
                  <Flex className="!flex-1 overflow-auto !max-h-[400px]" vertical>
                    {sortedTeams.filter(
                      (team) => team.team_category === "Interns"
                    ).length > 0 ? (
                      <CustomTable
                        columns={columns}
                        dataSource={sortedTeams.filter(
                          (team) => team.team_category === "Interns"
                        )}
                        rowKey="id"
                        pageSize={5}
                      />
                    ) : (
                      <Empty
                        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                        imageStyle={{
                          height: "100px",
                          margin: "auto",
                          marginTop: "50px",
                        }}
                        description={
                          <Text style={{ color: colors.textcolor }}>
                            No intern teams available
                          </Text>
                        }
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      />
                    )}
                  </Flex>
                ),
              },
              {
                key: "employees",
                label: (
                  <Space className="flex items-center font-bold text-base">
                    Employee Team
                  </Space>
                ),
                children: (
                  <Flex className="flex-1 overflow-auto !max-h-[400px]" vertical>
                    {sortedTeams.filter(
                      (team) => team.team_category === "Employee"
                    ).length > 0 ? (
                      <CustomTable
                        columns={columns}
                        dataSource={sortedTeams.filter(
                          (team) => team.team_category === "Employee"
                        )}
                        rowKey="id"
                        pageSize={5}
                      />
                    ) : (
                      <Empty
                        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                        imageStyle={{
                          height: "100px",
                          margin: "auto",
                          marginTop: "50px",
                        }}
                        description={
                          <Text style={{ color: colors.textcolor }}>
                            No employee teams available
                          </Text>
                        }
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      />
                    )}
                  </Flex>
                ),
              },
            ]}
          />
        </Card>
        <Modal
          title={
            <Flex className="items-center gap-2 text-lg font-semibold">
              {modalState.isEdit ? "Edit Team" : "Create a New Team"}
            </Flex>
          }
          open={modalState.isOpen}
          onCancel={closeModal}
          centered
          width={500}
          footer={[
            <Flex className="mt-4 justify-end gap-2">
              <Button key="cancel" onClick={closeModal} type="default">
                Cancel
              </Button>
              <Button
                key="submit"
                type="primary"
                className="!shadow-none !border-none"
                style={{ backgroundColor: colors.primary, color: colors.white }}
                onClick={handleSubmit}
              >
                {modalState.isEdit ? "Save Changes" : "Create Team"}
              </Button>
            </Flex>,
          ]}
        >
          <Flex className="w-full" vertical>
            <Text className="font-normal flex items-center gap-2 !mb-2 after:content-['*'] after:text-red-400 after:-ml-2">
              Team
            </Text>
            <Flex className="relative w-full" vertical>
              <Select
                className="w-full"
                value={teamData.team_category || undefined}
                onChange={handleTeamCategoryChange}
                placeholder="Select team category"
                getPopupContainer={(triggerNode) => triggerNode.parentNode}
              >
                <Select.Option value="Interns">Interns</Select.Option>
                <Select.Option value="Employee">Employee</Select.Option>
              </Select>
              {formSubmitted && errors.team_category && (
                <Text className="absolute left-0 top-full text-red-400 text-xs mt-1" style={{ color: colors.danger }}>
                  {errors.team_category}
                </Text>
              )}
            </Flex>
            <Flex className="items-center gap-4 w-full !mt-5">
              <Flex className="flex-shrink-0" vertical>
                <Text className="font-normal flex items-center gap-2 !mb-2">
                  Team Icon
                </Text>
                <Select
                  className="w-20"
                  value={teamData.icon}
                  onChange={handleIconChange}
                  placeholder="Choose an icon"
                  getPopupContainer={(triggerNode) => triggerNode.parentNode}
                >
                  {iconOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      <Text className="flex items-center gap-2">
                        <Icon
                          icon={option.value}
                          width="18"
                          className={`${colors.text}`}
                          style={{ color: option.color }}
                        />
                        {option.label}
                      </Text>
                    </Select.Option>
                  ))}
                </Select>
              </Flex>
              <Flex className="flex-grow" vertical>
                <Text className="font-normal flex items-center gap-2 !mb-2 after:content-['*'] after:text-red-400 after:-ml-2">
                  Team Name
                </Text>
                <Flex className="relative w-full" vertical>
                  <Input
                    ref={nameRef}
                    placeholder="Enter team name"
                    maxLength={100}
                    value={teamData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      dispatch(setTeamData({ ...teamData, name: val }));
                      setErrors((prev) => ({
                        ...prev,
                        name: val.trim() ? "" : "Team name is required.",
                      }));
                    }}
                    className={`w-full border !shadow-none ${
                      errors.name ? "border-red-400" : "placeholder-[#80acd9]"
                    }`}
                    variant="outlined"
                  />
                  {formSubmitted && errors.name && (
                    <Text className="absolute left-0 top-full text-red-400 text-xs mt-1" style={{ color: colors.danger }}>
                      {errors.name}
                    </Text>
                  )}
                </Flex>
              </Flex>
            </Flex>

            <Text className="font-normal flex items-center gap-2 !mb-2 !mt-5 after:content-['*'] after:text-red-400 after:-ml-2">
              <Icon
                icon="mdi:account-multiple"
                width="18"
                style={{ color: "#42A5F5" }}
              />
              Members
            </Text>
            <Flex className="relative w-full" vertical>
              <Select
                ref={membersRef}
                mode="multiple"
                className="w-full"
                value={teamData.members.map((memberId) => {
                  const member = filteredMemberOptions.find(
                    (m) => m.id === memberId
                  ) || {
                    name: "Member",
                  };
                  return {
                    value: memberId,
                    label: (
                      <Flex className="!items-center gap-2">
                        <Avatar
                          size={18}
                          style={{ backgroundColor: colors.avtar }}
                        >
                          {(member.name?.charAt(0) || "M").toUpperCase()}
                        </Avatar>
                        {member.name}
                      </Flex>
                    ),
                  };
                })}
                onChange={(values) => {
                  const selectedMembers = values.map((v) => v.value);
                  handleMemberChange(selectedMembers);
                }}
                placeholder={
                  <span className="font-normal">Select or Add Members</span>
                }
                allowClear
                labelInValue
                optionFilterProp="label"
                notFoundContent={
                  <Empty
                    image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                    description={
                      <Text style={{ color: colors.textcolor, fontSize: 14 }}>
                        No {teamData.team_category || "members"} available
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
                {filteredMemberOptions.map((member) => (
                  <Select.Option
                    key={member.id}
                    value={member.id}
                    label={member.name}
                  >
                    <Flex className="items-center gap-2">
                      <Avatar
                        size={18}
                        style={{ backgroundColor: colors.avtar }}
                      >
                        {member?.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      {member?.name}
                    </Flex>
                  </Select.Option>
                ))}
              </Select>
              {formSubmitted && errors.members && (
                <Text className="absolute left-0 top-full text-red-400 text-xs mt-1" style={{ color: colors.danger }}>
                  {errors.members}
                </Text>
              )}
            </Flex>

            <Text className="font-normal flex items-center gap-2 !mb-2 !mt-6">
              <Icon
                icon="mdi:folder-multiple"
                width="18"
                style={{ color: "#66BB6A" }}
              />
              Projects
            </Text>
            <Flex className="relative w-full" vertical>
              <Select
                mode="multiple"
                className="w-full"
                value={teamData.projects}
                onChange={(values) => {
                  handleProjectChange(values);
                }}
                placeholder="Select projects"
                optionFilterProp="children"
                showSearch
                notFoundContent={
                  <Empty
                    image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                    description={
                      <Text style={{ color: colors.textcolor, fontSize: 14 }}>
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
                {projectOptions.map((project) => (
                  <Select.Option key={project.id} value={project.id}>
                    {project.name}
                  </Select.Option>
                ))}
              </Select>
            </Flex>
          </Flex>
        </Modal>
        <ConfirmDeleteModal
          visible={deleteModal.isOpen}
          onConfirm={() => {
            dispatch(deleteTeamAsync(deleteModal.teamId))
              .unwrap()
              .then(() => {
                dispatch(fetchTeams());
                notification.success({
                  message: (
                    <Text style={{ color: colors.textcolor }}>
                      Team Deleted
                    </Text>
                  ),
                  description: (
                    <Text style={{ color: colors.textcolor }}>
                      The team has been successfully deleted.
                    </Text>
                  ),
                  placement: "bottomRight",
                  style: {
                    backgroundColor: colors.background,
                  },
                });
              })
              .catch((error) => {
                notification.error({
                  message: (
                    <Text style={{ color: colors.textcolor }}>
                      {error.title || "Error"}
                    </Text>
                  ),
                  description: (
                    <Text style={{ color: colors.textcolor }}>
                      {error.message || "An error occurred while deleting the team."}
                    </Text>
                  ),
                  placement: "bottomRight",
                  style: { backgroundColor: colors.background },
                });
              });
          }}
          onCancel={() =>
            dispatch(setDeleteModal({ isOpen: false, teamId: null }))
          }
          title="Confirm Deletion"
          description="Are you sure you want to delete this team?"
        />
      </>
    </ConfigProvider>
  );
};

export default Teams;
