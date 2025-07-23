import React, { useEffect, useMemo } from "react";
import { Card, Select, Flex } from "antd";
import { Bar } from "react-chartjs-2";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeamProgress } from "../redux/userprogressSlice";
import Loader from "./loader";

const { Option } = Select;

const TeamProgressCard = ({
  selectedProject,
  setSelectedProject,
  userProjects,
  colors,
  chartOptions,
}) => {
  const dispatch = useDispatch();
  const { teamProgress, loadingTeamProgress } = useSelector(
    (state) => state.userprogress
  );

  useEffect(() => {
    if (selectedProject) {
      dispatch(fetchTeamProgress(selectedProject));
    }
  }, [dispatch, selectedProject]);

  const comparisonData = useMemo(() => {
    if (!teamProgress || !selectedProject) return { labels: [], datasets: [] };

    const filteredData = teamProgress.filter(
      (item) => Number(item.projectId) === Number(selectedProject)
    );

    return {
      labels: filteredData.map((item) => item.userName),
      datasets: [
        {
          label: "Progress",
          data: filteredData.map((item) =>
            typeof item.progress === "object"
              ? item.progress.progress
              : item.progress ?? 0
          ),
          backgroundColor: colors.primary,
          borderRadius: 6,
          maxBarThickness: 40,
          barPercentage: 0.8,
          categoryPercentage: 0.8,
        },
      ],
    };
  }, [teamProgress, selectedProject, colors.primary]);

  return (
    <Card
      title={`Team Progress: ${
        userProjects.find((p) => p.id === selectedProject)?.name || ""
      }`}
      className="!h-full !border-transparent"
      style={{
        backgroundColor: colors.background,
        color: colors.textcolor,
      }}
      styles={{
        body: {
          height: "calc(100% - 56px)"
        },
        header: {
          color: colors.textcolor,
          borderBottom: `1px solid ${colors.borderColor}`,
          paddingBottom: 8,
          marginBottom: 16
        }
      }}
      extra={
        <Select
          showSearch
          value={selectedProject}
          onChange={setSelectedProject}
          className="!w-30"
          style={{ color: colors.textcolor }}
          optionFilterProp="children"
          filterOption={(input, option) =>
            option?.children?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {userProjects.map((proj) => (
            <Option
              key={proj.id}
              value={proj.id}
              style={{ color: colors.textcolor }}
            >
              {proj.name}
            </Option>
          ))}
        </Select>
      }
    >
      {loadingTeamProgress && !comparisonData.labels.length ? (
        <Flex className="h-[300px] w-full justify-center items-center overflow-hidden">
          <Loader />
        </Flex>
      ) : (
        <Flex className="h-[300px] w-full overflow-hidden">
          <Bar data={comparisonData} options={chartOptions} />
        </Flex>
      )}
    </Card>
  );
};

export default TeamProgressCard;
