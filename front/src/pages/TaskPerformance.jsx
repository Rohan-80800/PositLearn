import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Dropdown,
  Menu,
  ConfigProvider,
  Flex,
  Space,
  Typography,
} from "antd";
import { Doughnut, Bar, Pie } from "react-chartjs-2";
import {
  CheckCircleOutlined,
  RiseOutlined,
  FallOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { motion } from "framer-motion";
import { Colors } from "../config/color";
import { useDispatch, useSelector } from "react-redux";
import { fetchTaskPerformanceData } from "../redux/projectTaskSlice";

ChartJS.register(
  ArcElement,
  ChartTooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

const { Text, Title } = Typography;

const TaskPerformance = ({ clerkId }) => {
  const colors = Colors();
  const dispatch = useDispatch();

  const { taskPerformanceData, taskPerformanceDetails } = useSelector(
    (state) => state.projectTask
  );

  const themeConfig = {
    token: {
      colorText: colors.textcolor,
      colorBorderSecondary: colors.border,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        borderColor: colors.background,
      },
      Dropdown: {
        controlItemBgHover: colors.hoverGray,
      },
    },
  };

  const iconMap = {
    check_circle: <CheckCircleOutlined />,
    arrow_upward: <RiseOutlined />,
    arrow_downward: <FallOutlined />
  };

  const transformedDetails = taskPerformanceDetails.map((task) => ({
    ...task,
    icon: iconMap[task.icon] || <CheckCircleOutlined />,
    color:
      task.name === "Completed"
        ? colors.completed
        : task.name === "In-Progress"
        ? colors.inProgress
        : task.name === "Behind"
        ? colors.behind
        : colors.danger
  }));

  const chartComponents = { doughnut: Doughnut, bar: Bar, pie: Pie };
  const [chartType, setChartType] = useState("doughnut");
  const ChartComponent = chartComponents[chartType];

  const handleChartTypeChange = (value) => setChartType(value);

  const menu = (
    <Menu
      style={{
        backgroundColor: colors.background,
      }}
    >
      <Menu.Item onClick={() => handleChartTypeChange("doughnut")}>
        Doughnut
      </Menu.Item>
      <Menu.Item onClick={() => handleChartTypeChange("bar")}>Bar</Menu.Item>
      <Menu.Item onClick={() => handleChartTypeChange("pie")}>Pie</Menu.Item>
    </Menu>
  );
  useEffect(() => {
    if (clerkId) {
      dispatch(fetchTaskPerformanceData(clerkId));
    }
  }, [clerkId, dispatch]);

  return (
    <ConfigProvider theme={themeConfig}>
      <motion.div
        className="h-full flex flex-col"
        whileHover={{ y: -5, transition: { duration: 0.3 } }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          title={
            <Flex
              align="center"
              justify="space-between"
              style={{ width: "100%" }}
            >
              <Title strong level={5}>
                Task Performance
              </Title>
              <Dropdown overlay={menu} trigger={["click"]}>
                <Flex
                  align="center"
                  justify="center"
                  className="w-8 h-8 rounded-full cursor-pointer"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.hoverGray)
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
          className="!shadow-md h-full w-full flex flex-col justify-between ml-auto"
          bodyStyle={{ padding: 0 }}
          style={{
            borderColor: colors.background,
          }}
        >
          <Space direction="vertical" style={{ width: "100%", padding: 16 }}>
            <Flex
              justify="center"
              align="center"
              style={{ width: "100%", height: 180 }}
            >
              {ChartComponent &&
                taskPerformanceData?.datasets?.[0]?.data?.length > 0 && (
                <ChartComponent
                  data={{
                      taskPerformanceData,
                      datasets: [
                        {
                          ...taskPerformanceData.datasets[0],
                          backgroundColor: [
                            colors.completed,
                            colors.inProgress,
                            colors.behind
                          ]
                        }
                      ]
                    }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    layout: { padding: { top: 0, bottom: 0 } },
                    ...(chartType === "bar" && {
                      scales: {
                        x: {
                          ticks: {
                            color: colors.textcolor,
                          },
                          grid: {
                            color: colors.border,
                          },
                        },
                        y: {
                          ticks: {
                            color: colors.textcolor,
                          },
                          grid: {
                            color: colors.border,
                          },
                          min: 0,
                          max: 100,
                        },
                      },
                    }),
                  }}
                />
              )}
            </Flex>
          </Space>
          <Row gutter={[12, 12]} justify="center" className="mt-auto p-4">
            {transformedDetails.map((task, index) => (
              <Col span={8} xs={24} sm={8} key={index} className="text-center">
                <Flex vertical align="center" gap={8}>
                  {React.cloneElement(task.icon, {
                    className: "text-[24px]",
                    style: { color: task.color },
                  })}
                  <Text strong style={{ fontSize: 20 }}>
                    {task.value}%
                  </Text>
                  <Text style={{ fontSize: 18 }}>{task.name}</Text>
                </Flex>
              </Col>
            ))}
          </Row>
        </Card>
      </motion.div>
    </ConfigProvider>
  );
};

export default TaskPerformance;
