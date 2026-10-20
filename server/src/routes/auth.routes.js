
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Provide a name, valid email, and password of at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    // Public registration must not allow privilege escalation.
    // New accounts always start as reporters.
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'reporter')
       RETURNING id, full_name, email, role, created_at`,
      [normalizedName, normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Account created successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({ message: "Unable to create account." });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Session/token handling will be added in the next step.
 
    console.log("JWT_SECRET loaded:", Boolean(process.env.JWT_SECRET));
console.log("JWT_SECRET length:", process.env.JWT_SECRET?.length || 0);
    const token = jwt.sign(
      {
        sub: String(user.id),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Unable to log in." });
  }
});

module.exports = router;
