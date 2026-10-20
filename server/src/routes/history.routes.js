
const express = require("express");
const { pool } = require("../config/database");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.get("/:exceptionId/history", authenticate, async (req, res) => {
  try {
    const { exceptionId } = req.params;

    if (!/^[1-9]\d*$/.test(exceptionId)) {
      return res.status(400).json({ message: "Invalid exception ID." });
    }

    const accessResult = await pool.query(
      `SELECT reporter_id, assignee_id
       FROM exceptions
       WHERE id = $1`,
      [exceptionId]
    );

    if (accessResult.rowCount === 0) {
      return res.status(404).json({ message: "Exception not found." });
    }

    const exception = accessResult.rows[0];

    const allowed =
      req.user.role === "manager" ||
      String(exception.reporter_id) === String(req.user.id) ||
      (req.user.role === "resolver" &&
        String(exception.assignee_id) === String(req.user.id));

    if (!allowed) {
      return res.status(403).json({ message: "Access denied." });
    }

    const result = await pool.query(
      `SELECT a.id, a.exception_id, a.actor_id, a.action,
              a.field_name, a.old_value, a.new_value,
              a.metadata, a.created_at,
              u.full_name AS actor_name
       FROM audit_events a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.exception_id = $1
       ORDER BY a.created_at DESC`,
      [exceptionId]
    );

    res.json({ count: result.rowCount, history: result.rows });
  } catch (error) {
    console.error("Get history error:", error.message);
    res.status(500).json({ message: "Unable to retrieve activity history." });
  }
});

module.exports = router;
