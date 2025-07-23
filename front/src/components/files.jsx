import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Layout,
  Tree,
  Alert,
  Button,
  Drawer,
  Typography,
  Flex,
} from "antd";
import {
  DownOutlined,
  FolderOpenFilled,
  FileFilled,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  fetchFileStructure,
  fetchFileContent,
  resetFileState,
} from "../redux/fileSlice";
import { Colors } from "../config/color";
import { setToken } from "../redux/githubSlice";
import { FaBars } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Loader from "./loader";
import {
  getLocalStorageItem,
  LOCAL_STORAGE_KEYS,
} from "../components/localStorageHelper";

const { Sider, Content } = Layout;
const { DirectoryTree } = Tree;
const { Text, Paragraph } = Typography;

const extensionToLanguageMap = {
  js: "javascript",
  jsx: "javascriptreact",
  ts: "typescript",
  tsx: "typescriptreact",
  html: "html",
  css: "css",
  scss: "scss",
  json: "json",
  md: "markdown",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  txt: "plaintext",
  py: "python",
  java: "java",
  c: "c",
  sql: "sql",
};

const mediaExtensions = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "bmp",
  "webp",
  "mp4",
  "webm",
  "ogg",
  "mp3",
  "wav",
];

const Files = ({ githubRepository }) => {
  const dispatch = useDispatch();
  const colors = Colors();
  const [currentFileContent, setCurrentFileContent] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("plaintext");
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("GitHub");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState("main");

  const {
    fileStructure,
    loading,
    error,
    fileContent,
    accessStatus,
    requestAccess,
  } = useSelector((state) => state.files);
  const { token } = useSelector((state) => state.github);

  const location = useLocation();
  const project = location.state?.project;
  const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const SERVER_URL = import.meta.env.VITE_SERVER_URL;

  const parseGitHubRepo = (repoUrl) => {
    if (!repoUrl) return { owner: null, repo: null };
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    return match
      ? { owner: match[1], repo: match[2] }
      : { owner: null, repo: null };
  };

  const { owner, repo } = parseGitHubRepo(githubRepository);

  const generateTreeData = (structure) =>
    structure.map((item) =>
      item.type === "dir"
        ? {
            title: item.name,
            key: item.path,
            icon: <FolderOpenFilled style={{ color: colors.folderbg }} />,
            children: item.children?.length
              ? generateTreeData(item.children)
              : [],
          }
        : {
            title: item.name,
            key: item.path,
            isLeaf: true,
            icon: <FileFilled style={{ color: colors.filebg }} />,
          }
    );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const storedToken = getLocalStorageItem(
      LOCAL_STORAGE_KEYS.GITHUB_TOKEN,
      token
    );
    if (!token && storedToken) dispatch(setToken(storedToken));
  }, [dispatch, token]);

  useEffect(() => {
    const fetchDefaultBranch = async () => {
      if (!owner || !repo) return;
      try {
        const headers = token ? { Authorization: `token ${token}` } : {};
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          { headers }
        );
        if (response.ok) {
          const data = await response.json();
          setDefaultBranch(data.default_branch || "main");
        }
      } catch (err) {
        console.error("Error fetching default branch:", err);
      }
    };
    fetchDefaultBranch();
  }, [owner, repo, token]);

  useEffect(() => {
    dispatch(resetFileState());
    setCurrentFileContent("");
    setExpandedKeys([]);
    setSelectedKeys([]);
    if (owner && repo && token) {
      dispatch(fetchFileStructure({ owner, repo, path: "" }));
    }
  }, [owner, repo, token, dispatch]);

  useEffect(() => {
    if (fileContent && selectedKeys[0]) {
      const fileExtension = selectedKeys[0].split(".").pop()?.toLowerCase();
      if (mediaExtensions.includes(fileExtension)) {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${selectedKeys[0]}`;
        setCurrentFileContent(rawUrl);
        setCurrentLanguage("");
      } else {
        setCurrentFileContent(fileContent);
        setCurrentLanguage(
          extensionToLanguageMap[fileExtension] || "plaintext"
        );
      }
    }
  }, [fileContent, selectedKeys, owner, repo, defaultBranch]);

  const handleGitHubClick = () => {
    if (!token || accessStatus === "pending" || (error && requestAccess)) {
      const projectId = project?.id || "unknown";
      const currentPath = `${location.pathname}${location.search}`;
      const returnUrl = currentPath;
      const state = `${projectId}|${returnUrl}|${JSON.stringify(
        location.state || {}
      )}`;
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${SERVER_URL}auth/github/callback&scope=repo&state=${encodeURIComponent(
        state
      )}&prompt=consent`;
      window.location.href = githubAuthUrl;
    } else {
      setSelectedFolder("GitHub");
    }
  };

  const handleJoinOrgClick = () => {
    if (githubRepository) window.open(githubRepository, "_blank");
  };

  const handleFileClick = (filePath) => {
    if (owner && repo) dispatch(fetchFileContent({ owner, repo, filePath }));
  };

  const handleSelect = (keys, { node, selected }) => {
    if (selected && node?.isLeaf) {
      handleFileClick(node.key);
      setSelectedKeys(keys);
    }
    if (!node?.isLeaf) {
      setSelectedKeys([]);
    }
  };

  const treeData = useMemo(
    () => generateTreeData(fileStructure),
    [fileStructure, colors]
  );

  const renderContent = () => {
    if (!githubRepository) {
      return (
        <Alert
          message="No GitHub Repository"
          description="This project does not have a linked GitHub repository."
          type="info"
          showIcon
        />
      );
    }

    if (error && error.toLowerCase().includes("not found")) {
      return (
        <Alert
          message={
            <Text style={{ color: colors.textcolor }}>
              You are not a member of this organization
            </Text>
          }
          description={
            <Flex vertical gap="middle" style={{ color: colors.textcolor }}>
              <Paragraph>
                Please join the organization to access this repository.
              </Paragraph>
              <Button
                type="primary"
                className="w-full sm:w-auto !ml-auto mt-2 sm:mt-0"
                onClick={handleJoinOrgClick}
                style={{ background: colors.primary }}
              >
                Join Organization
              </Button>
            </Flex>
          }
          type="warning"
          showIcon
          style={{
            margin: "10px",
            backgroundColor: colors.background,
            borderColor: "transparent",
          }}
        />
      );
    }

    return (
      <Layout className="min-h-screen">
        {!isMobile && (
          <Sider
            width={250}
            style={{
              background: colors.Editorbg,
              padding: 10,
              overflowY: "auto",
              height: "100vh",
            }}
          >
            <Flex
              vertical
              gap="middle"
              style={{
                background: colors.Editorbg,
                color: colors.textcolor,
                marginBottom: 16,
              }}
            >
              <Button
                style={{ background: colors.primary, color: colors.white }}
                type={selectedFolder === "GitHub" ? "primary" : "default"}
                block
                onClick={handleGitHubClick}
              >
                GitHub
              </Button>
            </Flex>
            <Flex vertical>
              <Text>{selectedFolder} Structure</Text>
              <DirectoryTree
                className="[&_.ant-tree-node-content-wrapper:hover]:!text-inherit"
                style={{ background: colors.Editorbg, color: colors.textcolor }}
                showLine
                switcherIcon={<DownOutlined />}
                expandedKeys={expandedKeys}
                selectedKeys={selectedKeys}
                onExpand={setExpandedKeys}
                onSelect={handleSelect}
                treeData={treeData}
              />
            </Flex>
          </Sider>
        )}

        <Layout style={{ background: colors.theme }}>
          <Content
            style={{
              marginLeft: isMobile ? 0 : "5px",
              background: colors.prevbg,
              position: "relative",
            }}
          >
            {isMobile && (
              <Button
                icon={<FaBars />}
                onClick={() => setSidebarVisible(true)}
                className="absolute top-2.5 left-2.5 z-50 !bg-transparent !border-transparent hover:bg-transparent focus:bg-transparent"
                style={{ color: colors.textcolor }}
              />
            )}

            {loading ? (
              <Flex
                align="center"
                justify="center"
                style={{
                  height: "100%",
                  width: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                <Loader isConstrained={true} />
              </Flex>
            ) : error ? (
              <Alert message={error} type="error" />
            ) : !token ? (
              <Alert
                message={
                  <Text style={{ color: colors.textcolor }}>
                    Authentication Required
                  </Text>
                }
                description={
                  <Text style={{ color: colors.textcolor }}>
                    Click on the GitHub button above to connect to GitHub
                  </Text>
                }
                type="info"
                showIcon
                style={{
                  margin: "10px",
                  backgroundColor: colors.background,
                  borderColor: "transparent",
                }}
              />
            ) : accessStatus === "pending" && requestAccess ? (
              <Alert
                message={
                  <Text style={{ color: colors.textcolor }}>
                    GitHub authorized successfully
                  </Text>
                }
                description={
                  <Flex vertical style={{ color: colors.textcolor }}>
                    <Text>
                      You have successfully authorized with GitHub. Please click
                      on the GitHub button to check the status of your
                      request...
                    </Text>
                  </Flex>
                }
                type="success"
                icon={<CheckCircleOutlined />}
                showIcon
                style={{
                  margin: "10px",
                  backgroundColor: colors.background,
                  borderColor: "transparent",
                }}
              />
            ) : !selectedKeys.length ? (
              <Flex align="center" style={{ margin: "10px" }}>
                <Alert
                  message={
                    <Text style={{ color: colors.textcolor }}>
                      Please select a file to view its content.
                    </Text>
                  }
                  type="info"
                  showIcon
                  style={{
                    backgroundColor: colors.background,
                    borderColor: "transparent",
                  }}
                />
              </Flex>
            ) : mediaExtensions.includes(
                selectedKeys[0]?.split(".").pop()?.toLowerCase()
              ) ? (
              <Flex justify="center" align="center" style={{ height: "100%" }}>
                {["png", "jpg", "jpeg", "gif", "svg", "bmp", "webp"].includes(
                  selectedKeys[0]?.split(".").pop()?.toLowerCase()
                ) && (
                  <Image
                    src={currentFileContent}
                    alt="Media content"
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                    preview={false}
                  />
                )}
                {["mp4", "webm", "ogg"].includes(
                  selectedKeys[0]?.split(".").pop()?.toLowerCase()
                ) && (
                  <video
                    controls
                    src={currentFileContent}
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                  />
                )}
                {["mp3", "wav"].includes(
                  selectedKeys[0]?.split(".").pop()?.toLowerCase()
                ) && <audio controls src={currentFileContent} />}
              </Flex>
            ) : (
              <Editor
                height="100vh"
                language={currentLanguage}
                value={currentFileContent}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                }}
                theme={colors.monachotheme}
              />
            )}
          </Content>
        </Layout>

        <Drawer
          title="Files"
          placement="left"
          onClose={() => setSidebarVisible(false)}
          open={sidebarVisible}
          width={250}
          closable={true}
          style={{
            background: colors.theme,
            color: colors.textcolor,
            borderColor: colors.border,
          }}
          styles={{
            body: {
              padding: 0,
              background: colors.background,
              color: colors.textcolor,
              overflow: "auto",
            },
          }}
        >
          <Flex
            vertical
            gap="middle"
            style={{
              background: colors.background,
              color: colors.text,
              marginBottom: 16,
              padding: 16,
            }}
          >
            <Button
              type="primary"
              block
              onClick={() => {
                handleGitHubClick();
                setSidebarVisible(false);
              }}
            >
              GitHub
            </Button>
          </Flex>
          <Flex vertical style={{ padding: 16 }}>
            <DirectoryTree
              className="[&_.ant-tree-node-content-wrapper:hover]:!text-blue-500"
              style={{ background: colors.background, color: colors.textcolor }}
              showLine
              switcherIcon={<DownOutlined />}
              expandedKeys={expandedKeys}
              selectedKeys={selectedKeys}
              onExpand={setExpandedKeys}
              onSelect={handleSelect}
              treeData={treeData}
              selectable={false}
              titleRender={(nodeData) => (
                <Text
                  onClick={(e) => {
                    e.stopPropagation();
                    if (nodeData.isLeaf) {
                      handleSelect([nodeData.key], {
                        node: nodeData,
                        selected: true,
                      });
                    }
                  }}
                  style={{ cursor: nodeData.isLeaf ? "pointer" : "default" }}
                >
                  {nodeData.title}
                </Text>
              )}
            />
          </Flex>
        </Drawer>
      </Layout>
    );
  };

  return renderContent();
};

export default Files;
