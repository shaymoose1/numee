const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, treatment, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await resend.emails.send({
      from: 'Nu-Mee Clinic <onboarding@resend.dev>',
      to: 'shaymuscampbell@gmail.com',
      reply_to: email,
      subject: 'New Enquiry - Nu-Mee Clinic',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#E8196A;">New Enquiry - Nu-Mee Clinic</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#888;width:160px;">Name</td><td style="padding:10px;border-bottom:1px solid #eee;">${name}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#888;">Email</td><td style="padding:10px;border-bottom:1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#888;">Phone</td><td style="padding:10px;border-bottom:1px solid #eee;">${phone || 'Not provided'}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#888;">Treatment</td><td style="padding:10px;border-bottom:1px solid #eee;">${treatment || 'Not specified'}</td></tr>
            <tr><td style="padding:10px;color:#888;vertical-align:top;">Message</td><td style="padding:10px;">${message.replace(/\n/g, '<br>')}</td></tr>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#aaa;">Sent from numeeclinic.com.au enquiry form</p>
        </div>
      `
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
