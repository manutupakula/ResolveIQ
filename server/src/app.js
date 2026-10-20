
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const authenticate = require("./middleware/authenticate");
const exceptionRoutes = require("./routes/exceptions.routes");
const commentsRoutes = require("./routes/comments.routes");
const historyRoutes = require("./routes/history.routes");
const usersRoutes = require("./routes/users.routes");

const app = express();

app.use(helmet());

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174"
  ],
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({
    message: "Authenticated successfully.",
    user: req.user,
  });
});

app.use("/api/exceptions", exceptionRoutes);
app.use("/api/exceptions", commentsRoutes);
app.use("/api/exceptions", historyRoutes);
app.use("/api/users", usersRoutes);

module.exports = app;
