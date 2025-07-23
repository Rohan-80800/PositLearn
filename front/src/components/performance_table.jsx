import { useEffect, useState, useMemo } from "react";
import {
  Card,
  Select,
  Typography,
  ConfigProvider,
  Tag,
  Empty,
  Space,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProjects,
  fetchUserPerformance,
  setSelectedProject,
} from "../redux/performanceSlice";
import { Colors } from "../config/color";
import CustomTable from "./customTable";
import Loader from "./loader";
import { DownOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const PerformanceTable = ({ type = "intern" }) => {
  const colors = Colors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { projects, selectedProjects, performanceData, loading, error } =
    useSelector((state) => state.performance);
  const selectedProject = selectedProjects[type];
  const userPerformance = performanceData[type] || [];
  const isLoading = loading[type];
  const errorMessage = error[type];

  const filteredProjects = projects.filter((project) => {
    const matchesType =
      type === "intern"
        ? project.project_for === "Interns"
        : project.project_for === "Employee";
    const matchesSearch = project.project_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesType && (matchesSearch || !searchTerm);
  });

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    if (selectedProject) {
      dispatch(fetchUserPerformance({ projectId: selectedProject, type }));
    }
  }, [selectedProject, type, dispatch]);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleProjectChange = (projectId) => {
    dispatch(setSelectedProject({ projectId, type }));
    setSearchTerm("");
  };

  const handleDropdownVisibleChange = (visible) => {
    setDropdownVisible(visible);
    if (!visible) {
      setSearchTerm("");
    }
  };

  useEffect(() => {
    if (filteredProjects.length > 0 && !selectedProject) {
      if (
        !searchTerm ||
        filteredProjects.some((p) => p.id === selectedProject)
      ) {
        dispatch(
          setSelectedProject({
            projectId: filteredProjects[0].id,
            type,
          })
        );
      }
    }
  }, [filteredProjects, selectedProject, type, dispatch, searchTerm]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(userPerformance)) return [];

    return userPerformance
      .filter((user) =>
        type === "intern" ? user.role === "INTERN" : user.role === "EMPLOYEE"
      )
      .map((user) => ({
        ...user,
        progress: Math.round(user.progress),
      }));
  }, [userPerformance, type]);

  const columns = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      width: 80,
      align: "center",
      render: (rank) => (
        <Tag
          color={rank === 1 ? "gold" : "default"}
          className="!font-bold !min-w-[30px] !text-center"
        >
          {rank}
        </Tag>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Text
          onClick={() => navigate(`/user-performance/${record.id}`)}
          className="cursor-pointer"
        >
          {text}
        </Text>
      ),
    },
    {
      title: "Progress",
      dataIndex: "progress",
      key: "progress",
      render: (progress) => (
        <Space
          align="center"
          className="!min-w-[50px] !justify-center"
        >
          <Tag
            color={
              progress === 100
                ? "success"
                : progress >= 50
                ? "warning"
                : "default"
            }
            className="!min-w-[50px] !text-center"
          >
            {progress}%
          </Tag>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "currentProject",
      key: "status",
      render: (status) => (
        <Tag
          color={status === "Active" ? "processing" : "default"}
          className="!capitalize"
        >
          {status}
        </Tag>
      ),
    },
  ];

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
        headerBg: colors.cardHeader,
      },
      Select: {
        optionSelectedBg: colors.theme,
        colorTextPlaceholder: colors.placeholderGray,
        colorIcon: colors.textcolor,
        optionActiveBg: colors.hoverGray,
        hoverBorderColor: colors.primary,
        activeBorderColor: colors.primary,
        colorBgContainer: "transparent",
      },
      Table: {
        headerBg: colors.tableHeader,
        headerColor: colors.textcolor,
        colorBgContainer: colors.background,
        borderColor: colors.border,
      },
      Tag: {
        colorText: colors.textcolor,
      },
    },
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <Card
        title={`${type === "employee" ? "Employee" : "Intern"} Performance`}
        extra={
          <Select
            className="!w-25 sm:!w-40"
            value={selectedProjects[type]}
            onChange={handleProjectChange}
            placeholder="Select a project"
            showSearch
            onSearch={handleSearch}
            filterOption={false}
            open={dropdownVisible}
            onDropdownVisibleChange={handleDropdownVisibleChange}
            style={{
              color: colors.textcolor,
            }}
            dropdownStyle={{ backgroundColor: colors.background }}
            suffixIcon={<DownOutlined style={{ color: colors.textcolor }} />}
            notFoundContent={
              <Empty
                image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                description={
                  <Text style={{ color: colors.textcolor, fontSize: 14 }}>
                    {searchTerm
                      ? "No matching projects found"
                      : "No projects available"}
                  </Text>
                }
                imageStyle={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  margin: "auto",
                  filter: colors.theme === "dark" ? "invert(1)" : "none",
                }}
              />
            }
          >
            {filteredProjects.map((project) => (
              <Select.Option
                key={project.id}
                value={project.id}
              >
                {project.project_name}
              </Select.Option>
            ))}
          </Select>
        }
        className="shadow-md !rounded-lg min-h-[400px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
        styles={{
          body: { padding: 0 },
          head: {
            borderBlockStyle: "none",
            padding: "16px 24px",
          },
        }}
        style={{ borderColor: colors.border }}
      >
        {isLoading ? (
          <Space className="w-full h-[300px] flex items-center justify-center">
            <Loader isConstrained={true} />
          </Space>
        ) : errorMessage ? (
          <Space className="w-full h-[300px] flex items-center justify-center">
            <Text type="danger">{errorMessage}</Text>
          </Space>
        ) : filteredData.length > 0 ? (
          <CustomTable
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
          />
        ) : (
          <Empty
            image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
            imageStyle={{
              height: 120,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "50px",
              filter: colors.theme === "dark" ? "invert(1)" : "none",
            }}
            description={
              <Text
                className="!text-base"
                style={{
                  color: colors.textcolor,
                }}
              >
                {selectedProject
                  ? `No ${
                      type === "employee" ? "employees" : "interns"
                    } with progress data for this project`
                  : "No project selected"}
              </Text>
            }
          />
        )}
      </Card>
    </ConfigProvider>
  );
};

export default PerformanceTable;
