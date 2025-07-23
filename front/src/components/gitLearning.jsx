import { useEffect, useState } from "react";
import { CopyOutlined, CheckOutlined, CodeOutlined } from "@ant-design/icons";
import {
  Card,
  Button,
  Pagination,
  Row,
  Col,
  ConfigProvider,
  List,
  Table,
  Tooltip,
  Steps,
  Drawer,
  Flex,
  Typography,
  Image,
  Select,
  Space,
  Divider,
} from "antd";
import { Colors } from "../config/color";
import {
  FaWindows,
  FaApple,
  FaLinux,
  FaHandPointRight,
  FaBars,
} from "react-icons/fa";
import Loader from "./loader";
import { useSearchParams, useNavigate } from "react-router-dom";

const { Text, Paragraph, Title, Link } = Typography;
const { Option } = Select;

const getThemeConfig = (colors) => ({
  token: {
    colorBgContainer: colors.background,
    colorText: colors.textcolor,
    colorBorder: colors.background,
    colorBgElevated: colors.background,
    colorPrimary: colors.sidebarbg,
    colorBorderSecondary: colors.border,
  },
  components: {
    Table: {
      headerBg: "transparent",
    },
    Tabs: {
      itemColor: colors.textcolor,
      itemHoverColor: colors.sidebarbg,
      horizontalMargin: "0px",
    },
    Pagination: {
      colorTextDisabled: colors.border,
    },
    Select: {
      optionSelectedBg: colors.hoverGray,
      colorPrimaryHover: colors.primary,
      colorBorder: colors.border,
    },
  },
});

const GitWorkflowComponent = ({
  workflowSteps,
  idx,
  copyToClipboard,
  copiedIndex,
  colors,
}) => {
  return (
    <Flex className="p-6">
      <Steps
        direction="vertical"
        items={workflowSteps.map((step, stepIdx) => ({
          title: <Text strong>{step.title}</Text>,
          description: (
            <Flex vertical>
              <Text>{step.description}</Text>
              <Flex
                className="rounded-lg max-w-full flex justify-between !m-2"
                style={{ backgroundColor: colors.theme }}
              >
                <Space
                  className="!whitespace-pre-wrap !pl-5  !break-words"
                  style={{ color: colors.textcolor }}
                >
                  <Text className="items-center !text-sm ">{step.command}</Text>
                </Space>
                <Tooltip
                  title={
                    copiedIndex === `${idx}-${stepIdx}` ? "Copied!" : "Copy"
                  }
                >
                  <Button
                    type="text"
                    className="!p-5"
                    aria-label={`Copy command for ${step.command}`}
                    icon={
                      copiedIndex === `${idx}-${stepIdx}` ? (
                        <CheckOutlined className="!text-green-400" />
                      ) : (
                        <CopyOutlined className="!text-gray-400 !hover:!text-white" />
                      )
                    }
                    onClick={() =>
                      copyToClipboard(step.command, `${idx}-${stepIdx}`)
                    }
                  />
                </Tooltip>
              </Flex>
            </Flex>
          ),
          icon: <CodeOutlined className="!text-indigo-500" />,
        }))}
      />
    </Flex>
  );
};

