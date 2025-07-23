import React, { useEffect } from "react";
import { ConfigProvider, Layout, Tabs, Space, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { setActiveTab } from "../redux/settingsSlice";
import { Colors } from "../config/color";
import Teams from "../components/teams";
import ManageUsers from "../components/manage_users";
import { useOrganization } from "@clerk/clerk-react";
import Valdiation from "../components/certificateValidation";
import QuizGenerator from "../components/quizGenerator";
import IntentManager from "../../chatbot/IntentManager";

const { Content } = Layout;
const Settings = () => {
  const dispatch = useDispatch();
  const activeTab = useSelector((state) => state.settings.activeTab);
  const colors = Colors();
  const { organization, membership } = useOrganization();
  const themeConfig = {
    token: {
      colorPrimary: colors.sidebartext,
    },
    components: {
      Tabs: {
        itemColor: colors.textcolor,
        itemHoverColor: colors.sidebarbg,
        itemSelectedColor: colors.sidebarbg,
      },
    },
  };

  const { Paragraph, Title } = Typography;

  const tabItems = [
    {
      key: "Teams",
      label:
        membership?.role === "org:employee"
          ? "Interns Team Settings"
          : "Team Settings",
      children: <Teams />,
      requiredPermission: "org:settings:manage",
    },
    {
      key: "Users",
      label: "User Settings",
      children: <ManageUsers />,
      requiredPermission: "org:user:manage",
    },
    {
      key: "Signature",
      label: "Validator Settings",
      children: <Valdiation />,
      requiredPermission: "org:user:manage",
    },
    {
      key: "Quizz",
      label: "Quizz Settings",
      children: <QuizGenerator />,
      requiredPermission: "org:user:manage",
    },
    {
      key: "Chatbot",
      label: "Chatbot Settings",
      children: <IntentManager />,
      requiredPermission: "org:user:manage",
    },
  ];

  const allowedTabs = tabItems.filter((tab) => {
    if (!organization || !membership) return false;
    return membership.permissions?.includes(tab.requiredPermission);
  });

  useEffect(() => {
    if (
      allowedTabs.length > 0 &&
      !allowedTabs.some((tab) => tab.key === activeTab)
    ) {
      dispatch(setActiveTab(allowedTabs[0].key));
    }
  }, [activeTab, allowedTabs, dispatch]);

  if (allowedTabs.length === 0) {
    return (
      <Layout className="!m-0 !p-0 min-h-screen overflow-hidden">
        <Content
          className="!m-0 !p-0 h-full overflow-auto"
          style={{ backgroundColor: colors.theme }}
        >
          <Space direction="vertical" className="p-4 !w-full">
            <Title
              level={1}
              className="!text-3xl "
              style={{ color: colors.textcolor }}
            >
              Settings
            </Title>
            <Paragraph
              className="!text-sm !m-0"
              style={{ color: colors.modaltext }}
            >
              You do not have permission to manage settings.
            </Paragraph>
          </Space>
        </Content>
      </Layout>
    );
  }

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="!m-0 !p-0 min-h-screen overflow-hidden">
        <Content
          className="!m-0 !p-0 h-full overflow-auto"
          style={{ backgroundColor: colors.theme }}
        >
          <Space direction="vertical" className="p-4 !w-full">
            <Title
              level={1}
              className="!text-3xl !mb-2 "
              style={{ color: colors.textcolor }}
            >
              Settings
            </Title>
            <Paragraph
              className="!text-base !m-0"
              style={{ color: colors.modaltext }}
            >
              Manage your account settings and preferences.
            </Paragraph>

            <Tabs
              activeKey={activeTab}
              onChange={(key) => dispatch(setActiveTab(key))}
              tabBarStyle={{ borderBottom: "none" }}
              className="border-none !mt-6 custom-tabs"
              items={allowedTabs}
            />
          </Space>
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default Settings;
