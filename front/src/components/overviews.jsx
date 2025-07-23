import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Card,
  Typography,
  Table,
  Row,
  Col,
  ConfigProvider,
  Input,
  Avatar,
  List,
  Dropdown,
  Menu,
  Empty,
  Flex,
} from "antd";
import { UserOutlined, EllipsisOutlined } from '@ant-design/icons';
import { Doughnut, Pie, Bar } from "react-chartjs-2";
import { Colors } from "../config/color";
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement } from "chart.js";
import { fetchProjectDetails  } from "../redux/projectDetailSlice";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement
);
const { Text, Paragraph } = Typography;

const Overviews = () => {
  const dispatch = useDispatch();
  const { projectId } = useParams();
  const { project, loading, error } = useSelector(
    (state) => state.projectDetail
  );
  const progress = project?.progress || 0;
  const [searchTerm, setSearchTerm] = useState("");
  const [chartType, setChartType] = useState("doughnut");

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectDetails(projectId));
    }
  }, [projectId, dispatch]);

 const colors = Colors();

  const projectTeams = project?.teams || [];
  const allMembers = projectTeams.flatMap((team) =>
    team.users.map((user) => ({
      ...user,
      team_name: team.team_name
    }))
  );

  const uniqueMembersMap = new Map();
  allMembers?.forEach((member) => {
    if (!uniqueMembersMap.has(member.clerk_id)) {
      uniqueMembersMap.set(member.clerk_id, {
        ...member,
        teams: [member.team_name]
      });
    } else {
      const existing = uniqueMembersMap.get(member.clerk_id);
      if (!existing.teams.includes(member.team_name)) {
        existing.teams.push(member.team_name);
      }
    }
  });

  const filteredTeam = Array.from(uniqueMembersMap.values() || []).filter(
    (member) => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    }
  );

  const cardStyle = {
    height: '350px',
    display: 'flex',
    flexDirection: 'column'
  };

  const cardBodyStyle = {
    flex: 1,
    overflow: 'auto',
    padding: '15px'
  };

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBorder: colors.background,
      colorBgElevated: colors.background,
      colorBorderSecondary: colors.border,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background
      },
      Dropdown: {
        controlItemBgHover: colors.hoverGray,
      },
      Table: {
        headerBg: "transparent",
      },
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const chartData = {
    labels: ['Completed', 'Remaining'],
    datasets: [{
      data: [progress || 0, 100 - (progress || 0)],
      backgroundColor: [colors.primary, colors.chartbg],
      borderColor: [colors.primary, colors.chartbg],
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw}%`
        }
      }
    },
    ...(chartType === 'bar' && {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: colors.hoverGray,
          },
          ticks: {
            callback: (value) => `${value}%`,
          },
        },
        x: {
          grid: {
            color: colors.hoverGray,
          },
        },
      },
    }),
  };

  const handleChartTypeChange = (type) => {
    setChartType(type);
  };

  const menu = (
    <Menu
      style={{
        backgroundColor: colors.background,
      }}
      onClick={(e) => handleChartTypeChange(e.key)}
      items={[
        { key: "doughnut", label: "Doughnut" },
        { key: "bar", label: "Bar" },
        { key: "pie", label: "Pie" },
      ]}
    />
  );

  const renderDetails = (details) =>
    details.map((item, index) => (
      <Flex
        key={index}
        justify="space-between"
        align="center"
        className={`${
          index === 3 ? "border-none pb-0" : "border-b pb-2 border-gray-300"
        }`}
      >
        <Typography.Title
          level={5}
          className="!m-0"
          style={{ color: colors.textcolor }}
        >
          {item.label}
        </Typography.Title>
        <Text className="text-gray-800" style={{ color: colors.textcolor }}>
          {item.value}
        </Text>
      </Flex>
    ));

  const techStack = project?.description?.techStack
  ? Object.entries(project.description.techStack)
      .map(([, { title, version, description }]) => ({
        name: title,
        version,
        description,
      }))
      .filter(item => item.name || item.version || item.description)
  : [];

  const renderProjectDescription = () => {
    if (loading) return <Text>Loading project details...</Text>;
    if (error) return <Text type="danger">{error}</Text>;
    return (
      project.description?.content && (
        <Paragraph style={{ marginBottom: 0 }}>
          <div
            dangerouslySetInnerHTML={{
              __html: project.description?.content
                .replace(/<p>\s*<\/p>/g, "")
                .replace(/<br>\s*/g, ""),
            }}
          />
        </Paragraph>
      )
  );
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <Flex
        className="container mx-auto p-4"
        style={{
          padding: 20,
          maxWidth: "100vw",
          minHeight: "100vh",
          background: colors.theme,
          flexDirection: "column"
        }}
      >
        <Row gutter={[16, 16]}>
          <Col
            xs={24}
            sm={24}
            md={24}
            lg={24}
            xl={16}
            className="!ml-[-5] mt-[-5]"
          >
            <Card
              className="!mb-4"
              style={cardStyle}
              styles={{ body: cardBodyStyle }}
            >
              <Flex
                vertical
                style={{
                  overflow: "auto",
                  height: "100%",
                  display: "flex"
                }}
              >
                {renderProjectDescription() ? (
                  <Paragraph
                    className="text-gray-600 leading-6"
                    style={{ color: colors.textcolor, whiteSpace: "pre-line" }}
                  >
                    <Text>{renderProjectDescription()}</Text>
                  </Paragraph>
                ) : (
                  <Flex
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Empty
                      image={
                        <img
                          src="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                          alt="empty"
                          preview={false}
                          className="mx-auto mb-2"
                        />
                      }
                      description={
                        <Text style={{ color: colors.textcolor }}>
                          No project description
                        </Text>
                      }
                    />
                  </Flex>
                )}

                <Flex vertical style={{ marginTop: "auto", paddingTop: 16 }}>
                  {renderDetails([
                    {
                      label: "Start Date",
                      value: formatDate(project.start_date)
                    },
                    {
                      label: "Completion",
                      value: project.end_date
                        ? formatDate(project.end_date)
                        : "---"
                    },
                    {
                      label: "Team",
                      value:
                        project.teams
                          ?.map((team) => team.team_name)
                          .join(", ") || "---"
                    }
                  ])}
                </Flex>
              </Flex>
            </Card>

            <Card
              title="Project Tech-Stack"
              key={JSON.stringify(colors)}
              style={{
                ...cardStyle,
                padding: -1
              }}
              headStyle={{
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.background
              }}
              bodyStyle={{
                padding: 1,
                flex: 1,
                overflow: "auto"
              }}
              className="!mb-4 flex flex-col justify-center"
            >
              <Table
                style={{
                  backgroundColor: "transparent",
                  border: "none"
                }}
                dataSource={techStack}
                columns={[
                  { title: "Tech Stack", dataIndex: "name", key: "name" },
                  { title: "Version", dataIndex: "version", key: "version" },
                  {
                    title: "Description",
                    dataIndex: "description",
                    key: "description"
                  }
                ]}
                pagination={false}
                rowKey="key"
                sticky
                locale={{
                  emptyText: (
                    <Empty
                      image={
                        <img
                          src="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                          alt="empty"
                          className="mx-auto"
                        />
                      }
                      description={
                        <Text style={{ color: colors.textcolor }}>
                          Tech Stack Not assigned
                        </Text>
                      }
                    />
                  )
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={24} md={24} lg={24} xl={8} className="!mt-[-5]">
            <Card
              title={
                <Flex justify="space-between" align="center">
                  Project Learning Progress
                  <Dropdown overlay={menu} trigger={["click"]}>
                    <Flex
                      className="w-8 h-8 rounded-full cursor-pointer"
                      align="center"
                      justify="center"
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          colors.hoverGray)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <EllipsisOutlined className="text-[18px] rotate-90" />
                    </Flex>
                  </Dropdown>
                </Flex>
              }
              className="!mb-4"
              style={cardStyle}
              styles={{
                body: {
                  padding: "10px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column"
                }
              }}
            >
              <Flex
                style={{ height: "240px", flex: "none" }}
                className="justify-center items-center"
              >
                {chartType === "doughnut" && (
                  <Doughnut data={chartData} options={chartOptions} />
                )}
                {chartType === "pie" && (
                  <Pie data={chartData} options={chartOptions} />
                )}
                {chartType === "bar" && (
                  <Bar data={chartData} options={chartOptions} />
                )}
              </Flex>
              <Flex className="justify-center mt-2" style={{ flex: "none" }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Completed : {progress ? `${progress}%` : "0%"}
                </Typography.Title>
              </Flex>
            </Card>

            <Card
              className="!mb-4"
              title="Team Members"
              extra={
                <Input
                  placeholder="Search member"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!w-20 sm:!w-40"
                  style={{
                    background: "transparent",
                    borderColor: colors.border
                  }}
                />
              }
              style={cardStyle}
              styles={{
                body: { padding: "20px", flex: 1, overflow: "auto" }
              }}
            >
              <List
                dataSource={filteredTeam}
                locale={{
                  emptyText: (
                    <Empty
                      image={
                        <img
                          src="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                          alt="empty"
                          preview={false}
                          className="mx-auto"
                        />
                      }
                      description={
                        <Text style={{ color: colors.textcolor }}>
                          Team Not assigned
                        </Text>
                      }
                    />
                  )
                }}
                renderItem={(item) => (
                  <List.Item className="!px-0">
                    <Flex className="items-center w-full">
                      <Avatar
                        src={item.user_image}
                        icon={!item.user_image && <UserOutlined />}
                        className="!w-10 !h-10 !mr-3"
                      >
                        {!item.user_image &&
                          `${item.first_name.charAt(0)}${item.last_name.charAt(
                            0
                          )}`}
                      </Avatar>
                      <Flex vertical className="flex-1 min-w-0 overflow-hidden">
                        <Text
                          className="font-bold text-base block truncate"
                          style={{ color: colors.textcolor }}
                          title={`${item.first_name} ${item.last_name}`}
                        >
                          {`${item.first_name} ${item.last_name}`}
                        </Text>
                        <Text className="!text-xs !text-gray-400">
                          Teams: {item.teams.join(", ")}
                        </Text>
                      </Flex>
                      <Flex
                        vertical
                        className="min-w-0 overflow-hidden ml-auto"
                      >
                        <Text
                          className="text-sm truncate capitalize"
                          style={{ color: colors.textcolor }}
                          title={item.role}
                        >
                          {item.role.toLowerCase()}
                        </Text>
                      </Flex>
                    </Flex>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Flex>
    </ConfigProvider>
  );
};

export default Overviews;
