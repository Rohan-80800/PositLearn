import React from "react";
import { Layout, Typography, Flex, Space } from "antd";
import { Colors } from "../config/color";
import AllCertificate from "../components/allCertificate";

const { Content } = Layout;
const { Title, Text } = Typography;

const CertificatePage = () => {
  const colors = Colors();

  return (
    <Layout className="!m-0 !p-0 min-h-screen overflow-hidden">
      <Content
        className="!m-0 !p-4 h-full overflow-auto"
        style={{ backgroundColor: colors.theme }}
      >
        <Flex vertical className="h-38" gap="small">
          <Title
            level={2}
            style={{ marginBottom: 0, color: colors.textcolor }}
          >
            Certificates
          </Title>
          <Text style={{ color: colors.textcolor }}>
            View your issued credentials and verify their authenticity.
          </Text>
        </Flex>

        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <AllCertificate />
        </Space>
      </Content>
    </Layout>
  );
};

export default CertificatePage;