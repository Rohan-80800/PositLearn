import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ConfigProvider,
  Card,
  Typography,
  Space,
  Button,
  Collapse,
  Tooltip,
  Row,
  Col,
  Flex,
} from "antd";
import { Icon } from "@iconify/react";
import Editor from "@monaco-editor/react";
import { fetchCheats } from "../redux/cheatSheetSlice";
import { Colors } from "../config/color";
import Loader from "../components/loader";
import Notifier from "../components/notifier";
import { usePermissions } from "../permissions";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const CheatsheetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { cheats, status } = useSelector((state) => state.cheats);
  const colors = Colors();
  const [copied, setCopied] = useState({});
  const [activePanels, setActivePanels] = useState({});
  const cheatsheet = cheats.find((c) => c.id === parseInt(id));
  const resourceData = cheatsheet?.resource ? JSON.parse(cheatsheet.resource) : {};
  const sections = resourceData.sections || [];
  const { hasAccess } = usePermissions();

  const isAllExpanded = () => {
    return sections.every((section) =>
      section.snippets.every((snippet) =>
        (activePanels[section.id] || []).includes(snippet.id)
      )
    );
  };

  const toggleAll = () => {
    const newActivePanels = {};
    if (!isAllExpanded()) {
      sections.forEach((section) => {
        newActivePanels[section.id] = section.snippets.map(
          (snippet) => snippet.id
        );
      });
    }
    setActivePanels(newActivePanels);
  };

  const handlePanelChange = (sectionId, keys) => {
    setActivePanels((prev) => ({
      ...prev,
      [sectionId]: keys,
    }));
  };

  const themeConfig = {
    token: {
      motion: false,
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorPrimary: colors.menuhover,
      colorBorder: colors.border,
    },
    components: {
      Card: {
        colorBorder: colors.border,
        borderRadiusLG: 10,
        motion: false,
      },
      Button: {
        borderRadius: 6,
      },
      Collapse: {
        borderRadiusLG: 10,
        colorBorder: colors.border,
      },
    },
  };

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCheats());
    }
  }, [dispatch, status]);

  const handleCopy = (snippetId, code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied((prev) => ({ ...prev, [snippetId]: true }));
      Notifier({
        type: "success",
        title: "Code Copied",
        description: "Code copied to clipboard!",
        placement: "bottomRight",
        colors,
      });
      setTimeout(
        () => setCopied((prev) => ({ ...prev, [snippetId]: false })),
        2000
      );
    });
  };

  const getInitial = (title) => {
    return title ? title.charAt(0).toUpperCase() : "C";
  };

  const getInitialColor = (title) => {
    const index = title.length % colors.avatarColors.length;
    return colors.avatarColors[index];
  };

  if (status === "loading") {
    return <Loader />;
  }

  if (!cheatsheet) {
    return (
      <Space direction="vertical" size="middle" className="p-6 !w-full">
        <Title level={3} className="text-2xl font-semibold">
          Cheatsheet Not Found
        </Title>
        <Text className="text-gray-600">
          The requested cheatsheet could not be found.
        </Text>
        <Space>
          <Button
            onClick={() => navigate("/cheatsheet")}
            style={{ background: colors.primary, color: colors.white }}
            className="rounded"
          >
            Back to Cheatsheets
          </Button>
        </Space>
      </Space>
    );
  }

  const initial = getInitial(cheatsheet.title);
  const initialColor = getInitialColor(cheatsheet.title);

  return (
    <ConfigProvider theme={themeConfig}>
      <Space direction="vertical" size="large" className="min-h-screen p-4 w-full">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={18}>
            <Space align="center">
              <Text
                className="w-6 h-6 -mt-2 rounded-full flex items-center justify-center font-bold text-sm !text-white leading-none"
                style={{ backgroundColor: initialColor }}
              >
                {initial}
              </Text>
              <Title
                level={2}
                className="m-0 text-xl sm:text-2xl font-bold truncate"
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={cheatsheet.title}
              >
                {cheatsheet.title}
              </Title>
            </Space>

            <Text className="block text-sm sm:text-base ml-10">
              {cheatsheet.description}
            </Text>
          </Col>
          <Col xs={24} sm={6}>
            <Space direction="horizontal" size="small"  className="w-full sm:flex sm:flex-row sm:gap-2 sm:justify-end">
              {hasAccess("org:cheetsheet:manage") && (
                <Button
                  onClick={() => navigate(`/cheatsheet/edit/${cheatsheet.id}`)}
                  style={{ borderColor: colors.primary, color: colors.primary }}
                  className="w-full sm:w-auto rounded"
                >
                  Edit
                </Button>
              )}
              <Button
                onClick={toggleAll}
                style={{
                  background: colors.primary,
                  color: colors.white,
                  borderColor: colors.primary,
                }}
                className="w-full sm:w-auto rounded flex justify-between items-center"
              >
                {isAllExpanded() ? "Collapse All" : "Expand All"}
                <Icon
                  icon={isAllExpanded() ? "mdi:chevron-up" : "mdi:chevron-down"}
                  width={16}
                />
              </Button>
            </Space>
          </Col>
        </Row>

        <Row className="w-full">
          <Col span={24}>
            <Space direction="vertical" size="middle" className="w-full">
              {sections.map((section) => (
                <Card
                  key={section.id}
                  className="card !p-0"
                  style={{ borderRadius: 10 }}
                  title={
                    <Space direction="vertical" size={4}>
                      <Tooltip title={section.title}>
                        <Text className="!text-lg block truncate max-w-[200px]">
                          {section.title}
                        </Text>
                      </Tooltip>
                    </Space>
                  }
                >
                  <Text>{section.description}</Text>
                  <Collapse
                    activeKey={activePanels[section.id] || []}
                    onChange={(keys) => handlePanelChange(section.id, keys)}
                    bordered={false}
                    className="collapse-panel !mt-2 !-mr-4 !-ml-4"
                    expandIcon={({ isActive }) => (
                      <Icon
                        icon={isActive ? "mdi:chevron-up" : "mdi:chevron-down"}
                        width={18}
                      />
                    )}
                  >
                    {section.snippets.map((snippet) => (
                      <Panel
                        header={
                          <Flex justify="space-between" align="center">
                            <Text strong className="text-sm">
                              {snippet.language}
                            </Text>
                            <Space style={{ color: colors.primary }}>
                              <Button
                                type="text"
                                icon={
                                  <Icon
                                  style={{ color: colors.primary }}
                                    icon={
                                      copied[snippet.id]
                                        ? "mdi:check"
                                        : "mdi:content-copy"
                                    }
                                    width={16}
                                  />
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(snippet.id, snippet.code);
                                }}
                                className="!absolute !top-3 !right-8"
                              />
                              <Tooltip
                                title={snippet.description || "No description"}
                                placement="top"
                              >
                                <Icon
                                  icon="mdi:information-outline"
                                  width={16}
                                />
                              </Tooltip>
                            </Space>
                          </Flex>
                        }
                        key={snippet.id}
                      >
                        <Editor
                          height={`${Math.min(
                            (snippet.code?.split("\n").length || 1) * 20 + 0,
                            250
                          )}px`}
                          defaultLanguage={
                            snippet.language?.toLowerCase() || "javascript"
                          }
                          value={snippet.code}
                          theme={colors.monachotheme}
                          options={{
                            readOnly: true,
                            fontSize: 12,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                          }}
                        />
                      </Panel>
                    ))}
                  </Collapse>
                </Card>
              ))}
            </Space>
          </Col>
        </Row>
      </Space>
    </ConfigProvider>
  );
};

export default CheatsheetDetails;
