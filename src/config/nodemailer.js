import { Resend } from "resend";

/**
 * Returns an object that mimics the nodemailer transporter's sendMail method
 * but uses Resend internally. This minimizes changes needed in controllers.
 */
export const getTransporter = async () => {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey || apiKey === "re_your_api_key_here") {
    console.warn("⚠️ RESEND_API_KEY is not set or using placeholder. Emails will not be sent.");
  }

  const resend = new Resend(apiKey);

  return {
    sendMail: async (mailOptions) => {
      const { from, to, subject, html, text } = mailOptions;
      
      // Resend requires a verified domain in production. 
      // For development, you can use 'onboarding@resend.dev' but can only send to your own email.
      const fromEmail = process.env.RESEND_FROM || from || 'onboarding@resend.dev';

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html || text,
        text: text || "",
      });

      if (error) {
        console.error("❌ Resend Error:", error);
        throw error;
      }

      return data;
    },
  };
};
