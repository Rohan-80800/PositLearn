import express from "express";
import {
  sendCertificateEmail,
  shareCertificate,
  get_certificate,
  getPDFBase64,
} from "../controller/certificate_controller.js";
import { requirePermission } from "../middleware.js";

const router = express.Router();

router.post("/send-certificate-email/:clerk_id",requirePermission("send_certificate_email"), sendCertificateEmail);
router.post("/share_certificate",requirePermission("share_certificate"),shareCertificate);
router.post("/get_certificate",requirePermission("share_certificate"),get_certificate)
router.post("/get-pdf-base64",requirePermission("share_certificate"),getPDFBase64)

export default router;
