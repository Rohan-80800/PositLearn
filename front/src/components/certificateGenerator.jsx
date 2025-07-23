import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import CertificateABI from "../contracts/CertificateABI.json";
import { Button, Flex, Spin, Tooltip, Modal, Tag } from "antd";
import { EyeOutlined, CheckOutlined } from "@ant-design/icons";
import Certificate from "./certificate";
import { Colors } from "../config/color";
import Notifier from "./notifier";
import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import api from "../axios";
import certificateEmailTemplate from "./certificateEmailTemplate";
import { APP_NAME } from "../config/constants";

const CertificateGenerator = ({
  userId,
  name,
  course,
  validator,
  projectId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [, setCertId] = useState(null);
  const [, setIssueDate] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const colors = Colors();
  const progressPercentage = useSelector(
    (state) => state.video.progress_percentage
  );
  const isEmailSent = progressPercentage[projectId]?.emailSent || false;
  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");

  const envConfig = useMemo(
    () => ({
      contractAddress: import.meta.env.VITE_contractAddress,
      account: import.meta.env.VITE_walletAddress,
      URL: import.meta.env.VITE_RPC_URL,
      privateKey: import.meta.env.VITE_privateKey,
    }),
    []
  );
  const { contractAddress, account, URL, privateKey } = envConfig;

  const checkIfCertificateExists = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(URL);
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(
        contractAddress,
        CertificateABI,
        wallet
      );
      const certs = await contract.getMyCertificates();
      const matched = certs.find(
        (cert) =>
          cert.userId.toString() === userId.toString() &&
          cert.projectName === course
      );

      if (matched) {
        setHasCertificate(true);
        setCertId(matched.certId.toString());
        setIssueDate(matched.issueDate);
      }
      return !!matched;
    } catch {
      return false;
    }
  };

  const handleIssueCertificate = async () => {
    if (!account || !privateKey) {
      Notifier({
        type: "error",
        description:
          "Please set VITE_walletAddress and VITE_privateKey in .env",
        colors,
      });
      return false;
    }
    try {
      const provider = new ethers.JsonRpcProvider(URL);
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(
        contractAddress,
        CertificateABI,
        wallet
      );

      const date = new Date().toLocaleDateString("en-GB").split("/").join("-");
      const tx = await contract.issueCertificate(userId, name, course, date);
      const receipt = await tx.wait();

      const log = receipt.logs.find(
        (log) => log.fragment?.name === "CertificateIssued"
      );
      if (!log) throw new Error("CertificateIssued event not found");

      const certIdFromEvent = log.args.certId.toString();
      setHasCertificate(true);
      setCertId(certIdFromEvent);
      setIssueDate(date);

      await sendCertificateEmail(certIdFromEvent, date);
      return true;
    } catch (err) {
      const errorMessage = err?.error?.message || err?.message || "";
      if (
        errorMessage.includes(
          "Certificate with this user and project already exists"
        )
      ) {
        Notifier({
          type: "warning",
          description: "Certificate Already Exists",
          colors,
        });
        setHasCertificate(true);
        return true;
      } else {
        console.error("Error issuing certificate:", err);
        Notifier({
          type: "error",
          description: "An unexpected error occurred.",
          colors,
        });
        return false;
      }
    }
  };

  const getPDFBase64 = async (pdfUrl) => {
    try {
      const isLocal = import.meta.env.VITE_ENV === "dev";

      if (!isLocal) {
        const res = await api.post("/api/certificate/get-pdf-base64", {
          pdfUrl,
        });
        return res.data.base64;
      }

      const fullUrl = pdfUrl.startsWith("http")
        ? pdfUrl
        : `${Image_URL}${pdfUrl}`;

      const response = await fetch(fullUrl);
      const contentType = response.headers.get("Content-Type");

      if (!response.ok || !contentType.includes("application/pdf")) {
        throw new Error(`Invalid response or not a PDF: ${contentType}`);
      }

      const blob = await response.blob();

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(",")[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error fetching PDF or converting to base64:", error);
      throw new Error("Failed to fetch or convert PDF to base64");
    }
  };

  const sendCertificateEmail = async (certificateId, issueDate) => {
    if (!email || isEmailSent || emailSent) {
      Notifier({
        type: "info",
        description: "Email already sent or no email address provided.",
        colors,
      });
      return;
    }

    try {
      const response = await api.post("api/certificate/share_certificate", {
        certificateId,
        userId,
        projectId,
        issueDate,
        name,
        course,
      });
      const pdfUrl = response.data.data;
      const pdfBase64 = await getPDFBase64(pdfUrl);

      const emailContent = certificateEmailTemplate({
        name,
        course,
        issueDate,
      });

      await api.post(`/api/certificate/send-certificate-email/${userId}`, {
        email,
        subject: `Congratulations! Your Certificate for ${course}`,
        content: emailContent,
        attachment: {
          filename: `${course}_Certificate.pdf`,
          content: pdfBase64,
          encoding: "base64",
        },
        projectId,
        APP_NAME,
      });

      setEmailSent(true);

      Notifier({
        type: "success",
        title: "Success",
        description: `Certificate issued and email has been sent successfully.`,
        colors,
      });
    } catch (error) {
      Notifier({
        type: "error",
        title: "Error",
        description: `Failed to send certificate email: ${error.message}`,
        colors,
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!account) {
        setInitialLoading(false);
        return;
      }

      const certificateExists = await checkIfCertificateExists();
      if (!certificateExists) {
        await handleIssueCertificate();
      }
      setInitialLoading(false);
    };

    init();
  }, [userId, course, account]);

  return (
    <>
      <Flex justify="end" style={{ marginTop: 24 }}>
        {initialLoading ? (
          <Spin />
        ) : hasCertificate ? (
          <>
            <Tag
              icon={<CheckOutlined className="!text-green-600 !text-[14px]" />}
              className="!font-bold !flex !items-center !h-[25px] !bg-transparent !text-green-600 !px-2 !text-[13px]"
            >
              Certificate Claimed
            </Tag>
            <Tooltip title="View Certificate">
              <Button
                type="link"
                icon={<EyeOutlined style={{ fontSize: "20px" }} />}
                onClick={() => {
                  if (!account) {
                    Notifier({
                      type: "warning",
                      description:
                        "Please connect your wallet to view the certificate.",
                      colors,
                    });
                    return;
                  }

                  if (!hasCertificate) {
                    Notifier({
                      type: "info",
                      description: "You have not claimed a certificate yet.",
                      colors,
                    });
                    return;
                  }

                  setIsModalOpen(true);
                }}
              />
            </Tooltip>
          </>
        ) : null}

        <Modal
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          centered
          width={800}
        >
          <Certificate
            userId={userId}
            projectName={course}
            validatorId={validator}
          />
        </Modal>
      </Flex>
    </>
  );
};

export default CertificateGenerator;
