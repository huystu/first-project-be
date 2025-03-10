import jwt from "jsonwebtoken";
const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
};
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export { signToken, verifyToken };
