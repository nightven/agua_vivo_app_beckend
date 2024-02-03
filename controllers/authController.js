const {
  findUserByEmail,
  userCollection,
  updateUserById,
  findUserByIdAndUpdate,
} = require("../db/services/authService");
const { httpError, sendEmail, ctrlWrapper } = require("../helpers");
const gravatar = require("gravatar");
const { nanoid } = require("nanoid");
const jwt = require("jsonwebtoken");

const { SECRET_KEY, BACK_END } = process.env;

const register = async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail({ email });

  if (user) {
    throw httpError(409, "Email in use");
  }

  const avatar = gravatar.url(email);
  const verificationToken = nanoid();
  const newUser = userCollection({ ...req.body, avatar, verificationToken });

  const verifyEmail = {
    to: email,
    subject: "Verify email",
    html: `<a target="_blank" href="http://localhost:8000/auth/verify/${verificationToken}">Click verify email</a>`,
  };

  await sendEmail(verifyEmail);

  await newUser.hashPassword();
  await newUser.save();

  const payload = {
    id: newUser._id,
  };

  const token = jwt.sign(payload, SECRET_KEY);

  await updateUserById(newUser._id, { token });

  res.status(201).json({
    token,
    user: {
      email,
      avatar,
      gender: newUser.gender,
      dailyNorma: newUser.dailyNorma,
      verificationToken,
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail({ email });

  if (!user) {
    throw httpError(401, "Email or password is wrong");
  }

  if (!user.verify) {
    throw httpError(401, "Email not verified");
  }

  const comparePasswords = await user.comparePassword(password);
  if (!comparePasswords) {
    throw httpError(401, "Email or password is wrong");
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY);

  await updateUserById(user._id, { token });

  res.json({
    token,
    user: {
      name: user.name,
      email,
      avatar: user.avatar,
      gender: user.gender,
      dailyNorma: user.dailyNorma,
    },
  });
};

const current = (req, res) => {
  const { name, email, avatar, gender, dailyNorma } = req.user;
  res.json({ name, email, avatar, gender, dailyNorma });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  updateUserById(_id, { token: "" });

  res.sendStatus(204);
};

const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await findUserByEmail({ verificationToken });
  if (!user) throw httpError(404);

  await findUserByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: null,
  });

  res.redirect(`http://localhost:5173/agua_vivo_app/signin`);
};

const resendVerifyEmail = async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail({ email });
  if (!user) {
    throw httpError(404, "Email not found");
  }
  if (user.verify) {
    throw httpError(400, "Verification has already been passed");
  }

  const verifyEmail = {
    to: email,
    subject: "Verify email",
    html: `<a target="_blank" href="http://localhost:8000/auth/verify/${user.verificationToken}">Click verify email</a>`,
  };

  await sendEmail(verifyEmail);

  res.json({
    message: "Verification email sent",
  });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail({ email });
  if (!user) {
    throw httpError(404);
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY);

  const newEmail = {
    to: email,
    subject: "Reset Password",
    html: `<a target="_blank" href="http://localhost:5173/agua_vivo_app/reset-password/${user._id}/${token}">Reset Password</a>`,
  };

  await sendEmail(newEmail);

  res.json({
    message: "Reset password sent",
  });
};

const resetPassword = async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  jwt.verify(token, SECRET_KEY, (error, decoded) => {
    if (error) {
      throw httpError(400, "token error");
    } else {
      bcrypt.hash(password, 10).then(async (hash) => {
        await updateUserById({ _id: id }, { password: hash }).then(() =>
          res.send("Success")
        );
      });
    }
  });
};

module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  current: ctrlWrapper(current),
  logout: ctrlWrapper(logout),
  forgotPassword: ctrlWrapper(forgotPassword),
  resetPassword: ctrlWrapper(resetPassword),
  verifyEmail: ctrlWrapper(verifyEmail),
  resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
};
