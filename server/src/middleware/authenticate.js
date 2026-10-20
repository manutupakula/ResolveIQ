
const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const token = authorization.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.sub || !payload.role) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
}

module.exports = authenticate;
