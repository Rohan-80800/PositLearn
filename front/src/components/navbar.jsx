import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  UserAddOutlined,
  DeleteOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Badge,
  Typography,
  ConfigProvider,
  theme,
  Drawer,
  Button,
  Space,
  Flex,
  Col,
} from "antd";
import {
  toggleTheme,
  setWindowWidth,
  fetchNotifications,
  markNotificationAsRead,
} from "../redux/navbarSlice";
import { toggleDrawer } from "../redux/sidebarSlice";
import { UserButton } from "@clerk/clerk-react";
import { Colors } from "../config/color";
import SearchComponent from "./searchComponent";
import { useAuth } from "@clerk/clerk-react";
import { notificationTypeColors } from "../redux/navbarSlice";

const { Header } = Layout;
const { Text } = Typography;

const NotificationItem = ({ 
  notification, 
  colors, 
  typeIcons, 
  formatTime, 
  onMarkAsRead, 
  isRead = false 
}) => {
  const borderColor = notificationTypeColors[notification.metadata?.type] || notificationTypeColors.default;
  return (
    <Space
      className={`p-3 mb-2 rounded-lg transition-all duration-300 hover:shadow-lg ${
        isRead ? "opacity-100" : ""
      }`}
      style={{
        backgroundColor: isRead ? colors.background : colors.notification,
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${borderColor}`,
        cursor: "pointer",
      }}
      onClick={!isRead ? onMarkAsRead : undefined}
    >
      <Space className="flex items-start gap-3">
        <Space
          className="flex-shrink-0 p-2 rounded-full"
          style={{
            backgroundColor: colors.background,
            color: borderColor,
          }}
        >
          {typeIcons[notification.metadata?.type] || (
            <BellOutlined style={{ fontSize: 20, color: borderColor }} />
          )}
        </Space>
        <Col className="min-w-0 p-3">
          {!isRead && (
            <Text
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.primary }}
            />
          )}
          <Text className="flex -m-2 w-full">
            <span
              className="truncate text-sm mr-2"
              style={{ color: colors.textcolor }}
              dangerouslySetInnerHTML={{ __html: notification.title }}
            />
          </Text>
          <span
            className="mt-3 -ml-2 block"
            style={{ color: colors.darkGray }}
            dangerouslySetInnerHTML={{ __html: notification.message }}
          />
          <Space
            direction="vertical"
            className="mt-1 text-xs block"
            style={{ color: colors.avatarGray }}
          >
            {formatTime(notification.created_at)}
          </Space>
        </Col>
      </Space>
    </Space>
  );
};

const EmptyNotification = ({ colors, message = "No notifications yet" }) => (
  <Space className="flex flex-col justify-center items-center h-full py-10 px-4">
    <Space className="mb-4 p-4 rounded-full" style={{ backgroundColor: colors.hoverGray }}>
      <BellOutlined style={{ fontSize: 48, color: colors.primary }} />
    </Space>
    <Text strong style={{ fontSize: 18, color: colors.textcolor, marginBottom: 8 }}>
      {message}
    </Text>
    <Text style={{ color: colors.darkGray, textAlign: 'center' }}>
      {message === "No notifications yet" 
        ? "We'll notify you when something new arrives" 
        : "Your read notifications will appear here"}
          </Text>
        </Space>
      );
const Navbar = () => {
  const dispatch = useDispatch();
  const { isDarkTheme, isMobile, notifications } = useSelector((state) => state.navbar);
  const colors = Colors(isDarkTheme);
  const [isSiderVisible, setIsSiderVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('unread');
  const { getToken } = useAuth();

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);
  const unreadCount = unreadNotifications.length;
  const readCount = readNotifications.length;

  const typeIcons = {
    alert: <ExclamationCircleOutlined style={{ color: colors.danger }} />,
    assign: <UserAddOutlined style={{ color: colors.success }} />,
    update: <SyncOutlined style={{ color: colors.update }} />,
    delete: <DeleteOutlined style={{ color: colors.danger }} />,
  };

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const token = await getToken();
        dispatch(fetchNotifications(token));
      } catch (error) {
        console.error("Error setting up notifications:", error);
      }
    };
    setupNotifications();
  }, [dispatch, getToken]);

  useEffect(() => {
    const handleResize = () => {
      dispatch(setWindowWidth(window.innerWidth));
    };

    dispatch(setWindowWidth(window.innerWidth));

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  const handleMarkAsRead = (notification) => {
    if (!notification.read && notification.id) {
      getToken()
        .then((token) => {
          dispatch(
            markNotificationAsRead({ notificationId: notification.id, token })
          );
        })
        .catch((error) => {
          console.error("Error marking notification as read:", error);
        });
    }
  };

  const handleMarkAllAsRead = () => {
    getToken()
      .then((token) => {
        unreadNotifications.forEach((notification) => {
          if (!notification.read && notification.id) {
            dispatch(markNotificationAsRead({ notificationId: notification.id, token }));
          }
        });
      })
      .catch((error) => {
        console.error("Error marking all notifications as read:", error);
      });
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme(isDarkTheme ? "light" : "dark"));
  };

  const formatTime = (d) => {
    const diff = Date.now() - new Date(d),
      m = Math.floor(diff / 60000),
      h = Math.floor(m / 60);
    return m < 1
      ? "Just now"
      : h < 24
      ? `${h ? `${h}hour ` : ""}${m % 60}minutes ago`
      : new Date(d).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkTheme ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
    <Layout
      style={{
        width: "-webkit-fill-available",
      }}
      className="fixed top-0 z-10"
    >
      <Header
        className={`!h-[55px] !px-[10px] ${
          isMobile ? "!px-[10px]" : "!px-[20px]"
        } !flex items-center !justify-between `}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: colors.background,
        }}
      >
        <Flex align="center">
          {isMobile && (
              <Button
                type="text"
                shape="circle"
                className={`cursor-pointer rounded-full transition-colors duration-300 flex items-center justify-center mr-2 ${
                  isMobile ? "p-[5px]" : "p-[8px]"
                }`}
              onClick={() => dispatch(toggleDrawer())}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = colors.hoverGray)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
               icon={<MenuOutlined style={{ color: colors.darkGray }} />}
            />
          )}

          <Flex align="center">
            <SearchComponent colors={colors} />
          </Flex>
        </Flex>

        <Flex
            className={`items-center !justify-between ${
              isMobile ? "!gap-[5px]" : "!gap-[10px]"
            }`}
          >
            <Button
              type="text"
              shape="circle"
              onClick={handleThemeToggle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.hoverGray;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              className={`transition-colors duration-300 flex items-center justify-center ${
                isMobile ? "p-[5px]" : "p-[8px]"
              }`}
              style={{ border: "none" }}
          >
              {isDarkTheme ? (
                <MoonOutlined style={{ color: colors.darkGray }} />
              ) : (
                <SunOutlined style={{ color: colors.darkGray }} />
              )}
            </Button>

          <Button
            type="text"
            onClick={() => setIsSiderVisible(true)}
              className={`cursor-pointer rounded-full transition-colors duration-300 flex items-center justify-center
                ${isMobile ? "p-[5px] mr-[5px]" : "p-[8px] mr-[10px]"}`}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = colors.hoverGray)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <Badge
                size="small"
                count={unreadCount}
                offset={[-3, 4]}
                style={{
                  backgroundColor: colors.primary,
                  fontSize: "8px",
                  boxShadow: "none",
                }}
              >
                <BellOutlined
                  className={`${isMobile ? "!text-[14px]" : "!text-[17px]"}`}
                  style={{
                    color: colors.darkGray,
                    borderColor: colors.background,
                  }}
                />
              </Badge>
            </Button>

          <UserButton
            appearance={{
              elements: {
                avatarBox: {
                  width: isMobile ? "20px" : "26px",
                  height: isMobile ? "20px" : "26px",
                },
              },
            }}
          />
        </Flex>
      </Header>
    </Layout>
      <Drawer
        title={
          <Space direction="horizontal" className="w-full !flex-wrap justify-between items-center">
            <Space>
            <BellOutlined style={{ color: colors.primary }} />
            <Text strong style={{ fontSize: 16, color: colors.textcolor }}>
              Notifications
            </Text>
          </Space>
          <Space>
            {unreadCount > 0 && (
              <Button
                type="text"
                size="small"
                  icon={<CheckOutlined className="-m-1" />}
                onClick={handleMarkAllAsRead}
                style={{ color: colors.primary }}
                className="!whitespace-nowrap"
              >
                 Mark all as read
              </Button>
            )}
            </Space>
          </Space>
        }
        placement="right"
        onClose={() => setIsSiderVisible(false)}
        open={isSiderVisible}
        width={isMobile ? "80%" : 350}
        closeIcon={null}
        styles={{
          header: {
            backgroundColor: colors.background,
            borderBottom: `1px solid ${colors.border}`,
          },
          body: {
            padding: 0,
            backgroundColor: colors.background,
          },
        }}
      >
        <Flex
          className="flex border-b"
          style={{ borderColor: colors.border, padding: "1px" }}
        >
          <button
            className={`flex-1 py-2 text-center !font-medium rounded-t-md transition-colors duration-200`}
            style={{
              backgroundColor:
                activeTab === "unread"
                  ? colors.notification
                  : colors.background,
              color: activeTab === "unread" ? colors.primary : colors.darkGray,
              marginRight: 8,
              cursor: "pointer",
            }}
            onClick={() => setActiveTab("unread")}
          >
            Unread
            <Badge
              className="!ml-2"
              count={unreadCount}
              style={{ backgroundColor: colors.primary }}
            />
          </button>

          <button
            className={`flex-1 py-2 text-center !font-medium rounded-t-md transition-colors duration-200`}
            style={{
              backgroundColor:
                activeTab === "read" ? colors.notification : colors.background,
              color: activeTab === "read" ? colors.primary : colors.darkGray,
              cursor: "pointer",
            }}
            onClick={() => setActiveTab("read")}
          >
            Read ({readCount})
          </button>
        </Flex>

        <Flex
          vertical
          style={{
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
            padding: "10px",
          }}
        >
          {activeTab === "unread" ? (
            unreadNotifications.length === 0 ? (
              <EmptyNotification colors={colors} />
            ) : (
              unreadNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  colors={colors}
                  typeIcons={typeIcons}
                  formatTime={formatTime}
                  onMarkAsRead={() => handleMarkAsRead(notification)}
                />
              ))
            )
          ) : readNotifications.length === 0 ? (
              <EmptyNotification colors={colors} message="No read notifications" />
            ) : (
              readNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  colors={colors}
                  typeIcons={typeIcons}
                  formatTime={formatTime}
                  isRead={true}
                />
              ))
          )}
        </Flex>
      </Drawer>
    </ConfigProvider>
  );
};

export default Navbar;
