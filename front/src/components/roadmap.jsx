import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Collapse,
  List,
  Typography,
  Space,
  Card,
  Empty,
  Button,
  Row,
  Layout,
} from "antd";
import {
  FileFilled,
  ReadOutlined ,
  FolderOpenFilled,
  VideoCameraOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Colors } from "../config/color";
const { Panel } = Collapse, { Text } = Typography;

const Roadmap = () => {
  const colors = Colors();
  const [selModule, setSelModule] = useState(null);
  const [actRes, setActRes] = useState(null);
  const [transformedRoadmap, setTransformedRoadmap] = useState([]);
  const { Content } = Layout;
  const project = useSelector((state) => state.projectDetail.project);

  useEffect(() => {
    const modules = project?.modules ?? [];
    if (modules.length === 0) {
      setTransformedRoadmap([]);
      return;
    }
  
    const roadmap = Object.entries(modules.reduce((acc, module) => {
      const category = module.title.split(':')[0].trim();
      acc[category] = acc[category] ?? [];
      acc[category].push({
        title: module.title,
        content: [
          ...(module.video?.map((v) => ({ type: "video", title: v.title, url: v.url })) ?? []),
          ...(module.file?.map((f) => ({ type: "pdf", title: f.title, url: f.url })) ?? [])
        ]
      });
      return acc;
    }, {})).map(([category, modules]) => ({
      title: `Step: ${category}`,
      children: modules
    }));
  
    setTransformedRoadmap(roadmap);
  }, [project]);

  const handleModuleClick = (m) => {
    if (!m.children) {
      setSelModule((prev) => (prev && prev.title === m.title ? null : m));
      setActRes(null);
    }
  };

  const getIcon = (t) =>
    ({
    video: <VideoCameraOutlined style={{ color: colors.primary }} />,
    pdf: <FilePdfOutlined style={{ color: colors.primary }} />,
    doc: <FileTextOutlined style={{ color: colors.primary }} />,
    note: <FileTextOutlined style={{ color: colors.primary }} />,
  }[t] || <FileFilled style={{ color: colors.primary }} />);

  const renderModules = (items, indent = 0) =>
    items.map((item, i) => (
    <Space
      direction="vertical"
      size={0}
      key={i}
      style={{ paddingLeft: indent * 30, width: "100%" }}
    >
      <Button
        type="text"
        onClick={(e) => {
          e.stopPropagation();
          handleModuleClick(item);
        }}
        style={{
          cursor: "pointer",
          padding: "5px 0",
          display: "block",
          width: "100%",
          textAlign: "left",
        }}
      >
          <Space>
            {item.children ? (
            <FolderOpenFilled style={{ color: colors.primary }} />
          ) : (
            <FileFilled style={{ color: colors.primary }} />
          )}
          <Text style={{ color: colors.textcolor }}>{item.title}</Text>
          {item.duration && (
            <Text type="secondary" style={{ color: colors.textcolor }}>
              ({item.duration})
            </Text>
          )}
          </Space>
        </Button>
        {selModule && selModule.title === item.title && (
        <Card
          style={{
            margin: "10px 0",
            background: colors.background,
            border: `1px solid ${colors.bordercolor}`, width: "100%" }}
          styles={{ body: { padding: 10 } }}
         >
            {item.content && item.content.length ? (
              <List dataSource={item.content} renderItem={(r, idx) => (
                <>
                  <List.Item key={idx}>
                    <Space>
                      {getIcon(r.type)}
                      <Text style={{ color: colors.textcolor }}>
                        {r.title}
                      </Text>
                    </Space>
                  </List.Item>
                  {actRes && actRes.title === r.title}
                </>
              )}
            />
            ) : (
              <Text type="secondary" style={{ color: colors.textgray }}>No additional learning materials available.</Text>
            )}
          </Card>
        )}
        {item.children && renderModules(item.children, indent + 1)}
    </Space>
    ));

  return (
    <Layout style={{ background: colors.theme, minHeight: "100vh" }}>
      <Content style={{ padding: 20, maxWidth: "100vw" }}>
      {transformedRoadmap.length === 0 ? (
        <Row
          justify="center"
          className="mt-[140px] text-[your-text-color-class]"
        >
          <Empty
            image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
            description={
              <Text style={{ color: colors.textcolor }}>
                No roadmap modules found
              </Text>
            }
            style={{ color: colors.textcolor }}
          />
        </Row>
      ) : (
      <Collapse accordion ghost expandIcon={({ isActive }) => ( 
        <RightOutlined style={{ color: colors.textcolor, transform: isActive ? "rotate(90deg)" : "rotate(0deg)", }}/> )} >
        {transformedRoadmap.map((section, i) => (
          <Panel
            key={i}
            header={
              <Space>
                <FolderOpenFilled style={{ color: colors.primary }} />
                <Text strong style={{ color: colors.textcolor }}>
                  {section.title}
                </Text>
              </Space>
            }
            style={{
              marginBottom: 8,
              borderRadius: 6,
              background: colors.background,
            }}
          >
            {section.children && section.children.length ? (
              <>
                <Space style={{ marginBottom: 10 }}>
                  <ReadOutlined style={{ color: colors.textcolor }} />
                  <Text type="secondary" style={{ color: colors.textcolor }}>
                  Modules {section.children.length !== 1 ? 's' : ''}
                  </Text>
                </Space>
                {renderModules(section.children, 1)}
              </>
            ) : (
              <Text type="secondary" style={{ color: colors.textcolor }}>
                No content available
              </Text>
            )}
          </Panel>
        ))}
      </Collapse>
    )}
    </Content>
  </Layout>
);
};

export default Roadmap;