const CommandList = ({ item, idx, copyToClipboard, copiedIndex, colors }) => {
  const availableOS = item.commands?.length
    ? Object.keys(item.commands[0]).filter((key) =>
        ["windows", "linux", "mac", "all"].includes(key)
      )
    : [];

  const hasOSSpecificCommands = availableOS.some((os) =>
    ["windows", "linux", "mac"].includes(os)
  );

  const hasAllKey = availableOS.includes("all");
  const shouldShowOSSelector = hasOSSpecificCommands && !hasAllKey;

  const [selectedOS, setSelectedOS] = useState(
    hasAllKey || !hasOSSpecificCommands ? "all" : availableOS[0]
  );

  const handleOSChange = (value) => {
    setSelectedOS(value);
  };

  return (
    <Flex vertical>
      {shouldShowOSSelector && availableOS.length > 1 && (
        <Select
          value={selectedOS}
          onChange={handleOSChange}
          className="!mb-2 w-44"
          style={{
            color: colors.textcolor,
            borderColor: colors.darkgray,
          }}
        >
          {availableOS.map((os) =>
            ["windows", "linux", "mac"].includes(os) ? (
              <Option
                key={os}
                value={os}
                style={{
                  backgroundColor: colors.background,
                  color: colors.textcolor,
                }}
              >
                {os.charAt(0).toUpperCase() + os.slice(1)}
              </Option>
            ) : null
          )}
        </Select>
      )}

      {item.commands?.map((command, stepIdx) => (
        <Flex key={`${idx}-${stepIdx}`} className="mb-4" vertical>
          <Text strong>{command.step}</Text>
          {(command[selectedOS] || command["all"]) && (
            <Flex
              className="!text-white !rounded-lg !max-w-full !flex !justify-between !mt-3 !mb-3"
              style={{ backgroundColor: colors.theme }}
            >
              <Space className="!whitespace-pre-wrap !pl-4 !break-words">
                <Text
                  className="!items-center !text-sm"
                  style={{ color: colors.textcolor }}
                >
                  {command[selectedOS] || command["all"]}
                </Text>
              </Space>
              <Tooltip
                title={copiedIndex === `${idx}-${stepIdx}` ? "Copied!" : "Copy"}
              >
                <Button
                  type="text"
                  className="!p-5"
                  aria-label={`Copy command for ${selectedOS || "all"}`}
                  icon={
                    copiedIndex === `${idx}-${stepIdx}` ? (
                      <CheckOutlined className="!text-green-400" />
                    ) : (
                      <CopyOutlined className="!text-gray-400 hover:!text-white" />
                    )
                  }
                  onClick={() =>
                    copyToClipboard(
                      command[selectedOS] || command["all"],
                      `${idx}-${stepIdx}`
                    )
                  }
                />
              </Tooltip>
            </Flex>
          )}
          {command.expected_output && (
            <Flex className="!mt-1" vertical>
              <Text strong>Expected Output:</Text>
              <pre
                className="!text-sm !p-3 !rounded-lg !mt-3"
                style={{ backgroundColor: colors.theme }}
              >
                {command.expected_output.map((line, i) => (
                  <Flex key={i}>{line}</Flex>
                ))}
              </pre>
            </Flex>
          )}

          {command.output_explanation && (
            <Flex className="!mt-1" vertical>
              <Text strong>Output Explanation:</Text>
              <Paragraph className="!pl-5 !mt-2">
                {command.output_explanation.map((explanation, i) => (
                  <Paragraph
                    key={i}
                    className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-base !m-1"
                  >
                    {explanation}
                  </Paragraph>
                ))}
              </Paragraph>
            </Flex>
          )}
        </Flex>
      ))}
    </Flex>
  );
};

const OSInstructionsComponent = ({ subcontent, colors }) => {
  const osIcons = {
    Windows: <FaWindows className="text-blue-600 w-10 h-10" />,
    Mac: (
      <FaApple
        className="w-10 h-10"
        style={{
          color: colors.darkgray,
        }}
      />
    ),
    Linux: <FaLinux className="text-yellow-600 w-10 h-10" />,
  };
  return (
    <Row gutter={[16, 16]} className="!mt-0 !flex !flex-wrap">
      {["Windows", "Mac", "Linux"].map((os) => {
        const osSteps = subcontent?.find((step) => step.title === os);
        if (!osSteps) return null;

        return (
          <Col span={24} key={os}>
            <Flex
              className="!flex !items-start !gap-3 !p-4 !pb-0 !rounded-lg"
              style={{ backgroundColor: colors.gray }}
            >
              <Flex className="w-10">{osIcons[os]}</Flex>
              <Flex vertical>
                <Title level={3} className="!mb-1 !text-lg !font-bold">
                  {os}
                </Title>

                <Paragraph className="!pl-5 !flex-wrap !m-1 text-gray-700">
                  {osSteps?.desc.map((line, index) => (
                    <Paragraph
                      key={index}
                      className="relative pl-4 !mb-1 before:content-['•'] before:absolute before:left-0 before:text-gray-700"
                      style={{ color: colors.textcolor }}
                    >
                      {line}
                    </Paragraph>
                  ))}
                </Paragraph>
              </Flex>
            </Flex>
          </Col>
        );
      })}
    </Row>
  );
};

const TableComponent = ({ item }) => {
  const columns = [
    {
      title: item.difference1?.[0] || "Column 1",
      dataIndex: "difference1",
      key: "difference1",
    },
    {
      title: item.difference2?.[0] || "Column 2",
      dataIndex: "difference2",
      key: "difference2",
    },
  ];

  const dataSource = item.difference1?.slice(1).map((desc, i) => ({
    key: i,
    difference1: desc,
    difference2: item.difference2?.[i + 1] || "",
  }));

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      bordered
      className="overflow-y-auto"
    />
  );
};

