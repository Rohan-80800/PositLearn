import {
  Row,
  Col,
  Menu,
  Card,
  Progress,
  Flex,
  Checkbox,
  ConfigProvider,
  Tooltip,
  List,
  Divider,
  Modal,
  Empty,
  Typography,
  Space,
  Button,
  Drawer,
} from "antd";
import {
  ExportOutlined,
  FilePdfOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { FaBars } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { YouTubePlayer } from "./YouTubePlayer";
import { Icon } from "@iconify/react";
import { ClockCircleOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { Colors } from "../config/color";
import {
  setSelectedKey,
  fetchLearningPath,
  saveNotebookData,
  completeQuiz
} from "../redux/videoSlice";
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import defaultBadgeImage from "../assets/badge2.png";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "../App.css";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import CertificateGenerator from "./certificateGenerator";
import QuizPlayer from "./QuizPlayer";
import BadgeCard from "./BadgeCard";
import Confetti from "react-confetti";
import api from "../axios";
import Notifier from "./notifier";

const Learning = () => {
  const playerRef = useRef(null);
  const colors = Colors();
  const { Text, Title, Paragraph } = Typography;
  const { projectId } = useParams();
  const themeConfig = {
    token: {
      motion: false,
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBorder: colors.border,
      colorBgElevated: colors.background,
      colorBorderSecondary: colors.border,
      colorPrimary: colors.primary,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
      },
      Menu: {
        itemHoverBg: "transparent",
        itemHoverColor: colors.primary,
        itemSelectedColor: colors.primary,
        subMenuItemSelectedColor: colors.primary,
        itemSelectedBg: "transparent",
        controlItemBgActive: "transparent",
        controlOutline: "none",
        subMenuItemBg: "transparent",
        itemPaddingInline: 0,
      },
      Checkbox: {
        colorBgContainer: "transparent",
        colorBorder: "transparent",
      },
      List: {
        itemHoverColor: colors.primary,
        itemSelectedColor: colors.primary,
      },
      Modal: {
        titleColor: colors.textcolor,
        colorIcon: colors.textcolor,
      },
    },
  };

  const { items = [], selectedKey } = useSelector((state) => state.video);
  const { quizProgress } = useSelector((state) => state.quizUi);
  const { user } = useUser();
  const userId = user.id;
  const username = user.fullName;
  const dispatch = useDispatch();
  const { isDarkTheme } = useSelector((state) => state.navbar);
  useEffect(() => {
    dispatch(fetchLearningPath({ userId, projectId }));
  }, [dispatch, userId]);

  const [openKeys, setOpenKeys] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [capturedTime, setCapturedTime] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 992);
  const [activeTabKey2, setActiveTabKey2] = useState("overview");
  const [showEditor, setShowEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newBadgeAchieved, setNewBadgeAchieved] = useState(false);
  const [badgesData, setBadgesData] = useState({
    latestBadge: null,
    nextMilestone: null,
  });
  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");
  const selectedItem = items
  .flatMap((category) => [
    ...category.children,
    ...category.quizzes
  ])
    .find((item) => item.key === selectedKey);

  const selectedVideoId = selectedItem ? selectedItem.videoId : "";
  const selectedQuizId = selectedItem && selectedItem.quizId ? selectedItem.quizId : null;
  const title = selectedItem ? selectedItem.label : "";
  const parentModule = items.find((module) =>
      module.children.some((child) => child.key === selectedKey) ||
      module.quizzes.some((quiz) => quiz.key === selectedKey)
  );

  useEffect(() => {
    if (selectedKey) {
      dispatch(fetchLearningPath({ userId, projectId }));
    }
  }, [dispatch, userId]);
  useEffect(() => {
    const selectedNotebook =
      parentModule?.notebook?.[parentModule.projectId]?.[parentModule.key]?.[
        selectedVideoId
      ] || [];
    setNotes(selectedNotebook);
  }, [parentModule, selectedVideoId]);
  useEffect(() => {
    const handleResize = () => {
      const smallScreen = window.innerWidth < 992;
      setIsSmallScreen(smallScreen);
      if (!smallScreen) {
        setSidebarVisible(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchLatestAndUpcomingBadges = async () => {
    try {
      const response = await api.get(
        `api/badges/get_latest/${userId}/${projectId}`
      );
      const { latestBadge, nextMilestone } = response.data.data;

      if (latestBadge && latestBadge.id && latestBadge.notified === false) {
        setNewBadgeAchieved(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);

        try {
          await api.post(`api/video/mark_notified/${userId}`, {
            badge_id: latestBadge.id,
          });
        } catch (err) {
          console.error("Failed to mark badge as notified:", err);
        }
      }

      setBadgesData({ latestBadge, nextMilestone });
    } catch (error) {
      console.error("Error fetching badges:", error);
      Notifier({
        type: "error",
        title: `Error`,
        description: "  Failed to fetch badges",
        duration: 3,
        placement: "bottomRight",
        colors
      });
    }
  };
  useEffect(() => {
    fetchLatestAndUpcomingBadges();
  }, [items]);

  const restrictNoteAction = (actionType) => {
    if (!playerRef.current?.isVideoValid()) {
      Notifier({
        type: "error",
        title: `Cannot ${actionType} Note`,
        description:
          playerRef.current?.getErrorMessage() ||
          "An unexpected error occurred. Please try again.",
        duration: 3,
        placement: "bottomRight",
        colors,
      });
      return true;
    }
    return false;
  };

  const onTab2Change = (key) => {
    setActiveTabKey2(key);
  };
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };
  const showPDF = (pdf) => {
    const fileUrl = pdf?.url?.toLowerCase();
    if (fileUrl.endsWith(".pdf")) {
      setSelectedPDF(pdf);
      setVisible(true);
    } else {
      window.open(
        import.meta.env.VITE_ENV === "dev"
          ? `${Image_URL}${pdf?.accessUrl}`
          : `${pdf?.accessUrl}`,
        "_blank"
      );
    }
  };
  const handleDownloadStyledPDF = async () => {
    const notesElement = document.getElementById("notes-content");
    if (!notesElement) return;

    notesElement.querySelectorAll("*").forEach((el) => {
      const computedStyle = window.getComputedStyle(el);
      if (
        computedStyle.color.includes("oklch") ||
        computedStyle.backgroundColor.includes("oklch")
      ) {
        el.style.color = "rgb(0, 0, 0)";
        el.style.backgroundColor = "rgb(255, 255, 255)";
      }
    });

    const canvas = await html2canvas(notesElement, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

    try {
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: "MyNotes.pdf",
          types: [
            {
              description: "PDF Documents",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(pdf.output("blob"));
        await writable.close();
      } else {
        const filename = prompt("Enter filename:", "MyNotes.pdf");
        if (filename) pdf.save(filename);
      }
    } catch (err) {
      console.error("Save cancelled or failed", err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSubmit = () => {
    if (restrictNoteAction("Create")) return;

    const cleanedNote = note.replace(/<p><br><\/p>/g, "").trim();
    if (!cleanedNote || !capturedTime) {
      return;
    }

    const newNote = {
      text: cleanedNote,
      timeDisplay: capturedTime,
    };

    let updatedNotes;
    if (editingIndex !== null) {
      updatedNotes = notes.map((n, idx) =>
        idx === editingIndex ? newNote : n
      );
    } else {
      updatedNotes = [...notes, newNote];
    }

    setNotes(updatedNotes);
    setNote("");
    setShowEditor(false);
    setEditingIndex(null);
    dispatch(saveNotebookData({ clerkId: userId, notesArray: updatedNotes }));
  };

  const handleEditToggle = (index) => {
    if (restrictNoteAction("Edit")) return;

    if (editingIndex === index) {
      const cleanedNote = note.replace(/<p><br><\/p>/g, "").trim();
      if (!cleanedNote) return;

      const updatedNotes = [...notes];
      updatedNotes[index] = {
        text: cleanedNote,
        timeDisplay:
          typeof notes[index] === "string" ? "00:00" : notes[index].timeDisplay,
      };

      setNotes(updatedNotes);
      setEditingIndex(null);
      setNote("");
      dispatch(saveNotebookData({ clerkId: userId, notesArray: updatedNotes }));
    } else {
      setEditingIndex(index);
      setNote(
        typeof notes[index] === "string" ? notes[index] : notes[index].text
      );
    }
  };

  const handleDeleteNote = (index) => {
    const updatedNotes = notes.filter((_, idx) => idx !== index);
    setNotes(updatedNotes);
    setEditingIndex(null);
    dispatch(saveNotebookData({ clerkId: userId, notesArray: updatedNotes }));
  };

  const handleClearAll = () => {
    setNotes([]);
    setNote("");
    setShowEditor(false);
    setEditingIndex(null);
    dispatch(saveNotebookData({ clerkId: userId, notesArray: [] }));
  };

  const tabListNoTitle = [
    {
      key: "overview",
      label: "Overview",
    },
    {
      key: "notes",
      label: "Notes",
    },
    {
      key: "notebook",
      label: "Notebook",
    },
  ];
  const toolbarOptions = [
    [{ size: [] }],
    [{ font: [] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    [{ align: [] }],
    ["clean"],
  ];
  const modules = { toolbar: toolbarOptions };

  const contentListNoTitle = {
    overview: (
      <>
        <Paragraph>
          <b>{parentModule?.label}</b>
        </Paragraph>
        <Paragraph>{parentModule?.description}</Paragraph>
      </>
    ),
    notes: (
      <>
        <Flex
          justify="space-between"
          align="center"
          className="!w-full !mb-2.5"
        >
          <Title
            level={4}
            style={{
              marginBottom: 10,
              wordBreak: "break-word",
              overflowWrap: "break-word",
              maxWidth: "90%",
              color: colors.textcolor,
            }}
          >
            {parentModule?.label}
          </Title>
        </Flex>
        <Divider orientation="left" />
        <List
          dataSource={parentModule?.pdf.slice().reverse() || []}
          renderItem={(pdf) => (
            <List.Item>
              <a
                onClick={() => showPDF(pdf)}
                style={{
                  cursor: "pointer",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "90%",
                }}
              >
                <FilePdfOutlined />
                {pdf.title}
              </a>
            </List.Item>
          )}
        />

        <Modal
          title={
            <>
              {selectedPDF?.title}
              <a
                href={
                  import.meta.env.VITE_ENV === "dev"
                    ? `${Image_URL}${selectedPDF?.accessUrl}`
                    : `${selectedPDF?.accessUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginLeft: "10px",
                  fontSize: "16px",
                  color: colors.textcolor,
                }}
              >
                <ExportOutlined />
              </a>
            </>
          }
          open={visible}
          onCancel={() => setVisible(false)}
          footer={null}
          width={800}
        >
          {selectedPDF && (
            <iframe
              src={
                import.meta.env.VITE_ENV === "dev"
                  ? `${Image_URL}${selectedPDF?.accessUrl}`
                  : `${selectedPDF?.accessUrl}`
              }
              width="100%"
              height="500px"
              style={{ border: "none" }}
            />
          )}
        </Modal>
      </>
    ),
    notebook: (
      <div data-theme={isDarkTheme ? "dark" : "light"}>
        <Flex
          justify="space-between"
          align="center"
          className="!w-full !mb-2.5"
        >
          <Title
            level={4}
            style={{ marginBottom: 10 }}
          >
            {parentModule?.label}
          </Title>
          {notes.length > 0 && (
            <Space size="middle">
              <Icon
                icon="heroicons:document-arrow-down"
                width={20}
                className={`cursor-pointer ${colors.darkGray}`}
                onClick={handleDownloadStyledPDF}
              />
              <Icon
                icon="mdi:trash-can"
                width="20"
                className="cursor-pointer text-red-400"
                onClick={handleClearAll}
              />
            </Space>
          )}
        </Flex>
        <Button
          type="dashed"
          block
          onClick={() => {
            if (restrictNoteAction("Create")) return;
            if (playerRef.current) {
              const currentTime = playerRef.current.getCurrentTime();
              const formattedTime = formatTime(currentTime);
              setCapturedTime(formattedTime);
            } else {
              setCapturedTime("00:00");
            }
            setShowEditor(true);
            setNote("");
            setEditingIndex(null);
          }}
          className={`!h-auto !py-1.25 !mb-2.5`}
          style={{
            borderColor: colors.border,
            backgroundColor: colors.background,
            color: colors.textcolor,
            display: showEditor ? "none" : "block",
          }}
          icon={<PlusOutlined />}
        >
          <Text className="!ml-1">Create a new note</Text>
        </Button>
        {showEditor && editingIndex === null && (
          <>
            <ReactQuill
              className="custom-quill"
              theme="snow"
              value={note}
              onChange={setNote}
              modules={modules}
              style={{
                color: colors.textcolor,
                backgroundColor: colors.background,
                "--quill-border-color": colors.border,
                marginBottom: "12px",
              }}
            />
            <Space
              style={{
                width: "100%",
                justifyContent: "flex-end",
                marginBottom: "12px",
              }}
            >
              <Button onClick={() => setShowEditor(false)}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleSubmit}
              >
                Save
              </Button>
            </Space>
          </>
        )}

        {notes.length > 0 ? (
          <Flex
            id="notes-content"
            vertical
            className="max-h-[200px] overflow-y-auto space-y-2.5"
          >
            {notes.map((noteObj, index) => {
              const noteText =
                typeof noteObj === "string" ? noteObj : noteObj.text;
              const noteTime =
                typeof noteObj === "string" ? "00:00" : noteObj.timeDisplay;

              return (
                <Card
                  key={index}
                  className="!mb-2.5 border rounded !p-2.5 relative"
                  style={{
                    borderColor: colors.border,
                  }}
                >
                  <Flex
                    justify="space-between"
                    align="center"
                    className="!mb-2.5"
                  >
                    <Text strong>
                      {title} ({noteTime})
                    </Text>
                    <Space size="small">
                      <Icon
                        icon={
                          editingIndex === index
                            ? "fluent:document-save-20-regular"
                            : "mdi:file-document-edit-outline"
                        }
                        width="18"
                        className={`cursor-pointer ${colors.darkGray}`}
                        onClick={() => handleEditToggle(index)}
                      />
                      <Icon
                        icon="mdi:trash-can"
                        width="18"
                        className="cursor-pointer text-red-400"
                        onClick={() => handleDeleteNote(index)}
                      />
                    </Space>
                  </Flex>
                  {editingIndex === index ? (
                    <ReactQuill
                      className="custom-quill"
                      theme="snow"
                      value={note}
                      onChange={setNote}
                      modules={modules}
                      style={{
                        color: colors.textcolor,
                        backgroundColor: colors.background,
                        "--quill-border-color": colors.border,
                        marginBottom: "12px",
                      }}
                    />
                  ) : (
                    <Paragraph
                      style={{
                        color: colors.textcolor,
                        backgroundColor: colors.background,
                        lineHeight: "1.5",
                      }}
                    >
                      <div dangerouslySetInnerHTML={{ __html: noteText }} />
                    </Paragraph>
                  )}
                </Card>
              );
            })}
          </Flex>
        ) : (
          !notes.length > 0 && (
            <Empty
              image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
              imageStyle={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "auto",
              }}
              description={
                <>
                  <Title level={4}>No notes saved yet</Title>
                  <Text>Take notes to remember what you learned.</Text>
                </>
              }
            />
          )
        )}
      </div>
    ),
  };
  const handleVideoEnd = () => {
    const parentModule = items.find((module) =>
      module.children.some((child) => child.key === selectedKey)
    );
    if (!parentModule) return;

    const currentVideoIndex = parentModule.children.findIndex(
      (child) => child.key === selectedKey
    );
    const isLastVideo = currentVideoIndex === parentModule.children.length - 1;

    if (isLastVideo && parentModule.quizzes.length > 0) {
      const nextQuiz = parentModule.quizzes[0];
      dispatch(setSelectedKey(nextQuiz.key));
    }
  };

  const handleSelect = ({ key }) => {
    dispatch(setSelectedKey(key));
  };
  const handleOpenChange = (keys) => {
    setOpenKeys(keys.length ? [keys[keys.length - 1]] : []);
  };
  const totalItems = items.reduce(
    (count, category) => count + category.children.length,
    0
  );

  const completedItems = items.reduce((count, category) => {
    const completedVideos =
      category.moduleCompleted?.[category.projectId]?.[category.key] || [];
    const completedQuizzes = category.quizzes.filter((quiz) => {
      const isPassed =
        quizProgress?.[userId]?.[quiz.quizId]?.status === "PASSED";
      const result = category.quizResult?.[quiz.quizId];
      const hasMaxScore = result?.maxScore === 100;
      return isPassed || hasMaxScore;
    }).length;
    return count + completedVideos.length + completedQuizzes;
  }, 0);

  const completePercent = Math.round((completedItems / totalItems) * 100);

  const menuItemsWithCheckbox = items.map((category) => {
    const completedVideos =
      category.moduleCompleted?.[category.projectId]?.[category.key] || [];

    return {
      ...category,
      children: category.children.map((item) => {
        if (item.type === "video") {
          return {
            ...item,
            label: (
              <Flex align="center" gap="small">
                <Checkbox
                  checked={
                    item.completed || completedVideos.includes(item.videoId)
                  }
                />
                <Tooltip title={item.label} placement="left">
                  <span>{item.label}</span>
                </Tooltip>
              </Flex>
            )
          };
        } else if (item.type === "quiz") {
          const result = category.quizResult?.[item.quizId];
          const isQuizCompleted =
            result?.maxScore === 100 ||
            quizProgress[userId]?.[item.quizId]?.maxScore === 100;

          if (isQuizCompleted) {
            dispatch(
              completeQuiz({
                clerkId: userId,
                projectId: category.projectId,
                progressPercentage: completePercent
              })
            );
          }

          return {
            ...item,
            label: (
              <Flex align="center" gap="small">
                <Checkbox checked={isQuizCompleted} />
                <span>Quiz:</span>
                <Tooltip title={item.label} placement="left">
                  <span>{item.label}</span>
                </Tooltip>
              </Flex>
            )
          };
        }
        return item;
      })
    };
  });

  const learningTime = items[0]?.lerningHour || 0;
  const projectName = items[0]?.projectName || "";
  const vlidatorId = items[0]?.validator;
  const hours = Math.floor(learningTime / 60);
  const minutes = learningTime % 60;
  const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const learningTimePercent = (learningTime / 50000) * 100;

  return (
    <ConfigProvider theme={themeConfig}>
      {showConfetti && newBadgeAchieved && (
        <Confetti
          numberOfPieces={700}
          recycle={false}
        />
      )}
      <Row className="scrollable-row !p-[15px]">
        <Col
          xs={24}
          lg={17}
          className="scrollable-col"
        >
          {isSmallScreen && (
            <Button
              className="!ml-auto !mb-4 !transition-none"
              icon={<FaBars />}
              onClick={toggleSidebar}
            >
              Learning Path
            </Button>
          )}
          {selectedQuizId ? (
            <QuizPlayer quizId={selectedQuizId} />
          ) : (
            <YouTubePlayer ref={playerRef} videoId={selectedVideoId}
              onEnd={handleVideoEnd}
            />
          )}
          <Card
            title="Course Completion"
            variant="borderless"
            className="!m-[10px]"
          >
            <Text>
              {completedItems}/{totalItems} Items Completed
            </Text>

            <Progress
              percent={completePercent}
              showInfo={true}
              strokeColor={colors.primary}
              trailColor={colors.progressback}
            />
            {completePercent === 100 && (
              <CertificateGenerator
                name={username}
                course={projectName}
                userId={userId}
                validator={vlidatorId}
                projectId={projectId}
              />
            )}

          </Card>

          <Card
            className="!m-[10px]"
            style={{ borderColor: colors.background }}
            tabList={tabListNoTitle}
            activeTabKey={activeTabKey2}
            onTabChange={onTab2Change}
            tabProps={{ size: "middle" }}
          >
            {contentListNoTitle[activeTabKey2]}
          </Card>
        </Col>

        <Col
          xs={24}
          lg={7}
          className="scrollable-col"
        >
          {!isSmallScreen && (
            <Card
              title="Learning Path"
              className="!border-transparent !m-[10px]"
              bodyStyle={{ padding: "5px" }}
            >
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                openKeys={openKeys}
                onOpenChange={handleOpenChange}
                onSelect={handleSelect}
                items={menuItemsWithCheckbox}
                className="[&_.ant-menu-item]:!pl-8 "
              />
            </Card>
          )}

          <Card
            title="Learning Hours"
            variant="borderless"
            className="!m-[10px]"
          >
            <Paragraph>
              <strong>{formattedTime} </strong>this fiscal year
            </Paragraph>
            <Flex
              align="center"
              gap="small"
            >
              <ClockCircleOutlined style={{ fontSize: 24 }} />
              <Progress
                percent={learningTimePercent}
                showInfo={false}
                strokeColor={colors.primary}
                trailColor={colors.progressback}
              />
            </Flex>
          </Card>

          <Card
            title="Badges"
            variant="borderless"
            className="!m-[10px]"
          >
            {badgesData.latestBadge || badgesData.nextMilestone ? (
              <>
                {newBadgeAchieved && badgesData.latestBadge && (
                  <BadgeCard
                    key={badgesData.latestBadge.title}
                    date={badgesData.latestBadge.date}
                    image={
                      badgesData.latestBadge.image
                        ? badgesData.latestBadge.image
                        : defaultBadgeImage
                    }
                    title={badgesData.latestBadge.title}
                    description={badgesData.latestBadge.description}
                    project={badgesData.latestBadge.project}
                    colors={colors}
                    progress_required={
                      badgesData.latestBadge.progress_percentage
                    }
                    is_special={badgesData.latestBadge.is_special}
                    initialModalVisible={true}
                    modalOnly={true}
                    autoClose={3000}
                    onModalClose={() => {
                      setNewBadgeAchieved(false);
                    }}
                  />
                )}
                {badgesData.latestBadge && (
                  <Card
                    title="You have earned a new badge"
                    variant="borderless"
                    className="rounded-lg !shadow-md"
                    style={{ backgroundColor: colors.badges }}
                    bodyStyle={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Flex className="!absolute !top-4 !right-4"/>
                    <Flex className="!items-center !flex-1 !w-full">
                      <img
                        src={
                          badgesData.latestBadge.image
                            ? import.meta.env.VITE_ENV === "dev"
                              ? `${Image_URL}${badgesData.latestBadge.image}`
                              : badgesData.latestBadge.image
                            : defaultBadgeImage
                        }
                        alt={badgesData.latestBadge.title}
                        className="!w-5 !h-5 !object-contain !mr-4 md:!w-20 md:!h-20 !flex-shrink-0"
                      />
                      <Flex className="!flex-1 !min-w-0">
                        <Title className="!text-base !font-medium !mb-1 md:!text-lg !whitespace-nowrap !overflow-hidden !text-ellipsis !max-w-[80%]">
                          {badgesData.latestBadge.title}
                        </Title>
                        <Paragraph className="!text-xs !overflow-hidden !text-ellipsis !whitespace-nowrap !max-w-[90%]">
                          {`Awarded on ${badgesData.latestBadge.date}`}
                        </Paragraph>
                      </Flex>
                    </Flex>
                  </Card>
                )}

                {badgesData.nextMilestone && (
                  <Card
                    title="Your next Badge"
                    variant="borderless"
                    className="rounded-lg !shadow-md !mt-3"
                    style={{ backgroundColor: colors.badges }}
                    bodyStyle={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Flex className="!absolute !top-4 !right-4"/>
                    <Flex className="!items-center !flex-1 !w-full">
                      <img
                        src={
                          badgesData.nextMilestone.image
                            ? import.meta.env.VITE_ENV === "dev"
                              ? `${Image_URL}${badgesData.nextMilestone.image}`
                              : badgesData.nextMilestone.image
                            : defaultBadgeImage
                        }
                        alt={badgesData.nextMilestone.title}
                        className="!w-5 !h-5 !object-contain !mr-4 md:!w-20 md:!h-20 !flex-shrink-0"
                      />
                      <Flex className="!flex-1 !min-w-0">
                        <Title className="!text-base !font-medium !mb-1 md:!text-lg !whitespace-nowrap !overflow-hidden !text-ellipsis">
                          {badgesData.nextMilestone.title}
                        </Title>
                        <Paragraph className="text-xs leading-tight overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                          {badgesData.nextMilestone.description}
                        </Paragraph>
                      </Flex>
                    </Flex>
                  </Card>
                )}
              </>
            ) : (
              <Empty
                image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                imageStyle={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  margin: "auto",
                }}
              />
            )}
            <Flex className="!mt-[10px] !text-right" vertical>
              <Link to="/achievements/badges" style={{ color: colors.primary }}>
                Explore Badges...{" "}
                <Text>
                  <ArrowRightOutlined />
                </Text>
              </Link>
            </Flex>
          </Card>
        </Col>
        <Drawer
          title="Learning Path"
          placement="right"
          onClose={toggleSidebar}
          open={sidebarVisible && isSmallScreen}
          width={230}
          height={300}
          closable={false}
          bodyStyle={{ padding: 0 }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            onOpenChange={handleOpenChange}
            onSelect={handleSelect}
            items={menuItemsWithCheckbox}
            className="[&_.ant-menu-item]:!pl-8"
          />
        </Drawer>
      </Row>
    </ConfigProvider>
  );
};
export default Learning;
