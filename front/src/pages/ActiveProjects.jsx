import { useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Progress,
  Pagination,
  ConfigProvider,
  Empty,
  Space,
  Flex,
} from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentPage } from "../redux/projectTaskSlice";
import { fetchProjects } from "../redux/projectSlice";
import { Colors } from "../config/color";
import AvatarWithFallback from "../components/avtarfallback";
import AvatarGroup from "../components/avtarGroup";
import { useUser } from "@clerk/clerk-react";
const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");

const ActiveProjects = () => {
  const colors = Colors();
  const { user } = useUser();
  const userRole = user?.organizationMemberships?.[0]?.role
    ?.split(":")[1]
    ?.toUpperCase();
  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBorder: colors.background,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
      },
      Table: {
        headerBg: "transparent",
        headerColor: colors.textcolor,
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
        borderColor: colors.border,
        borderRadius: 0,
        headerBorderRadius: 0,
        rowHoverBg: colors.theme,
      },
      Pagination: {
        colorTextDisabled: colors.border,
      },
    },
  };

  const dispatch = useDispatch();
  const { pagination = {} } = useSelector((state) => state.projectTask);
  const { projects } = useSelector((state) => state.projects);
  const progress = useSelector((state) => state.sidebar.progress);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const pageSize = 4;
  const totalItems = projects.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.min(pagination.currentPage || 1, totalPages);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      dispatch(setCurrentPage(totalPages));
    }
  }, [currentPage, totalPages, dispatch]);

  const handlePageChange = (page) => {
    if (page > 0 && page <= totalPages) {
      dispatch(setCurrentPage(page));
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = projects.slice(startIndex, startIndex + pageSize);

  const getUniqueUsersMap = (teams) => {
    const userMap = new Map();
    teams?.forEach((team) => {
      (team.users || []).forEach((user) => {
        if (user.clerk_id && !userMap.has(user.clerk_id)) {
          userMap.set(user.clerk_id, user);
        }
      });
    });
    return userMap;
  };

  const columns = [
    {
      title: "Project Name",
      dataIndex: "project_name",
      render: (text, record) => {
        const fallbackText = text ? text.substring(0, 2).toUpperCase() : "";
        const hasLogo = record.logo_url && record.logo_url.length > 0;

        const avatarSrc = hasLogo
          ? import.meta.env.VITE_ENV === "dev"
            ? `${Image_URL}${record.logo_url}`
            : `${record.logo_url}`
          : null;

        return (
          <Flex align="center" gap="small" className="!min-w-0">
            <AvatarWithFallback
              src={avatarSrc}
              alt="project logo"
              fallbackText={fallbackText}
              size="default"
              shape="circle"
              className=" !w-8 !h-8 !flex-shrink-0"
            />
            <Space className="truncate">{text}</Space>
          </Flex>
        );
      },
    },
    {
      title: "Teams",
      dataIndex: "teams",
      render: (teams) => {
        if (!teams || teams.length === 0) {
          return (
            <Space className="flex items-center text-gray-500">
              <ExclamationCircleOutlined className="mr-2 text-gray-400" />
              <Space>Team not assigned</Space>
            </Space>
          );
        }
        const teamNames = teams
          .map((team) => team.team_name || "Team name not found")
          .join(", ");
        return <Space className="truncate">{teamNames}</Space>;
      },
    },
    {
      title: "Members",
      dataIndex: "teams",
      render: (teams) => {
        if (!teams || teams.length === 0) {
          return (
            <Flex align="center" className="text-gray-500 ml-4">
              <Space> --- </Space>
            </Flex>
          );
        }
        const uniqueUsers = Array.from(getUniqueUsersMap(teams).values());
        const members = uniqueUsers.map((user) => ({
          name: `${user.first_name} ${user.last_name}`,
          user_image: user.user_image,
        }));

        return <AvatarGroup members={members} />;
      },
    },
  ];

  if (userRole !== "ADMIN") {
    columns.splice(2, 0, {
      title: "Status",
      dataIndex: "status",
      render: (_, project) => {
        const progressPercentage = progress?.[project.id]?.progress || 0;
        let status = "PENDING";

        if (progressPercentage > 0 && progressPercentage < 100) {
          status = "IN_PROGRESS";
        } else if (progressPercentage === 100) {
          status = "COMPLETED";
        }

        const statusMap = {
          IN_PROGRESS: { color: "gold", text: "In Progress" },
          COMPLETED: { color: "green", text: "Completed" },
          PENDING: { color: "purple", text: "Pending" },
        };

        return (
          <Tag
            color={statusMap[status]?.color || "default"}
            className="!rounded-3xl font-medium px-4 py-1"
          >
            {statusMap[status]?.text || status}
          </Tag>
        );
      },
    });
    columns.push({
      title: "Progress",
      render: (_, project) => {
        const progressPercentage = progress?.[project.id]?.progress || 0;
        return (
          <Progress
            percent={progressPercentage}
            strokeColor={
              progressPercentage === 100 ? colors.success : colors.primary
            }
            trailColor={colors.progressback}
            status={progressPercentage === 100 ? "success" : "active"}
          />
        );
      },
    });
  }

  return (
    <ConfigProvider theme={themeConfig}>
      <motion.div
        whileHover={{ y: -5, transition: { duration: 0.1 } }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          title={<Space className="font-bold">Active Projects</Space>}
          className="shadow-md !rounded-lg min-h-[430px] h-full !w-full flex flex-col justify-start !p-0 !overflow-hidden"
          bodyStyle={{ padding: 0 }}
          headStyle={{ borderBlockStyle: "none" }}
          style={{
            borderColor: colors.background,
            colorBorderSecondary: colors.border,
          }}
        >
          {projects.length === 0 ? (
            <Flex
              align="center"
              justify="center"
              className="h-full min-h-[310px]"
            >
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
                  <Space style={{ color: colors.textcolor }}>
                    No active projects available
                  </Space>
                }
              />
            </Flex>
          ) : (
            <Flex vertical className="!w-full" style={{ overflow: "auto" }}>
              <Table
                className="flex-grow min-h-[310px] !w-full !rounded-none border-t !p-0 [&_.ant-table]:w-full [&_.ant-table-container]:w-full [&_.ant-table-thead>tr>th]:font-bold"
                style={{ borderColor: colors.border }}
                columns={columns}
                dataSource={paginatedData}
                rowKey="id"
                pagination={false}
              />
              {totalPages > 1 && (
                <Flex
                  justify="center"
                  className="!mt-5 !pb-2 [&_.ant-pagination-simple-pager_input]:w-[20px] text-center [&_.ant-pagination-simple-pager_input]:p-0 [&_.ant-pagination-simple-pager_input]:!border-0 focus:[&_.ant-pagination-simple-pager_input]:outline-none"
                >
                  <Pagination
                    current={currentPage}
                    total={totalItems}
                    pageSize={pageSize}
                    onChange={handlePageChange}
                    simple
                    responsive
                  />
                </Flex>
              )}
            </Flex>
          )}
        </Card>
      </motion.div>
    </ConfigProvider>
  );
};

export default ActiveProjects;
