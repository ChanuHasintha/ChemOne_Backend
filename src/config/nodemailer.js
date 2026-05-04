import { google } from "googleapis";

const createGmailClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
};

// Encode a raw MIME message to base64url format required by Gmail API
const buildRawMessage = ({ from, to, subject, html, text }) => {
  const isHtml = !!html;
  const contentType = isHtml ? "text/html" : "text/plain";
  const body = html || text || "";

  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: ${contentType}; charset=utf-8`,
    "",
    body,
  ];

  const raw = messageParts.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const getTransporter = async () => {
  const gmailUser = (process.env.GMAIL_USER || "").trim();

  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    console.warn("⚠️ Gmail API credentials (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN) are missing!");
  }

  const gmail = createGmailClient();

  return {
    sendMail: async (mailOptions) => {
      const { to, subject, html, text } = mailOptions;

      const raw = buildRawMessage({
        from: `"ChemBridge" <${gmailUser}>`,
        to,
        subject,
        html,
        text,
      });

      try {
        const res = await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw },
        });
        console.log(`✅ Email sent via Gmail API to: ${to} [id: ${res.data.id}]`);
      } catch (error) {
        console.error("❌ GMAIL API ERROR:", error.message);
        if (error.response?.data) {
          console.error(JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    },
  };
};
