import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useImperativeHandle,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button, Card, Typography, Row, Col, Image, Space, Flex } from "antd";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import CertificateABI from "../contracts/CertificateABI.json";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Colors } from "../config/color";
import {
  selectSelectedValidator,
  fetchValidatorById,
} from "../redux/validatorsSlice";
import Loader from "./loader";
import Notifier from "./notifier";

const { Title, Paragraph, Text } = Typography;

const Certificate = (
  { userId, projectName, validatorId, hideDownloadButton = false, onReady },
  ref
) => {
  const dispatch = useDispatch();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [certId, setCertId] = useState(null);
  const certificateRef = useRef(null);
  const validator = useSelector(selectSelectedValidator);
  const colors = Colors();

  const { Authname, designation, companyname, contractAddress } =
    useMemo(() => {
      return {
        Authname: validator?.name || "",
        designation: validator?.designation || "Employee",
        companyname: "Posit Source Technologies Pvt. Ltd.",
        contractAddress: import.meta.env.VITE_contractAddress,
      };
    }, [validator]);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const rpcUrl = import.meta.env.VITE_RPC_URL;
        if (!rpcUrl) {
          Notifier({
            type: "error",
            description: "RPC URL not configured",
            colors,
          });
          return;
        }

        const walletAddress = import.meta.env.VITE_walletAddress;
        if (!walletAddress) {
          Notifier({
            type: "error",
            description: "Wallet address not configured",
            colors,
          });
          return;
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(
          contractAddress,
          CertificateABI,
          provider
        );

        const certs = await contract.getMyCertificates({ from: walletAddress });
        const matched = certs.find(
          (c) =>
            c.userId === userId &&
            c.projectName.toLowerCase() === projectName.toLowerCase()
        );

        if (matched) {
          setCertificate(matched);
          setCertId(matched.certId.toString());
        } else {
          Notifier({
            type: "warning",
            description: "No certificate found please claim.",
            colors,
          });
        }
      } catch (error) {
        console.error("Error fetching certificate:", error);
        Notifier({
          type: "error",
          description: "Failed to fetch certificate",
          colors,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [userId, projectName]);

  useEffect(() => {
    dispatch(fetchValidatorById(validatorId));
  }, [validatorId, dispatch]);

  useEffect(() => {
    if (!loading && certificate && onReady) {
      onReady();
    }
  }, [loading, certificate, onReady]);

  const waitForImages = () => {
    const images = certificateRef.current?.querySelectorAll("img") || [];
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => {
          console.error(`Failed to load image: ${img.src}`);
          resolve();
        };
      });
    });
    return Promise.all(imagePromises);
  };

  const generatePDFBase64 = async () => {
    const input = certificateRef.current;
    if (!input) {
      console.warn("Certificate element not found for PDF generation.");
      return null;
    }

    try {
      await waitForImages();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(input, {
        useCORS: true,
        scale: 4,
        scrollY: -window.scrollY,
        logging: true,
        ignoreElements: (el) => {
          return (
            el.tagName === "SCRIPT" ||
            el.tagName === "LINK" ||
            el.style.display === "none"
          );
        },
        backgroundColor: "#FFFFFF",
        letterRendering: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageAspect = pageWidth / pageHeight;
      const canvasAspect = canvas.width / canvas.height;
      let imgWidth, imgHeight;
      const margin = 10;

      if (canvasAspect > pageAspect) {
        imgWidth = pageWidth - 2 * margin;
        imgHeight = imgWidth / canvasAspect;
      } else {
        imgHeight = pageHeight - 2 * margin;
        imgWidth = imgHeight * canvasAspect;
        if (imgWidth > pageWidth - 2 * margin) {
          imgWidth = pageWidth - 2 * margin;
          imgHeight = imgWidth / canvasAspect;
        }
      }
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight, "MEDIUM");
      const base64 = pdf.output("datauristring").split(",")[1];
      return base64;
    } catch (error) {
      console.error("Error generating PDF:", error);
      return null;
    }
  };

  const downloadPDF = async () => {
    const base64 = await generatePDFBase64();
    if (base64) {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${base64}`;
      link.download = "certificate.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Notifier({
        type: "error",
        description: "Failed to generate PDF for download.",
        colors,
      });
    }
  };

  useImperativeHandle(ref, () => ({
    generatePDFBase64,
  }));

  if (loading) {
    return (
      <Flex vertical align="center" className="!mt-[50px]">
        <Loader isConstrained={true} />
      </Flex>
    );
  }

  if (!certificate) return null;

  return (
    <Space
      direction="vertical"
      size="large"
      style={{ padding: "20px", width: "100%" }}
    >
      <Card
        id="certificate"
        ref={certificateRef}
        className="!border-[10px] !border-[#725fff] !p-5 !max-w-[800px] !mx-auto !bg-white !text-black !shadow-none"
        bordered={false}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Row justify="center" align="middle">
            <Image
              src="/logo.png"
              height={60}
              width={60}
              preview={false}
              className="!mr-[15px]"
            />
            <Title level={1} className="!m-0 !text-[#725fff]">
              PositLearn
            </Title>
          </Row>

          <Row justify="center">
            <Title level={1} className="!text-black">
              Certificate of Completion
            </Title>
          </Row>

          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Paragraph className="!text-center !text-[18px] !text-black">
              This is to certify that
            </Paragraph>

            <Title level={2} className="!text-center !text-[#725fff]">
              {certificate.studentName}
            </Title>

            <Paragraph className="!text-center !text-[18px] !text-black">
              has successfully completed the project titled
            </Paragraph>

            <Title
              level={2}
              className="!text-center !text-[#725fff] !mb-[10px]"
            >
              {certificate.projectName}
            </Title>

            <Paragraph className="!text-center !text-[18px] !text-black">
              demonstrating dedication, technical proficiency, and a commitment
              to learning.
            </Paragraph>

            <Paragraph className="!text-center !text-[18px] !text-black">
              We acknowledge and appreciate the effort put into completing this
              project.
            </Paragraph>

            <Paragraph className="!text-center !text-[16px] !mt-[20px] !text-black">
              Issued on:{" "}
              <Text strong className="!text-black">
                {certificate.issueDate}
              </Text>
            </Paragraph>

            <Flex justify="space-between" align="middle">
              <Col>
                <Flex vertical align="center">
                  <QRCodeSVG
                    value={JSON.stringify({ certId, userId })}
                    size={120}
                  />
                  <Link to="/verify" style={{ textDecoration: "none" }}>
                    <Paragraph className="!text-[14px] !mt-[8px] !text-[#725fff]">
                      Scan to verify
                    </Paragraph>
                  </Link>
                  <Text strong className="!text-[14px] !text-black">
                    Certificate ID: #767480{certId}
                  </Text>
                </Flex>
              </Col>

              <Col>
                <Flex
                  vertical
                  align="center"
                  justify="center"
                  style={{ height: "100%" }}
                >
                  <Image
                    src={validator?.signature || "/signature.png"}
                    alt="Signature"
                    width={120}
                    preview={false}
                  />
                  <Text
                    strong
                    className="!text-[16px] !text-center !text-black"
                  >
                    {Authname}
                  </Text>
                  <Text className="!text-[14px] !text-center !max-w-[200px] !break-words !text-black">
                    {designation}
                  </Text>
                  <Text className="!text-[14px] !text-center !text-black">
                    {companyname}
                  </Text>
                </Flex>
              </Col>
            </Flex>
          </Space>
        </Space>
      </Card>

      {!hideDownloadButton && (
        <Row justify="center" className="!mt-[20px]">
          <Button
            type="primary"
            onClick={downloadPDF}
            style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
          >
            Download Certificate
          </Button>
        </Row>
      )}
    </Space>
  );
};

export default React.forwardRef(Certificate);
