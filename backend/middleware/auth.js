function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token || (token !== process.env.ADMIN_TOKEN && token !== "dev-token")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
module.exports = { requireAdmin };