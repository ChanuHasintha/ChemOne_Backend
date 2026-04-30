import sgMail from "@sendgrid/mail";

export const getTransporter = async () => {
  const apiKey = (process.env.SENDGRID_API_KEY || "").trim();
  const fromEmail = (process.env.SENDGRID_FROM || "").trim();
  
  if (!apiKey || apiKey.includes("your_api_key")) {
    console.warn("⚠️ SENDGRID_API_KEY is missing!");
  }

  sgMail.setApiKey(apiKey);

  return {
    sendMail: async (mailOptions) => {
      const { to, subject, html, text } = mailOptions;

      const msg = {
        to: to,
        from: {
          email: fromEmail || 'chemashan2001@gmail.com',
          name: "ChemBridge"
        },
        subject: subject,
        text: text || (html ? html.replace(/<[^>]*>/g, '') : "OTP Code"),
        html: html,
      };

      try {
        await sgMail.send(msg);
        console.log(`✅ Email sent successfully to: ${to}`);
      } catch (error) {
        console.error("❌ SENDGRID ERROR:");
        if (error.response && error.response.body) {
          console.error(JSON.stringify(error.response.body, null, 2));
        } else {
          console.error(error.message);
        }
        throw error;
      }
    },
  };
};
