function login(req, res) {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    return res.json({ token: process.env.ADMIN_TOKEN });
  }
  res.status(401).json({ error: "Invalid email or password" });
}
module.exports = { login };