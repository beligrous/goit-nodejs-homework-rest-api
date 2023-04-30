const sgMail = require("@sendgrid/mail");
require("dotenv").config();

const { EMAIL_FROM, SENDGRID_API_KEY } = process.env;

sgMail.setApiKey(SENDGRID_API_KEY);

const sendMail = async (data) => {
  const email = { ...data, from: EMAIL_FROM };
  sgMail.send(email);
  return true;
};

module.exports = sendMail;