const ContentCard = ({ item, idx, colors, copyToClipboard, copiedIndex }) => {
  return (
    <Col span={24} key={idx}>
      <Card
        className="!flex !flex-col !border-none h-[70vh] !overflow-y-auto"
        title={
          <Text className="!text-lg">
            <Text style={{ color: colors.primary }} className="!text-lg">
              ➤
            </Text>{" "}
            {item.title}
          </Text>
        }
      >
        <Flex className="!flex !flex-col !gap-0" vertical>
          {item.subtitle?.map((subtitle, j) => (
            <Paragraph key={j} className="mb-0">
              {subtitle}
            </Paragraph>
          ))}

          {item.description?.map((desc, j) => (
            <Flex key={j} className="!mb-4" vertical>
              {desc.details?.length > 0 && (
                <Paragraph className="!mb-2">
                  <Text strong>{desc.details[0]}</Text>
                </Paragraph>
              )}

              {desc.details?.slice(1).map((detail, k) => (
                <Paragraph key={k} className="!mb-2">
                  {detail}
                </Paragraph>
              ))}

              {desc.images?.map((img, i) => (
                <Image
                  key={i}
                  src={img}
                  alt={item.title}
                  className="!mt-4 !rounded-lg !shadow-md"
                  style={{ width: "auto", height: "auto", maxWidth: "100%" }}
                  preview={false}
                />
              ))}
            </Flex>
          ))}

          {item.subcontent && (
            <OSInstructionsComponent
              subcontent={item.subcontent}
              colors={colors}
            />
          )}

          {item.difference && <TableComponent item={item} />}

          {item.commands && (
            <CommandList
              item={item}
              idx={idx}
              copyToClipboard={copyToClipboard}
              copiedIndex={copiedIndex}
              colors={colors}
            />
          )}

          {item.gitWorkflowSteps && (
            <GitWorkflowComponent
              workflowSteps={item.gitWorkflowSteps}
              idx={idx}
              copyToClipboard={copyToClipboard}
              copiedIndex={copiedIndex}
              colors={colors}
            />
          )}

          {item.links && item.links.length > 0 && (
            <Flex
              className="!mt-5"
              vertical
            >
              <Text
                strong
                className="!font-semibold"
              >
                <Text style={{ color: colors.primary }}>➤</Text>
                <Text className="!ml-1">Additional Resources</Text>
              </Text>

              <Divider className="!my-2 !border-gray-300" />

              <Flex vertical className="!pl-5">
                {item.links.map((link, index) => (
                  <Flex key={index} align="center" className="!mb-3">
                    <FaHandPointRight
                      className="!mr-2 !text-gray-500"
                      size={18}
                    />
                    <Link
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline !underline !italic"
                      style={{ color: colors.primary }}
                    >
                      {link.name}
                    </Link>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          )}
        </Flex>
        <Flex className="flex-grow" />
      </Card>
    </Col>
  );
};

const Github = () => {
  const [sections, setSections] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [currentPages, setCurrentPages] = useState({});
  const [activeTabKey1, setActiveTabKey1] = useState(() => {
    return localStorage.getItem("activeTabKey") || "tab1";
  });
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const colors = Colors();
  const themeConfig = getThemeConfig(colors);
  const cardsPerPage = 1;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const pageParam = searchParams.get("page");

    if (tabParam && sections.length > 0) {
      const matchingSectionIndex = sections.findIndex(
        (section) => section.id.toString() === tabParam
      );

      if (matchingSectionIndex !== -1) {
        const tabKey = `tab${matchingSectionIndex + 1}`;
        setActiveTabKey1(tabKey);

        if (pageParam) {
          setCurrentPages((prev) => ({
            ...prev,
            [tabKey]: parseInt(pageParam) || 1,
          }));
        }
      }
    }
  }, [searchParams, sections]);

  useEffect(() => {
    if (!sections.length) {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          const response = await fetch("/git_github.json");
          const data = await response.json();
          setSections(data.sections || []);
          setCurrentPages(
            (prevPages) =>
              data.sections?.reduce((acc, _, index) => {
                acc[`tab${index + 1}`] = 1;
                return acc;
              }, {}) || prevPages
          );
        } catch (err) {
          console.error(err.message);
        } finally {
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      };
      fetchData();
    }

    localStorage.setItem("activeTabKey", activeTabKey1);
  }, [activeTabKey1, sections]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setSidebarVisible(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const tabList = sections.map((section, index) => ({
    key: `tab${index + 1}`,
    label: section.title,
  }));

  const copyToClipboard = (command, index) => {
    navigator.clipboard.writeText(command);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePageChange = (tabKey, page) => {
    const sectionIndex = parseInt(tabKey.replace("tab", "")) - 1;
    const sectionId = sections[sectionIndex]?.id;

    navigate(`/git-github?tab=${sectionId}&page=${page}`);
    setCurrentPages((prev) => ({
      ...prev,
      [tabKey]: page,
    }));
  };

  const handleContentLinkClick = (tabKey, pageNumber) => {
    const sectionIndex = parseInt(tabKey.replace("tab", "")) - 1;
    const sectionId = sections[sectionIndex]?.id;

    navigate(`/git-github?tab=${sectionId}&page=${pageNumber}`);
    setActiveTabKey1(tabKey);
    handlePageChange(tabKey, pageNumber);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const contentList = sections.reduce((acc, section, index) => {
    const tabKey = `tab${index + 1}`;
    const currentPage = currentPages[tabKey] || 1;
    const startIndex = (currentPage - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    const paginatedContent = section.content.slice(startIndex, endIndex);

    acc[tabKey] = (
      <Card
        headStyle={{ borderBottom: "0px" }}
        className="!border-none !h-[87vh] !pt-0 !p-2"
        tabList={tabList}
        activeTabKey={activeTabKey1}
        onTabChange={setActiveTabKey1}
      >
        <Row gutter={[16, 16]}>
          {paginatedContent.map((item, idx) => (
            <ContentCard
              key={idx}
              item={item}
              idx={idx}
              colors={colors}
              copyToClipboard={copyToClipboard}
              copiedIndex={copiedIndex}
            />
          ))}
        </Row>
        <Row
          justify="center"
          className="!mt-4 flex justify-center !pb-2 [&_.ant-pagination-simple-pager_input]:w-[20px] text-center [&_.ant-pagination-simple-pager_input]:p-0 [&_.ant-pagination-simple-pager_input]:!border-0 focus:[&_.ant-pagination-simple-pager_input]:outline-none"
        >
          <Pagination
            current={currentPage}
            total={section.content.length}
            pageSize={cardsPerPage}
            onChange={(page) => handlePageChange(tabKey, page)}
            simple
            responsive
          />
        </Row>
      </Card>
    );
    return acc;
  }, {});

  const contentLinks =
    sections
      .find((section, index) => `tab${index + 1}` === activeTabKey1)
      ?.content.map((content, contentIndex) => ({
        tabKey: activeTabKey1,
        title: content.title,
        page: contentIndex + 1,
      })) || [];

  return (
    <ConfigProvider theme={themeConfig}>
      {(isInitialLoading || isLoading) && <Loader />}
      <Row gutter={[12, 12]} className="p-5">
        <Col xs={24} lg={17}>
          <Col xs={{ span: 24 }} lg={{ span: 0 }}>
            <Button
              className="!ml-auto !mb-4 !transition-none"
              icon={<FaBars />}
              onClick={toggleSidebar}
            >
              In This Page
            </Button>
          </Col>
          {contentList[activeTabKey1]}
        </Col>
        <Col xs={0} lg={7}>
          <Card
            title="In This Page"
            className="!border-none max-h-[50vh] !overflow-y-auto"
          >
            <List
              dataSource={contentLinks}
              className="max-h-[45vh] overflow-y-auto"
              renderItem={(item) => (
                <List.Item className="!p-0 !border-0">
                  <Button
                    type="link"
                    onClick={() =>
                      handleContentLinkClick(item.tabKey, item.page)
                    }
                    className="p-0"
                    style={{
                      color:
                        item.tabKey === activeTabKey1 &&
                        currentPages[item.tabKey] === item.page
                          ? colors.sidebarbg
                          : colors.textcolor,
                    }}
                  >
                    {item.title}
                  </Button>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Drawer
          title="In This Page"
          placement="right"
          onClose={toggleSidebar}
          open={sidebarVisible}
          width={200}
          height={300}
          closable={false}
        >
          <List
            dataSource={contentLinks}
            className="max-h-[80vh] overflow-y-auto !p-0"
            renderItem={(item) => (
              <List.Item className="!p-0 !border-0">
                <Button
                  type="link"
                  onClick={() => {
                    handleContentLinkClick(item.tabKey, item.page);
                    setSidebarVisible(false);
                  }}
                  className="p-0"
                  style={{
                    color:
                      item.tabKey === activeTabKey1 &&
                      currentPages[item.tabKey] === item.page
                        ? colors.sidebarbg
                        : colors.textcolor,
                  }}
                >
                  {item.title}
                </Button>
              </List.Item>
            )}
          />
        </Drawer>
      </Row>
    </ConfigProvider>
  );
};

export default Github;
