
const express = require("express");
const { pool } = require("../config/database");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// Helper: check whether a user can access an exception
async function canAccessException(exceptionId, user) {
  const result = await pool.query(
    `SELECT reporter_id, assignee_id
     FROM exceptions
     WHERE id = $1`,
    [exceptionId]
  );

  if (result.rowCount === 0) {
    return { exists: false, allowed: false };
  }

  const exception = result.rows[0];

  const allowed =
    user.role === "manager" ||
    String(exception.reporter_id) === String(user.id) ||
    (user.role === "resolver" &&
      String(exception.assignee_id) === String(user.id));

  return { exists: true, allowed };
}

// List comments on an exception
router.get("/:exceptionId/comments", authenticate, async (req, res) => {
  try {
    const { exceptionId } = req.params;

    if (!/^[1-9]\d*$/.test(exceptionId)) {
      return res.status(400).json({ message: "Invalid exception ID." });
    }

    const access = await canAccessException(exceptionId, req.user);

    if (!access.exists) {
      return res.status(404).json({ message: "Exception not found." });
    }

    if (!access.allowed) {
      return res.status(403).json({ message: "Access denied." });
    }

    const result = await pool.query(
      `SELECT c.id, c.exception_id, c.author_id, c.body, c.created_at,
              u.full_name AS author_name
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.exception_id = $1
       ORDER BY c.created_at ASC`,
      [exceptionId]
    );

    res.json({ count: result.rowCount, comments: result.rows });
  } catch (error) {
    console.error("List comments error:", error.message);
    res.status(500).json({ message: "Unable to retrieve comments." });
  }
});

// Add a comment
router.post("/:exceptionId/comments", authenticate, async (req, res) => {
  try {
    const { exceptionId } = req.params;
    const { body } = req.body;

    if (!/^[1-9]\d*$/.test(exceptionId)) {
      return res.status(400).json({ message: "Invalid exception ID." });
    }

    if (
      typeof body !== "string" ||
      !body.trim() ||
      body.trim().length > 5000
    ) {
      return res.status(400).json({
        message: "Comment must contain 1–5000 characters.",
      });
    }

    const access = await canAccessException(exceptionId, req.user);

    if (!access.exists) {
      return res.status(404).json({ message: "Exception not found." });
    }

    if (!access.allowed) {
      return res.status(403).json({ message: "Access denied." });
    }

    const result = await pool.query(
      `INSERT INTO comments (exception_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, exception_id, author_id, body, created_at`,
      [exceptionId, req.user.id, body.trim()]
    );

    res.status(201).json({
      message: "Comment added successfully.",
      comment: result.rows[0],
    });
  } catch (error) {
    console.error("Add comment error:", error.message);
    res.status(500).json({ message: "Unable to add comment." });
  }
});

module.exports = router;
