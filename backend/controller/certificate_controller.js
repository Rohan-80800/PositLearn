import prisma from "../DB/db.config.js";
import {
  uploadToStorage,
  getFileUrl,
  deleteFromStorage,
} from "./s3_controller.js";
import nodemailer from "nodemailer";
import { Buffer } from "buffer";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendCertificateEmail = async (req, res) => {
  try {
    const { clerk_id } = req.params;
    const { email, subject, content, attachment, projectId, APP_NAME } =
      req.body;

    const user = await prisma.users.findUnique({ where: { clerk_id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const progressData = user.progress_percentage || {};
    if (progressData[projectId]?.emailSent) {
      return res
        .status(200)
        .json({ message: "Certificate email already sent" });
    }

    const mailOptions = {
      from: {
        name: APP_NAME,
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: subject,
      html: content,
    };

    if (attachment && attachment.filename && attachment.content) {
      mailOptions.attachments = [
        {
          filename: attachment.filename,
          content: Buffer.from(attachment.content, "base64"),
          encoding: "base64",
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    progressData[projectId] = {
      progress: progressData[projectId]?.progress || 0,
      emailSent: true,
    };

    await prisma.users.update({
      where: { clerk_id },
      data: { progress_percentage: progressData },
    });

    return res
      .status(200)
      .json({ message: "Certificate email sent successfully" });
  } catch (error) {
    console.error("Error sending certificate email:", error);
    return res
      .status(500)
      .json({ message: "Failed to send certificate email" });
  }
};

export const getPDFBase64 = async (req, res) => {
  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({ error: "PDF URL is required" });
    }

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch PDF" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    return res.status(200).json({ base64 });
  } catch (err) {
    console.error("Error converting PDF to base64:", err);
    return res.status(500).json({ error: "Conversion failed" });
  }
};

export const generateCertificate = async ({
  studentName,
  projectName,
  issueDate,
  certificateId,
  userId,
  authName,
  designation,
  signaturePath,
}) => {
  const logoPath = path.join(__dirname, "..", "assets", "logo.png");
  const buffers = [];
  const doc = new PDFDocument({
    size: [595, 850],
    margins: { top: 110, bottom: 110, left: 30, right: 30 },
  });

  doc.on("data", (chunk) => buffers.push(chunk));
  doc.on("end", () => {});

  doc.font("Helvetica");

  doc.lineWidth(7).strokeColor("#725fff").rect(30, 110, 535, 630).stroke();

  try {
    const logoBuffer = fs.readFileSync(logoPath);
    doc.image(logoBuffer, 287.5 - 80, 160, { width: 40, height: 40 });
  } catch (error) {
    console.error("Error loading logo:", error);
  }
  doc
    .fillColor("#725fff")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("PositLearn", 287.5 - 40, 172, { align: "left" });

  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("Certificate of Completion", 30, 230, {
      align: "center",
      width: 535,
    });

  doc
    .fillColor("#000000")
    .font("Helvetica")
    .fontSize(13)
    .text("This is to certify that", 30, 280, { align: "center", width: 535 });

  doc
    .fillColor("#725fff")
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(studentName, 30, 320, { align: "center", width: 535 });

  doc
    .fillColor("#000000")
    .font("Helvetica")
    .fontSize(13)
    .text("has successfully completed the project titled", 30, 360, {
      align: "center",
      width: 535,
    });

  doc
    .fillColor("#725fff")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(projectName, 30, 400, { align: "center", width: 535 });

  doc
    .fillColor("#000000")
    .font("Helvetica")
    .fontSize(13)
    .text(
      "demonstrating dedication, technical proficiency, and a commitment to learning.",
      70,
      440,
      {
        align: "center",
        width: 455,
      }
    );

  doc
    .font("Helvetica")
    .fontSize(13)
    .text(
      "We acknowledge and appreciate the effort put into completing this project.",
      70,
      470,
      {
        align: "center",
        width: 455,
      }
    );

  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`Issued on: ${issueDate}`, 30, 510, {
      align: "center",
      width: 535,
    });

  const qrData = JSON.stringify({ certId: certificateId, userId });

  const qrBuffer = await QRCode.toBuffer(qrData, {
    width: 200,
    errorCorrectionLevel: "H",
    type: "png",
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  doc.image(qrBuffer, 75, 550, { width: 100 });
  doc
    .fillColor("#1677ff")
    .font("Helvetica")
    .fontSize(10)
    .text("Scan to verify", 75, 660, { align: "center", width: 100 });
  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`Certificate ID - #767480${certificateId}`, 60, 685, {
      align: "left",
      width: 300,
    });

  try {
    const fallbackPath = path.join(__dirname, "..", "assets", "signature.png");
    if (signaturePath?.startsWith("data:image/")) {
      const base64Data = signaturePath.split(",")[1];
      const signatureBuffer = Buffer.from(base64Data, "base64");
      doc.image(signatureBuffer, 435, 580, { width: 80 });
    } else {
      if (fs.existsSync(fallbackPath)) {
        doc.image(fallbackPath, 435, 580, { width: 80 });
      } else {
        console.warn("Fallback signature image not found at:", fallbackPath);
      }
    }
  } catch (error) {
    console.error("Error loading signature:", error);
  }

  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(authName, 435, 625, { align: "center", width: 80 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(designation, 435, 645, { align: "center", width: 80 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Posit Source Technologies Pvt. Ltd.", 400, 660, {
      align: "left", 
      width: 200, 
    });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
};

export const shareCertificate = async (req, res) => {
  try {
    const { certificateId, userId, projectId, issueDate, name, course } =
      req.body;

    if (!certificateId || !userId || !projectId || !issueDate) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: certificateId, userId, projectId or issueDate",
      });
    }
    const user = await prisma.users.findUnique({
      where: { clerk_id: userId },
      select: { clerk_id: true, certificates: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const project = await prisma.projects.findUnique({
      where: { id: parseInt(projectId) },
      select: {
        validator: {
          select: {
            name: true,
            designation: true,
            signature: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const base64Signature =
      project?.validator?.signature?.split(",")[1] || null;

    const signaturePath = base64Signature
      ? `data:image/png;base64,${base64Signature}`
      : null;

    const pdfBuffer = await generateCertificate({
      studentName: name,
      projectName: course,
      issueDate,
      certificateId,
      userId,
      authName: project?.validator?.name || "",
      signaturePath: signaturePath,
      designation: project?.validator?.designation || "Employee",
    });

    const fileName = `${certificateId}.pdf`;
    const s3Key = await uploadToStorage(
      pdfBuffer,
      fileName,
      "certificates",
      "application/pdf"
    );

    const pdfUrl = await getFileUrl(s3Key);
    if (!pdfUrl) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate URL for uploaded PDF",
      });
    }

    const certificates = user.certificates || {};
    if (certificates[projectId] && certificates[projectId].certificate) {
      await deleteFromStorage(certificates[projectId].certificate);
    }

    certificates[projectId] = {
      issuedDate: issueDate,
      certificate: s3Key,
      cert_id: certificateId,
    };

    await prisma.users.update({
      where: { clerk_id: userId },
      data: {
        certificates: certificates,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Certificate generated and saved successfully",
      data: pdfUrl,
    });
  } catch (error) {
    console.error("Error in shareCertificate:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating or uploading certificate",
      error: error.message,
    });
  }
};

export const get_certificate = async (req, res) => {
  try {
    const userId = req.auth().userId;

    const user = await prisma.users.findFirst({
      where: { clerk_id: userId },
      select: { clerk_id: true, certificates: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.certificates || Object.keys(user.certificates).length === 0) {
      return res.status(200).json({
        success: true,
        message: "No certificates found for this user",
        certificates: [],
      });
    }

    const projectIds = Object.keys(user.certificates)
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));

    const projects = await prisma.projects.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        project_name: true,
        validator_id: true,
      },
    });

    const projectNameMap = projects.reduce((map, project) => {
      map[project.id.toString()] = {
        name: project.project_name,
        validatorId: project.validator_id,
      };
      return map;
    }, {});

    const certificateData = await Promise.all(
      Object.entries(user.certificates).map(async ([projectId, cert]) => {
        const s3Url = await getFileUrl(cert.certificate);
        return {
          projectId,
          projectName: projectNameMap[projectId]?.name,
          issueDate: cert.issuedDate,
          pdfUrl: s3Url || null,
          certificateId: cert.cert_id,
          validatorId: projectNameMap[projectId]?.validatorId,
          userId,
        };
      })
    );

    const validCertificates = certificateData.filter((cert) => cert.pdfUrl);

    if (validCertificates.length === 0 && certificateData.length > 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate URLs for all certificates",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Certificates retrieved successfully",
      certificates: validCertificates,
    });
  } catch (error) {
    console.error("Error in get_certificate:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving certificates",
      error: error.message,
    });
  }
};
