import {
  Typography,
  Card,
  Empty,
  Button,
  ConfigProvider,
  Flex,
  Modal,
} from "antd";
import CustomTable from "../components/customTable";
import { useEffect, useState } from "react";
import Loader from "./loader";
import { useUser } from "@clerk/clerk-react";
import Notifier from "./notifier";
import { Colors } from "../config/color";
import { EyeOutlined, ShareAltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../axios";
import ShareModal from "./ShareModal";
import Certificate from "./certificate";

const AllCertificate = () => {
  const colors = Colors();
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);
  const { user } = useUser();
  const userId = user?.id;

  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorPrimary: colors.menuhover,
      colorBorderSecondary: colors.border,
    },
    components: {
      Modal: {
        titleColor: colors.textcolor,
        colorIcon: colors.textcolor,
      },
    },
  };

  useEffect(() => {
    const fetchCertificates = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const response = await api.post("api/certificate/get_certificate", {});
        const { certificates } = response.data;

        if (!certificates || certificates.length === 0) {
          setCertificates([]);
          return;
        }

        const formattedCerts = certificates.map((cert) => ({
          certId: cert.certificateId,
          projectName: cert.projectName,
          issueDate: cert.issueDate,
          pdfUrl: cert.pdfUrl,
          projectId: cert.projectId,
          key: cert.certificateId,
          validatorId: cert.validatorId,
        }));

        setCertificates(formattedCerts);
      } catch (error) {
        console.error("Error fetching certificates:", error);
        Notifier({
          type: "error",
          description: "Failed to fetch certificates",
          colors,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, [userId, colors]);

  const handleCertView = (record) => {
    setSelectedCert(record);
    setIsCertModalOpen(true);
  };

  const handleCertShare = (certificateId) => {
    const certificate = certificates.find(
      (cert) => cert.certId === certificateId
    );

    if (!certificate) {
      Notifier({
        type: "error",
        description: "Certificate not found.",
        colors,
      });
      return;
    }

    const certificateUrl =
      import.meta.env.VITE_ENV === "dev"
        ? `${Image_URL}${certificate.pdfUrl}`
        : certificate.pdfUrl;

    setShareUrl(certificateUrl);
    setIsShareModalOpen(true);
  };

  const certificateColumns = [
    {
      title: "Project Name",
      dataIndex: "projectName",
      key: "projectName",
    },
    {
      title: "Issued On",
      dataIndex: "issueDate",
      key: "issueDate",
      render: (date) => dayjs(date, "DD-MM-YYYY").format("D MMM YYYY"),
    },
    {
      title: "Actions",
      key: "Actions",
      render: (_, record) => (
        <>
          <Button
            type="link"
            icon={<EyeOutlined style={{ fontSize: "18px", color:colors.primary }} />}
            onClick={() => handleCertView(record)}
          />
          <Button
            type="link"
            icon={<ShareAltOutlined style={{ fontSize: "18px" ,color:colors.primary}} />}
            onClick={() => handleCertShare(record.certId)}
          />
        </>
      ),
    },
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <Card
        title="Issued Certificates"
        className="shadow-md !rounded-lg min-h-[480px] h-full !w-full flex flex-col justify-start !p-0 overflow-hidden"
        styles={{
          body: { padding: 0 },
          head: { borderBlockStyle: "none" },
        }}
      >
        {isLoading ? (
          <Flex className="absolute top-0 left-0 w-full h-full items-center justify-center">
            <Loader isConstrained={true} />
          </Flex>
        ) : certificates.length > 0 ? (
          <CustomTable
            columns={certificateColumns}
            dataSource={certificates}
            rowKey="certId"
            pageSize={5}
          />
        ) : (
          <Empty
            image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
            imageStyle={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "50px",
            }}
            description={
              <Typography.Text>No Certificates Found</Typography.Text>
            }
          />
        )}
      </Card>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
        colors={colors}
      />

      <Modal
        open={isCertModalOpen}
        onCancel={() => {
          setIsCertModalOpen(false);
          setSelectedCert(null);
        }}
        footer={null}
        centered
        width={800}
        destroyOnClose
      >
        {selectedCert && (
          <Certificate
            userId={userId}
            projectName={selectedCert.projectName}
            validatorId={selectedCert.validatorId}
          />
        )}
      </Modal>
    </ConfigProvider>
  );
};

export default AllCertificate;
