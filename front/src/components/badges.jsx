import { useState, useEffect } from "react";
import {
  Card,
  ConfigProvider,
  Row,
  Col,
  Dropdown,
  Menu,
  Typography,
  Flex,
  Space,
} from "antd";
import { TrophyOutlined, StarOutlined } from "@ant-design/icons";
import { Colors } from "../config/color";
import { fetchProjects } from "../redux/projectSlice";
import { useSelector, useDispatch } from "react-redux";
import { useUser } from "@clerk/clerk-react";
import BadgeCard from "./BadgeCard";
import Loader from "../components/loader";
import { showLoader, hideLoader } from "../redux/loderSlice";
import api from "../axios";

const { Paragraph, Text } = Typography;

const Badges = () => {
  const colors = Colors();
  const { user } = useUser();
  const dispatch = useDispatch();
  const [badges, setBadges] = useState([]);
  const { isLoading } = useSelector((state) => state.loader);
  const [selectedProject, setSelectedProject] = useState("all");
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorTextPlaceholder: colors.placeholderGray,
      colorPrimary: colors.primary,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
      },
      Select: {
        fontSize: 13,
        optionSelectedBg: colors.hoverGray,
        colorTextPlaceholder: colors.placeholderGray,
        optionActiveBg: colors.hoverGray,
        colorPrimaryHover: colors.primary,
      },
      Dropdown: {
        controlItemBgHover: colors.hoverGray,
      },
      Input: {
        hoverBorderColor: colors.primary,
      },
    },
  };

  const fetchBadges = async () => {
    dispatch(showLoader());
    try {
      const response = await api.get(`api/badges/get_badges/${user.id}`);
      const result = response.data || response;
      const isSuccess = response.status >= 200 && response.status < 300;

      if (isSuccess) {
        setBadges(result.data || result);
      } else {
        throw new Error(result.message || "Failed to fetch badges");
      }
    } catch (error) {
      console.error(error);
    } finally {
      dispatch(hideLoader());
    }
  };
  useEffect(() => {
    const handleUpdate = () => fetchBadges();
    window.addEventListener("badgesUpdated", handleUpdate);
    return () => window.removeEventListener("badgesUpdated", handleUpdate);
  }, []);

  useEffect(() => {
    fetchBadges();
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleDropdownVisibleChange = (visible) => {
    setDropdownVisible(visible);
    if (!visible) {
      setShowAllProjects(false);
    }
  };

  const handleProjectSelect = ({ key }, e) => {
    if (key === "show_all") {
      setShowAllProjects(true);
      setDropdownVisible(true);
      e.domEvent.stopPropagation();
    } else {
      setSelectedProject(key);
      setShowAllProjects(false);
      setDropdownVisible(false);
    }
  };

  const filteredAchievements =
    badges?.achievements?.filter((achievement) =>
      selectedProject === "all"
        ? true
        : achievement.project_id.toString() === selectedProject
    ) || [];

  const filteredUpcomingMilestones =
    badges?.upcomingMilestones?.filter((milestone) =>
      selectedProject === "all"
        ? true
        : milestone.project_id.toString() === selectedProject
    ) || [];

  const hasAchievements = filteredAchievements.length > 0;

  const projectItems = badges?.projects || [];
  const visibleProjects = showAllProjects
    ? projectItems
    : projectItems.slice(0, 3);
  const showMoreOption = projectItems.length > 3 && !showAllProjects;

  const projectMenu = (
    <Menu onClick={handleProjectSelect}>
      <Menu.Item key="all">All Projects</Menu.Item>
      {visibleProjects.map((project) => (
        <Menu.Item key={project.project_id.toString()}>
          {project.project_name}
        </Menu.Item>
      ))}
      {showMoreOption && <Menu.Item key="show_all">...More</Menu.Item>}
    </Menu>
  );

  return (
    <ConfigProvider theme={themeConfig}>
      <>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <Card className="!m-5 !mb-2">
              <Flex
                justify="space-between"
                align="center"
                className="!mb-5 sm:!mb-8 lg:!mb-12 !w-full !gap-4"
                wrap="wrap"
              >
                <Text
                  className="!text-2xl !font-bold !break-words"
                  style={{ color: colors.badges_text }}
                >
                  <TrophyOutlined
                    className="!text-[30px] !mr-[14px]"
                    style={{ color: colors.badges_text }}
                  />
                  {hasAchievements
                    ? "Well Done! You've Earned New Achievements!"
                    : "No Achievements Yet - Keep Learning!"}
                </Text>

                {badges?.projects?.length > 1 && (
                  <Space className="!w-40">
                    <Dropdown
                      overlay={projectMenu}
                      trigger={["click"]}
                      open={dropdownVisible}
                      onOpenChange={handleDropdownVisibleChange}
                    >
                      <Flex
                        align="center"
                        className="cursor-pointer !px-4 !py-1 text-white font-semibold rounded !w-40"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <StarOutlined className="mr-2 text-sm" />
                        <Text className="truncate !w-full !text-white">
                          {selectedProject === "all"
                            ? "Select Projects"
                            : badges?.projects?.find(
                                (p) =>
                                  p.project_id.toString() === selectedProject
                              )?.project_name || "Select Project"}
                        </Text>
                      </Flex>
                    </Dropdown>
                  </Space>
                )}
              </Flex>

              <Row gutter={[16, 16]}>
                {hasAchievements ? (
                  filteredAchievements.map((achievement, index) => (
                    <Col
                      key={index}
                      xs={24}
                      sm={12}
                      md={12}
                      lg={8}
                      xl={6}
                    >
                      <BadgeCard
                        {...achievement}
                        colors={colors}
                      />
                    </Col>
                  ))
                ) : (
                  <Col span={24}>
                    <Paragraph className="!text-gray-500">
                      {selectedProject === "all"
                        ? "You haven't earned any badges yet. Complete project milestones to unlock achievements!"
                        : "No achievements for this project yet."}
                    </Paragraph>
                  </Col>
                )}
              </Row>
            </Card>

            <Card className="!m-5 !mt-2">
              <Paragraph
                level={2}
                className="!text-lg !font-bold !mb-4 md:!text-xl"
                style={{ color: colors.darkBlueGray }}
              >
                Upcoming Milestones to Unlock
              </Paragraph>
              <Row gutter={[16, 16]}>
                {filteredUpcomingMilestones.length > 0 ? (
                  filteredUpcomingMilestones.map((milestone, index) => (
                    <Col
                      key={index}
                      xs={24}
                      sm={12}
                      md={12}
                      lg={8}
                      xl={6}
                    >
                      <BadgeCard
                        {...milestone}
                        colors={colors}
                      />
                    </Col>
                  ))
                ) : (
                  <Col span={24}>
                    <Paragraph>
                      {selectedProject === "all"
                        ? "No upcoming milestones available."
                        : "No upcoming milestones for this project."}
                    </Paragraph>
                  </Col>
                )}
              </Row>
            </Card>
          </>
        )}
      </>
    </ConfigProvider>
  );
};

export default Badges;
