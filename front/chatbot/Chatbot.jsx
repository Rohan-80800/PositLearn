import { useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  FloatButton,
  Card,
  Avatar,
  Input,
  Button,
  List,
  Typography,
  Flex,
  Space,
  ConfigProvider,
} from "antd";
import {
  MessageOutlined,
  RobotOutlined,
  UserOutlined,
  SendOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import intents from "./intents.json";
import defaultIntents from "./defaultIntents.json";
import { Colors } from "../src/config/color";
import { useUser } from "@clerk/clerk-react";
import ReactMarkdown from "react-markdown";
const { Text } = Typography;

const Chatbot = () => {
  const [visible, setVisible] = useState(false);
  const { isMobile } = useSelector((state) => state.navbar);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const colors = Colors();
  const { user } = useUser();
  const FirstName = user?.firstName;
  const userIcon = user?.imageUrl;
  const [messages, setMessages] = useState(() => {
    const stored = sessionStorage.getItem("chatMessages");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    if (!sessionStorage.getItem("chatMessages") && FirstName) {
      const welcomeMessage = {
        from: "bot",
        text: `Hello ${FirstName}! How can I help you?`,
      };
      setMessages([welcomeMessage]);
      sessionStorage.setItem("chatMessages", JSON.stringify([welcomeMessage]));
    }
  }, [FirstName]);

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorPrimary: colors.primary,
    },
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (visible) {
      sessionStorage.setItem("chatMessages", JSON.stringify(messages));
      scrollToBottom();
    }
  }, [messages, visible]);

  const matchIntent = (userMessage) => {
    const lower = userMessage.toLowerCase();

    for (const intent of defaultIntents) {
      for (const phrase of intent.training_phrases) {
        if (lower.includes(phrase.toLowerCase())) {
          return intent.response;
        }
      }
    }
    for (const intent of intents) {
      for (const phrase of intent.training_phrases) {
        if (lower.includes(phrase.toLowerCase())) {
          return intent.response;
        }
      }
    }
    return "Sorry, I didn't understand that. Can you rephrase?";
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { from: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const botReply = matchIntent(userMessage);
      setMessages((prev) => [...prev, { from: "bot", text: botReply }]);
      setLoading(false);
    }, 100);
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <FloatButton
        icon={<MessageOutlined />}
        type="primary"
        className="!right-6 !bottom-6"
        onClick={() => setVisible((prev) => !prev)}
      />

      {visible && (
        <Flex
          vertical
          className={`fixed bottom-[80px] right-6 ${
            isMobile ? "w-[90vw] h-[75vh]" : "w-[360px] h-[500px]"
          } !shadow-[0_4px_16px_#00000033] !rounded-[12px] !overflow-hidden !z-[1000]`}
        >
          <Card
            title={
              <Flex
                justify="space-between"
                align="center"
              >
                <Flex
                  align="center"
                  style={{ color: colors.white }}
                >
                  <Avatar
                    icon={<RobotOutlined />}
                    style={{ backgroundColor: colors.primary }}
                  />
                  Chat Assistant
                </Flex>
                <CloseOutlined
                  onClick={() => setVisible(false)}
                  style={{
                    fontSize: "16px",
                    cursor: "pointer",
                    color: colors.white,
                  }}
                />
              </Flex>
            }
            bordered={false}
            style={{ height: "100%" }}
            headStyle={{
              background: colors.primary,
            }}
            bodyStyle={{
              padding: 0,
              display: "flex",
              flexDirection: "column",
              height: "calc(100% - 56px)",
            }}
          >
            <div
              className="flex-1 overflow-y-auto p-4"
              style={{ backgroundColor: colors.theme }}
            >
              <List
                dataSource={messages}
                split={false}
                renderItem={(item) => (
                  <List.Item
                    className={`!flex ${
                      item.from === "user" ? "!justify-end" : "!justify-start"
                    }`}
                  >
                    <Space
                      direction="horizontal"
                      align="start"
                      className={`flex ${
                        isMobile ? "!max-w-[90%]" : "!max-w-[80%]"
                      } ${
                        item.from === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <Avatar
                        src={item.from === "user" ? userIcon : undefined}
                        icon={
                          item.from === "user" ? (
                            !userIcon && <UserOutlined />
                          ) : (
                            <RobotOutlined />
                          )
                        }
                        size="small"
                        style={{
                          backgroundColor: colors.primary,
                        }}
                      />

                      <Text
                        className="!px-3 !py-3 !pb-0 !rounded-[15px] !shadow-[0_1px_2px_#0000001A]
                      !break-words whitespace-pre-wrap inline-block"
                        style={{
                          maxWidth: isMobile ? "200px" : "220px",
                          background:
                            item.from === "user"
                              ? colors.botuserbg
                              : colors.background,
                          color: colors.textcolor,
                        }}
                      >
                        <ReactMarkdown>{item.text}</ReactMarkdown>
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
              {loading && (
                <List.Item style={{ justifyContent: "flex-start" }}>
                  <Space align="start">
                    <Avatar
                      icon={<RobotOutlined />}
                      size="small"
                      style={{ backgroundColor: colors.menuhover }}
                    />
                    <Text
                      className="!px-3 !py-2 !rounded-[15px] !shadow-[0_1px_2px_#0000001A]"
                      style={{ background: colors.background }}
                    >
                      Typing...
                    </Text>
                  </Space>
                </List.Item>
              )}
              <div
                ref={messagesEndRef}
                style={{ height: 0 }}
              />
            </div>
            <div
              className="px-4 py-2 flex-shrink-0"
              style={{ background: colors.background }}
            >
              <Flex align="center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPressEnter={handleSend}
                  placeholder="Type your message..."
                  className="!rounded-[20px] !px-[11px] !py-[4px] !flex-grow !bg-transparent !shadow-none
                !border-none !outline-none focus:!shadow-none focus:!border-none"
                />
                <Button
                  type="text"
                  icon={
                    <SendOutlined
                      style={{
                        color: input.trim() ? colors.primary : colors.disabled,
                      }}
                    />
                  }
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="!ml-[8px] !p-0 !border-none !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent"
                />
              </Flex>
            </div>
          </Card>
        </Flex>
      )}
    </ConfigProvider>
  );
};

export default Chatbot;
