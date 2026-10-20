const express = require("express");
const crypto = require("crypto");
const { pool } = require("../config/database");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// List exceptions.
// Managers and reporters can see all exceptions.
// Resolvers can see exceptions they reported or are assigned.
router.get("/", authenticate, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === "manager" || req.user.role === "reporter") {
      query = `
        SELECT
          e.*,
          reporter.full_name AS reporter_name,
          assignee.full_name AS assignee_name
        FROM exceptions e
        JOIN users reporter ON reporter.id = e.reporter_id
        LEFT JOIN users assignee ON assignee.id = e.assignee_id
        ORDER BY e.created_at DESC
      `;
    } else if (req.user.role === "resolver") {
      query = `
        SELECT
          e.*,
          reporter.full_name AS reporter_name,
          assignee.full_name AS assignee_name
        FROM exceptions e
        JOIN users reporter ON reporter.id = e.reporter_id
        LEFT JOIN users assignee ON assignee.id = e.assignee_id
        WHERE e.reporter_id = $1 OR e.assignee_id = $1
        ORDER BY e.created_at DESC
      `;
      params = [req.user.id];
    } else {
      return res.status(403).json({
        message: "You do not have permission to view exceptions.",
      });
    }

    const result = await pool.query(query, params);

    return res.json({
      count: result.rowCount,
      exceptions: result.rows,
    });
  } catch (error) {
    console.error("List exceptions error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve exceptions.",
    });
  }
});

// Create a new exception
router.post("/", authenticate, async (req, res) => {
  try {
    const { title, description, category, priority, dueDate } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200 ||
      typeof description !== "string" ||
      !description.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      category.trim().length > 80
    ) {
      return res.status(400).json({
        message:
          "Provide a title, description, and category within the allowed lengths.",
      });
    }

    const allowedPriorities = ["Low", "Medium", "High", "Critical"];
    const selectedPriority = priority || "Medium";

    if (!allowedPriorities.includes(selectedPriority)) {
      return res.status(400).json({
        message: "Invalid priority.",
      });
    }

    let parsedDueDate = null;

    if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
      if (
        typeof dueDate !== "string" ||
        !Number.isFinite(Date.parse(dueDate))
      ) {
        return res.status(400).json({
          message: "Invalid due date.",
        });
      }

      parsedDueDate = new Date(dueDate);

      if (!Number.isFinite(parsedDueDate.getTime())) {
        return res.status(400).json({
          message: "Invalid due date.",
        });
      }
    }

    const exceptionNumber =
      `EXC-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const result = await pool.query(
      `INSERT INTO exceptions
        (
          exception_number,
          title,
          description,
          category,
          priority,
          reporter_id,
          due_date
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        exceptionNumber,
        title.trim(),
        description.trim(),
        category.trim(),
        selectedPriority,
        req.user.id,
        parsedDueDate,
      ]
    );

    return res.status(201).json({
      message: "Exception created successfully.",
      exception: result.rows[0],
    });
  } catch (error) {
    console.error("Create exception error:", error.message);

    return res.status(500).json({
      message: "Unable to create exception.",
    });
  }
});

