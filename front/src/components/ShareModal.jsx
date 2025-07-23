import {
  Button,
  Flex,
  Input,
  Modal,
  Row,
  Space,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckOutlined,
  CopyOutlined,
  LinkedinOutlined,
  MailOutlined,
  TwitterOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import Notifier from "./notifier";

const ShareModal = ({ isOpen, onClose, shareUrl, colors }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    Notifier({
      type: "success",
      description: "URL copied to Clipboard",
      colors,
    });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShareToApp = (platform) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    let shareLink = "";

    switch (platform) {
      case "whatsapp":
        shareLink = `https://wa.me/?text=Check out my certificate! ${encodedUrl}`;
        break;
      case "twitter":
        shareLink = `https://x.com/share?url=${encodedUrl}&text=Check out my certificate!`;
        break;
      case "linkedin":
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "email": {
        const subject = encodeURIComponent("My Certificate");
        const body = encodeURIComponent(
          "Check out my certificate: " + shareUrl
        );
        shareLink = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${subject}&body=${body}`;
        break;
      }
      default:
        break;
    }

    if (shareLink) {
      window.open(shareLink, "_blank");
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      title="Share Certificate"
      destroyOnClose
    >
      <Flex vertical gap={16}>
        <Typography.Text>
          Share your certificate using the link below:
        </Typography.Text>
        <Input
          value={shareUrl}
          readOnly
          addonAfter={
            <Button
              type="text"
              size="small"
              icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopyUrl}
            />
          }
        />
        <Row justify="center" gutter={[16, 16]}>
          <Space wrap size="middle" align="center">
            <Tooltip title="Share on LinkedIn">
              <Button
                shape="circle"
                icon={<LinkedinOutlined />}
                className="!bg-[#0077B5] !text-white !border-none !hover:opacity-90"
                onClick={() => handleShareToApp("linkedin")}
              />
            </Tooltip>
            <Tooltip title="Share via Email">
              <Button
                shape="circle"
                icon={<MailOutlined />}
                className="!bg-[#D44638] !text-white !border-none !hover:opacity-90"
                onClick={() => handleShareToApp("email")}
              />
            </Tooltip>
            <Tooltip title="Share on WhatsApp">
              <Button
                shape="circle"
                icon={<WhatsAppOutlined />}
                className="!bg-[#25D366] !text-white !border-none !hover:opacity-90"
                onClick={() => handleShareToApp("whatsapp")}
              />
            </Tooltip>
            <Tooltip title="Share on Twitter">
              <Button
                shape="circle"
                icon={<TwitterOutlined />}
                className="!bg-[#1DA1F2] !text-white !border-none !hover:opacity-90"
                onClick={() => handleShareToApp("twitter")}
              />
            </Tooltip>
          </Space>
        </Row>
      </Flex>
    </Modal>
  );
};

export default ShareModal;
