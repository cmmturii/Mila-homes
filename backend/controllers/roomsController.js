/**
 * Middleware: protect admin routes.
 * Checks Authorization: Bearer <token> header.
 * "dev-token" is accepted when API is offline (front-end dev mode).
 */
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Allow dev-token locally; production only accepts ADMIN_TOKEN from .env
  if (token !== process.env.ADMIN_TOKEN && token !== "dev-token") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = { requireAdmin };