// Get one exception by ID.
// Reporters can view every exception.
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid exception ID.",
      });
    }

    const result = await pool.query(
      `SELECT
         e.*,
         reporter.full_name AS reporter_name,
         reporter.email AS reporter_email,
         assignee.full_name AS assignee_name,
         assignee.email AS assignee_email
       FROM exceptions e
       JOIN users reporter ON reporter.id = e.reporter_id
       LEFT JOIN users assignee ON assignee.id = e.assignee_id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Exception not found.",
      });
    }

    const exception = result.rows[0];

    const isManager = req.user.role === "manager";
    const isReporter = req.user.role === "reporter";
    const isAssignee =
      String(exception.assignee_id) === String(req.user.id);
    const isOriginalReporter =
      String(exception.reporter_id) === String(req.user.id);

    if (
      !isManager &&
      !isReporter &&
      !(req.user.role === "resolver" &&
        (isAssignee || isOriginalReporter))
    ) {
      return res.status(403).json({
        message: "You do not have permission to view this exception.",
      });
    }

    return res.json({ exception });
  } catch (error) {
    console.error("Get exception error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve exception.",
    });
  }
});

// Update an exception and record activity history.
// Managers can assign and change priority/deadline.
// Assigned resolvers can update status.
// Reporters cannot assign issues or change status.
router.patch("/:id", authenticate, async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid exception ID.",
      });
    }

    const allowedFields = [
      "status",
      "priority",
      "assigneeId",
      "dueDate",
      "resolutionNotes",
    ];

    const suppliedFields = Object.keys(req.body);

    if (
      suppliedFields.length === 0 ||
      suppliedFields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        message: "Provide valid fields to update.",
        allowedFields,
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const currentResult = await client.query(
      "SELECT * FROM exceptions WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        message: "Exception not found.",
      });
    }

    const current = currentResult.rows[0];
    const isManager = req.user.role === "manager";
    const isReporter =
      String(current.reporter_id) === String(req.user.id);
    const isAssignee =
      String(current.assignee_id) === String(req.user.id);
    const isResolver = req.user.role === "resolver";

    if (
      !isManager &&
      !isReporter &&
      !(isResolver && isAssignee)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(403).json({
        message: "You do not have permission to update this exception.",
      });
    }

    if ("assigneeId" in req.body && !isManager) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(403).json({
        message: "Only managers can assign exceptions.",
      });
    }

    if (
      ("priority" in req.body || "dueDate" in req.body) &&
      !isManager
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(403).json({
        message: "Only managers can change priority or due date.",
      });
    }

    if (
      "status" in req.body &&
      !isManager &&
      !(isResolver && isAssignee)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(403).json({
        message:
          "Only the assigned resolver or a manager can change status.",
      });
    }

    const updates = {};

    if ("priority" in req.body) {
      if (
        !["Low", "Medium", "High", "Critical"].includes(
          req.body.priority
        )
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message: "Invalid priority.",
        });
      }

      updates.priority = req.body.priority;
    }

    if ("assigneeId" in req.body) {
      const value = req.body.assigneeId;

      if (
        value !== null &&
        !/^[1-9]\d*$/.test(String(value))
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message: "assigneeId must be a valid user ID or null.",
        });
      }

      if (value !== null) {
        const assignee = await client.query(
          `SELECT id
           FROM users
           WHERE id = $1
             AND role = 'resolver'
             AND is_active = TRUE`,
          [value]
        );

        if (assignee.rowCount === 0) {
          await client.query("ROLLBACK");
          transactionStarted = false;

          return res.status(400).json({
            message: "Assignee must be an active resolver.",
          });
        }
      }

      updates.assignee_id = value;
    }

    if ("dueDate" in req.body) {
      const value = req.body.dueDate;

      if (value === null || value === "") {
        updates.due_date = null;
      } else if (
        typeof value !== "string" ||
        !Number.isFinite(Date.parse(value))
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message: "Invalid due date.",
        });
      } else {
        updates.due_date = new Date(value);
      }
    }

    if ("resolutionNotes" in req.body) {
      const value = req.body.resolutionNotes;

      if (value !== null && typeof value !== "string") {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message: "Resolution notes must be text or null.",
        });
      }

      updates.resolution_notes =
        value === null ? null : value.trim();
    }

    if ("status" in req.body) {
      const nextStatus = req.body.status;

      const transitions = {
        Open: ["In Progress", "Blocked"],
        "In Progress": ["Blocked", "Resolved"],
        Blocked: ["In Progress"],
        Resolved: ["Closed"],
        Closed: [],
      };

      if (
        !Object.prototype.hasOwnProperty.call(
          transitions,
          current.status
        )
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message: "Current status is invalid.",
        });
      }

      const reopening = ["Resolved", "Closed"].includes(
        current.status
      );

      if (
        !["Open", "In Progress", "Blocked", "Resolved", "Closed"].includes(
          nextStatus
        ) ||
        (
          !transitions[current.status].includes(nextStatus) &&
          !(isManager &&
            reopening &&
            ["Open", "In Progress"].includes(nextStatus))
        )
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message: "Invalid status transition.",
          currentStatus: current.status,
          requestedStatus: nextStatus,
        });
      }

      if (
        nextStatus === "Resolved" &&
        !(
          typeof req.body.resolutionNotes === "string" &&
          req.body.resolutionNotes.trim()
        ) &&
        !current.resolution_notes
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message:
            "Resolution notes are required to resolve an exception.",
        });
      }

      updates.status = nextStatus;
    }

    if (Object.keys(updates).length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: "No valid changes provided.",
      });
    }

    updates.updated_at = new Date();

    if (updates.status === "Resolved") {
      updates.resolved_at = new Date();
    } else if (
      updates.status &&
      updates.status !== "Closed"
    ) {
      updates.resolved_at = null;
    }

    const columns = Object.keys(updates);
    const values = Object.values(updates);

    const assignments = columns.map(
      (column, index) => `${column} = $${index + 1}`
    );

    const updateResult = await client.query(
      `UPDATE exceptions
       SET ${assignments.join(", ")}
       WHERE id = $${values.length + 1}
       RETURNING *`,
      [...values, id]
    );

    const updated = updateResult.rows[0];

    // Record who changed each field, including who resolved an issue.
    for (const column of columns) {
      if (column === "updated_at") continue;

      const oldValue = current[column] ?? null;
      const newValue = updated[column] ?? null;

      if (
        String(oldValue ?? "") ===
        String(newValue ?? "")
      ) {
        continue;
      }

      await client.query(
        `INSERT INTO audit_events
          (
            exception_id,
            actor_id,
            action,
            field_name,
            old_value,
            new_value
          )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          req.user.id,
          `${column}_updated`,
          column,
          oldValue === null ? null : String(oldValue),
          newValue === null ? null : String(newValue),
        ]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      message: "Exception updated successfully.",
      exception: updated,
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Update exception error:", error.message);

    return res.status(500).json({
      message: "Unable to update exception.",
    });
  } finally {
    client.release();
  }
});

