import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  toggleSidebar,
  toggleDrawer,
  fetchUserProjectId,
} from "../redux/sidebarSlice";
import logo from "../assets/logo.png";
import { usePermissions } from "../permissions";
import {
  ProjectOutlined,
  HomeOutlined,
  ReadOutlined,
  GithubOutlined,
  CrownOutlined,
  DoubleRightOutlined,
  DoubleLeftOutlined,
  SettingOutlined,
  CommentOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Menu,
  ConfigProvider,
  Button,
  Drawer,
  Image,
  Typography,
  Row,
} from "antd";
import { Icon } from "@iconify/react";
import { Colors } from "../config/color";
import { APP_NAME } from "../config/constants";
import { useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

const { Sider } = Layout;

function getItem(
  label,
  key,
  icon,
  children,
  basePath,
  relatedPaths = [],
  requiredPermission
) {
  return {
    key,
    icon,
    children,
    label: children ? label : <Link to={key}>{label}</Link>,
    basePath,
    relatedPaths,
    requiredPermission,
  };
}

const Sidebar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { collapsed, isDrawerVisible } = useSelector((state) => state.sidebar);
  const { isMobile } = useSelector((state) => state.navbar);
  const colors = Colors();
  const { projectId: urlProjectId } = useParams();
  const dbProjectId = useSelector((state) => state.sidebar.projectId);
  const projectId = urlProjectId || dbProjectId;
  const { user } = useUser();
  const userId = user.id;
  const { hasAccess } = usePermissions();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchUserProjectId(userId));
    }, 1000);
    return () => clearTimeout(timer);
  }, [urlProjectId, dispatch, userId]);

  const allItems = [
    getItem(
      "Dashboard",
      "/dashboard",
      <HomeOutlined />,
      null,
      "/dashboard",
      ["/user-performance/:userId"],
      "org:projects:view"
    ),
    getItem(
      "Projects",
      "/projects",
      <ProjectOutlined />,
      null,
      "/projects",
      ["/create-project", "/projects/:id/details"],
      "org:projects:view"
    ),
    getItem(
      "Learning",
      "/learning",
      <ReadOutlined />,
      [
        getItem(
          "Git & Github",
          "/git-github",
          <GithubOutlined />,
          null,
          "/git-github",
          [],
          "org:learning:view"
        ),
        getItem(
          "Active Learning",
          `/learning/${projectId}/active_learning`,
          <ReadOutlined />,
          null,
          `/learning/${projectId}/active_learning`,
          ["/badges"],
          "org:learning:view"
        ),
      ],
      "/learning",
      [],
      "org:learning:view"
    ),
    getItem(
      "Achievements",
      "/achievements",
      <TrophyOutlined />,
      [
        getItem(
          "Badges",
          "/achievements/badges",
          <CrownOutlined />,
          null,
          "/achievements/badges",
          ["/achievements/badges"],
          "org:learning:view"
        ),
        getItem(
          "Certificates",
          "/achievements/certificates",
          <SafetyCertificateOutlined />,
          null,
          "/achievements/certificates",
          ["/achievements/certificates"],
          "org:learning:view"
        ),
      ],
      "/achievements",
      [],
      "org:learning:view"
    ),
    getItem(
      "Badges",
      "/achievements/badges",
      <CrownOutlined />,
      null,
      "/achievements/badges",
      ["/achievements/badges"],
      "org:settings:manage"
    ),
    getItem(
      "Discussions",
      "/discussions",
      <CommentOutlined />,
      null,
      "/discussions",
      ["/discussions/:id"],
      "org:discussion:participate"
    ),
    getItem(
      "Cheatsheets",
      "/cheatsheets",
      <Icon icon="solar:document-add-outline" />,
      null,
      "/cheatsheets",
      ["/cheatsheet/:id", "/cheatsheet/new", "/cheatsheet/edit/:id"],
      "org:cheetsheet:view",
    ),
    getItem(
      "Settings",
      "/settings",
      <SettingOutlined />,
      null,
      "/settings",
      [],
      "org:settings:manage"
    ),
  ];

  const items = allItems
    .filter((item) => {
      const hasPermission = hasAccess(item.requiredPermission);
      if (item.children) {
        const filteredChildren = item.children.filter((child) =>
          hasAccess(child.requiredPermission)
        );
        return hasPermission && filteredChildren.length > 0
          ? { ...item, children: filteredChildren }
          : null;
      }
      return hasPermission ? item : null;
    })
    .filter(Boolean);

  const themeConfig = {
    token: {
      colorBgBase: colors.background,
      colorText: colors.textcolor,
      colorPrimary: colors.sidebarbg,
      colorBorder: colors.border,
    },
    components: {
      token: { motion: false },
      Menu: {
        itemColor: colors.textcolor,
        itemBg: colors.background,
        colorBgElevated: colors.background,
        itemHoverBg: "transparent",
        itemHoverColor: "#725fff",
        itemSelectedBg: "transparent",
        itemSelectedColor: "#725fff",
        subMenuItemSelectedColor: "#725fff",
        controlItemBgActive: "transparent",
        controlOutline: "none",
      },
      Button: {
        colorText: colors.textcolor,
        colorBgTextHover: colors.hoverGray,
      },
    },
  };
  const [openKeys, setOpenKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");

  const getActiveKeys = useMemo(() => {
    const path = location.pathname;
    let activeKey = path;
    let openKey = "";

    const findMostSpecificMatch = (items) => {
      for (const item of items) {
        if (item.relatedPaths) {
          for (const pathOrPattern of item.relatedPaths) {
            const regexPattern = pathOrPattern
              .replace(/:[^/]+/g, "[^/]+")
              .replace(/\//g, "\\/");
            const regex = new RegExp(`^${regexPattern}$`);
            if (regex.test(path)) {
              activeKey = item.key;
              openKey = item.key;
              return;
            }
          }
        }
        if (item.basePath && path.startsWith(item.basePath)) {
          if (!activeKey || item.basePath.length > activeKey.length) {
            activeKey = item.key;
            openKey = item.key;
          }
        }
        if (item.children) {
          findMostSpecificMatch(item.children);
        }
      }
    };

    findMostSpecificMatch(items);
    return { activeKey, openKey };
  }, [location.pathname, projectId]);

  useEffect(() => {
    setSelectedKey(getActiveKeys.activeKey);
    setOpenKeys(getActiveKeys.openKey ? [getActiveKeys.openKey] : []);
  }, [getActiveKeys]);

  const sidebarContent = (
    <>
      <Link to="/dashboard">
        <Row
          align="middle"
          className="custom-trigger absolute top-0 w-full cursor-pointer p-2 text-[20px] font-bold border-b-[#ECECEC] shadow-sm h-[55px] gap-2"
          style={{ backgroundColor: colors.background, color: colors.logo }}
        >
          <Image
            src={logo}
            alt="logo"
            preview={false}
            className="!w-[25px] !h-[25px] !ml-4"
          />
          {(isMobile || !collapsed) && (
            <Typography.Text
              strong
              style={{ color: colors.logo, fontSize: 20, marginLeft: 8 }}
            >
              {APP_NAME}
            </Typography.Text>
          )}
        </Row>
      </Link>
      <Menu
        selectedKeys={[selectedKey]}
        openKeys={openKeys}
        onOpenChange={(keys) => setOpenKeys(keys)}
        mode="inline"
        motion={null}
        className="!border-r-0 !mt-[60px]"
        style={{ backgroundColor: colors.background }}
        items={items}
      />
      {!isMobile && (
        <Row
          className="absolute bottom-0 w-full border-t cursor-pointer"
          justify="end"
          align="middle"
          onClick={() => dispatch(toggleSidebar())}
          style={{ borderColor: colors.border }}
        >
          <Button
            type="text"
            className="!border-none !outline-none"
            style={{ color: colors.textcolor }}
          >
            {collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
          </Button>
        </Row>
      )}
    </>
  );

  return (
    <ConfigProvider theme={themeConfig}>
      {isMobile ? (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => dispatch(toggleDrawer())}
          open={isDrawerVisible}
          width={230}
          bodyStyle={{ padding: 0, backgroundColor: colors.background }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Layout className="!min-h-screen !fixed !left-0 !top-0">
          <Sider
            collapsible
            collapsed={collapsed}
            width={210}
            collapsedWidth={70}
            trigger={null}
            style={{ backgroundColor: colors.background }}
          >
            {sidebarContent}
          </Sider>
        </Layout>
      )}
    </ConfigProvider>
  );
};

export default Sidebar;
