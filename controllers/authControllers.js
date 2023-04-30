const User = require("../models/user");
const { Conflict, Unauthorized, NotFound, BadRequest } = require("http-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Jimp = require("jimp");
const gravatar = require("gravatar");
const fs = require("fs").promises;
const path = require("path");
const { nanoid } = require("nanoid");
require("dotenv").config();
const sendMail = require("../helpers/sendMail");
const { SECRET_KEY, BASE_URL } = process.env;

const avatarDir = path.join(__dirname, "../", "public", "avatars");

const registerUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw new Conflict("Email in use");
    }
    const hashPassword = await bcrypt.hash(password, 12);
    const avatarURL = gravatar.url(email);
    const verificationToken = nanoid();
    const result = await User.create({
      ...req.body,
      password: hashPassword,
      avatarURL,
      verificationToken,
    });
    const verifyMail = {
      to: email,
      text: "click to verify",
      subject: "verification letter",
      html: `<a target="_blank" href="${BASE_URL}/users/verify/${verificationToken}">Click to verify your email</a>`,
    };
    await sendMail(verifyMail);
    res.status(201).json({
      user: {
        email: result.email,
        subscription: result.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

const verify = async (req, res, next) => {
  try {
    const { verificationToken } = req.params;
    const user = await User.findOne({ verificationToken });
    if (!user) {
      throw new NotFound("User not found");
    }
    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: null,
    });
    res.json("Verification successful");
  } catch (error) {
    next(error);
  }
};

const verifyResend = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user.verify) {
      throw new BadRequest("Verification has already been passed");
    }
    const verifyMail = {
      to: email,
      text: "click to verify",
      subject: "verification letter",
      html: `<a target="_blank" href="${BASE_URL}/users/verify/${user.verificationToken}">Click to verify your email</a>`,
    };
    await sendMail(verifyMail);
    res.json("Verification email sent");
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Unauthorized("Email or password is wrong");
    }
    if (!user.verify) {
      throw new Unauthorized("Email not verify");
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw new Unauthorized("Email or password is wrong");
    }
    const payload = { id: user.id };
    const token = jwt.sign(payload, SECRET_KEY);
    await User.findByIdAndUpdate(user._id, { token });
    res.json({
      token,
      user: {
        email: user.email,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCurrent = async (req, res) => {
  try {
    const { email, subscription } = req.user;
    res.json({ email, subscription });
  } catch (error) {
    next(error);
  }
};

const getLogout = async (req, res) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { token: "" });
    res.status(204).json("No Content");
  } catch (error) {
    next(error);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { path: tempUpload, filename } = req.file;
    const avatar = await Jimp.read(tempUpload);
    avatar.resize(250, 250);
    const avatarName = `${_id}_${filename}`;
    const resultUpload = path.join(avatarDir, avatarName);
    avatar.write(resultUpload);
    await fs.unlink(tempUpload);
    const avatarURL = path.join("avatars", avatarName);
    await User.findByIdAndUpdate(_id, { avatarURL });
    res.json({ avatarURL });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  verify,
  verifyResend,
  loginUser,
  getCurrent,
  getLogout,
  updateAvatar,
};