// Get activity history.
// Reporters can view history for all exceptions.
router.get("/:id/history", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: "Invalid exception ID.",
      });
    }

    const exceptionResult = await pool.query(
      `SELECT reporter_id, assignee_id
       FROM exceptions
       WHERE id = $1`,
      [id]
    );

    if (exceptionResult.rowCount === 0) {
      return res.status(404).json({
        message: "Exception not found.",
      });
    }

    const exception = exceptionResult.rows[0];

    const isManager = req.user.role === "manager";
    const isReporter = req.user.role === "reporter";
    const isOriginalReporter =
      String(exception.reporter_id) === String(req.user.id);
    const isAssignee =
      String(exception.assignee_id) === String(req.user.id);

    if (
      !isManager &&
      !isReporter &&
      !(req.user.role === "resolver" &&
        (isOriginalReporter || isAssignee))
    ) {
      return res.status(403).json({
        message: "You do not have permission to view this history.",
      });
    }

    const historyResult = await pool.query(
      `SELECT
         ae.*,
         actor.full_name AS actor_name,
         old_assignee.full_name AS old_assignee_name,
         new_assignee.full_name AS new_assignee_name
       FROM audit_events ae
       LEFT JOIN users actor
         ON actor.id = ae.actor_id
       LEFT JOIN users old_assignee
         ON ae.field_name = 'assignee_id'
         AND old_assignee.id::text = ae.old_value
       LEFT JOIN users new_assignee
         ON ae.field_name = 'assignee_id'
         AND new_assignee.id::text = ae.new_value
       WHERE ae.exception_id = $1
       ORDER BY ae.created_at DESC`,
      [id]
    );

    return res.json({
      history: historyResult.rows,
    });
  } catch (error) {
    console.error("Exception history error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve exception history.",
    });
  }
});

module.exports = router;