import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(userId), // <-- becomes payload.sub
    expiresIn: "30d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict", // <--- allows browser to send cookie on same-origin & localhost
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export default generateToken;
