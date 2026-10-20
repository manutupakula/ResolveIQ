
const express = require("express");
const { pool } = require("../config/database");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

// Every endpoint in this file is restricted to managers.
router.use((req, res, next) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({
      message: "Only managers can manage users.",
    });
  }

  next();
});

// List registered users without exposing password hashes.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, is_active
       FROM users
       ORDER BY id ASC`
    );

    return res.json({ users: result.rows });
  } catch (error) {
    console.error("List users error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve users.",
    });
  }
});

// Change a user's role to reporter or resolver.
// Manager promotion is intentionally not allowed through this endpoint.
router.patch("/:id/role", async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!["reporter", "resolver"].includes(role)) {
    return res.status(400).json({
      message: "Role must be reporter or resolver.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
         AND is_active = TRUE
       RETURNING id, full_name, email, role, is_active`,
      [role, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Active user not found.",
      });
    }

    return res.json({
      message: "User role updated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Update user role error:", error.message);

    return res.status(500).json({
      message: "Unable to update user role.",
    });
  }
});

module.exports = router;
