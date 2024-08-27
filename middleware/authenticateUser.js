import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  try {
    const authorizationHeader = req.headers["authorization"];
    

    if (!authorizationHeader) {
      return res.status(401).json({
        settings: {
          success: "0",
          message: "No authorization header present"
        }
      });
    }

    const token = authorizationHeader.replace('Bearer ', '').trim();
    

    if (!token) {
      return res.status(401).json({
        settings: {
          success: "0",
          message: "No token provided"
        }
      });
    }

    const user = jwt.verify(token, process.env.JWT_KEY);
    req.user = user.userId;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({
      settings: {
        success: "0",
        message: "Unauthorized request"
      }
    });
  }
};