import React, { useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { QrReader } from "react-qr-reader";
import { Card, Typography, Button, Image, Flex } from "antd";
import CertificateABI from "../contracts/CertificateABI.json";
import { ScanOutlined, CheckCircleFilled } from "@ant-design/icons";
import Confetti from "react-confetti";
import { Colors } from "../config/color";
import Loader from "./loader";
import Notifier from "./notifier";

const { Title, Paragraph, Text } = Typography;

const CertificateVerifier = () => {
  const RPC_URL = import.meta.env.VITE_RPC_URL;
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const colors = Colors();

  const contractAddress = import.meta.env.VITE_contractAddress;
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(contractAddress, CertificateABI, provider);

  const handleScan = async (result) => {
    if (result?.text && !loading) {
      setError("");
      setLoading(true);
      try {
        const parsed = JSON.parse(result.text);
        const certId = parseInt(parsed.certId);
        const userId = parsed.userId;

        if (!certId || !userId || isNaN(certId)) {
          throw new Error("Invalid QR data structure.");
        }

        const [cert, owner] = await contract.verifyCertificate(certId, userId);

        setCertData({
          certId: cert.certId.toString(),
          studentName: cert.studentName,
          projectName: cert.projectName,
          issueDate: cert.issueDate,
          owner,
        });
        setShowConfetti(true);
        setShowScanner(false);
      } catch (err) {
        console.error("Verification error:", err);
        setError("Invalid or unverified certificate.");
        setCertData(null);
        setShowScanner(false);
        Notifier({
          type: "error",
          description: "Invalid or unverified certificate. Please try again.",
          colors,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleError = (err) => {
    console.error("QR Scanner Error:", err);
    setError("Error accessing camera.");
  };

  const resetScan = () => {
    setCertData(null);
    setError("");
    setShowScanner(false);
  };

  return (
    <Flex vertical className="!max-w-4xl !w-full !mx-auto !px-4 !py-5">
      {showConfetti && (
        <Confetti
          numberOfPieces={300}
          recycle={false}
          tweenDuration={300}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}

      {!showScanner && !certData && (
        <Flex vertical align="center" className="!text-center">
          <Title level={2} style={{ color: colors.textcolor }}>
            Verify your PositLearn Certificates
          </Title>
          <Image src="/logo.png" height={100} width={100} preview={false} />
          <Button
            type="primary"
            onClick={() => {
              setShowScanner(true);
              setError("");
            }}
            className="!text-base !py-4 !px-6 !mt-4"
            loading={loading}
          >
            {error ? "Try Again" : "Scan QR Code"} <ScanOutlined />
          </Button>
        </Flex>
      )}

      {showScanner && (
        <Flex vertical className="!scanner-container">
          <Title
            level={2}
            style={{ textAlign: "center", color: colors.textcolor }}
          >
            Verify your PositLearn Certificates
          </Title>
          <Flex className="!qr-reader-wrapper">
            <QrReader
              constraints={{ facingMode: "environment" }}
              onResult={handleScan}
              onError={handleError}
              scanDelay={500}
              className="!w-full !mt-5"
            />
          </Flex>
          {loading && (
            <Flex
              className="absolute !top-0 !left-0 !w-full !h-full"
              align="center"
              justify="center"
            >
              <Loader isConstrained={true} />
            </Flex>
          )}
        </Flex>
      )}

      {certData && (
        <Flex vertical className="!certificate-result">
          <Title
            level={2}
            style={{ textAlign: "center", color: colors.textcolor }}
          >
            <CheckCircleFilled className="!text-[#52c41a] !mr-2" />
            Certificate Successfully Verified
          </Title>

          <Card
            title={
              <Text
                strong
                style={{ textAlign: "center", color: colors.textcolor }}
              >
                Certificate Details
              </Text>
            }
            className="!mt-5 !max-w-[400px] !w-full !mx-auto"
            style={{
              color: colors.textcolor,
              backgroundColor: colors.background,
            }}
          >
            {[
              { label: "Certificate ID", value: `#767480${certData.certId}` },
              { label: "Issued to", value: certData.studentName },
              { label: "Project Name", value: certData.projectName },
              { label: "Issuance Date", value: certData.issueDate },
            ].map(({ label, value }) => (
              <Paragraph key={label} style={{ color: colors.textcolor }}>
                <Flex justify="space-between">
                  <Text>{label}:</Text>
                  <Text strong style={{ color: colors.textcolor }}>
                    {value}
                  </Text>
                </Flex>
              </Paragraph>
            ))}

            <Flex gap="middle" className="!mt-5">
              <Button type="primary" onClick={resetScan} block>
                Verify Another Certificate
              </Button>
            </Flex>
          </Card>
        </Flex>
      )}
    </Flex>
  );
};

export default CertificateVerifier;
