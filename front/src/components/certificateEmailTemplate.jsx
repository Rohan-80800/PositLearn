const certificateEmailTemplate = ({ name, course, issueDate }) => `
  <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 0; margin: 0;">
        <tr>
            <td>
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 0; padding: 30px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <tr>
                        <td style="padding-bottom: 20px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: middle;">
                                <tr>
                                    <td style="padding-right: 10px; vertical-align: middle;">
                                        <img src="https://positlearnlogo.s3.eu-north-1.amazonaws.com/logo.png" alt="Project Logo" style="max-height: 35px; display: block;" />
                                    </td>
                                    <td style="vertical-align: middle;">
                                        <span style="font-size: 20px; font-weight: bold; color: #725fff;">PositLearn</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style=" color: #725fff; font-size: 18px; font-weight: 600; padding-bottom: 15px;">
                            Congratulations on Your Certificate!
                        </td>
                    </tr>
                    <tr>
                        <td style="color: #333333; font-size: 16px; font-weight: 400; line-height: 1.6;">
                            <p>Dear <strong>${name}</strong>,</p>
                            <p>We are thrilled to inform you that you have successfully completed the project <strong>${course}</strong> and earned your certificate!</p>
                            <p style="margin: 0;"><strong> Certificate Details:</strong></p>
                            <div style="background-color: #f9f9f9; border-left: 4px solid #725fff; padding: 15px; margin: 20px 0; font-weight: 400;">
                                <p style="margin: 0;"><span style="font-weight: 600;">Recipient :</span> ${name}</p>
                                <p style="margin: 0;"><span style="font-weight: 600;">Project :</span> ${course}</p>
                                <p style="margin: 0;"><span style="font-weight: 600;">Completion Date :</span> ${issueDate}</p>
                            </div>
                            <p>You can view or download your certificate directly from the PositLearn platform.</p>
                            <p>The certificate is also attached to this email for your convenience.</p>
                            <p style="color: #725fff; font-weight: 400;"><strong>Thank you for your dedication and hard work!</strong></p>
                            <p>Best regards,<br /><strong>The PositLearn Team</strong></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  </body>
`;

export default certificateEmailTemplate;
