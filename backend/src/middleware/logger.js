/**
 * Logger Middleware
 * Provides request logging functionality with colors
 */

/**
 * Color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Get color based on HTTP status code
 * @param {number} status - HTTP status code
 * @returns {string} Color code
 */
const getStatusColor = (status) => {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  if (status >= 200) return colors.green;
  return colors.white;
};

/**
 * Get color based on HTTP method
 * @param {string} method - HTTP method
 * @returns {string} Color code
 */
const getMethodColor = (method) => {
  switch (method) {
    case 'GET': return colors.green;
    case 'POST': return colors.yellow;
    case 'PUT': return colors.blue;
    case 'DELETE': return colors.red;
    case 'PATCH': return colors.magenta;
    default: return colors.white;
  }
};

/**
 * Format response time with appropriate color
 * @param {number} responseTime - Response time in milliseconds
 * @returns {string} Formatted response time
 */
const formatResponseTime = (responseTime) => {
  let color = colors.green;
  if (responseTime > 1000) color = colors.red;
  else if (responseTime > 500) color = colors.yellow;
  
  return `${color}${responseTime}ms${colors.reset}`;
};

/**
 * Logger middleware function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const logger = (req, res, next) => {
  const startTime = Date.now();
  
  // Get client IP
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
             (req.connection.socket ? req.connection.socket.remoteAddress : null);
  
  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    
    // Log the request
    const methodColor = getMethodColor(req.method);
    const statusColor = getStatusColor(res.statusCode);
    const timeColor = formatResponseTime(responseTime);
    
    console.log(
      `${colors.dim}${timestamp}${colors.reset} ` +
      `${methodColor}${req.method}${colors.reset} ` +
      `${colors.cyan}${req.originalUrl}${colors.reset} ` +
      `${statusColor}${res.statusCode}${colors.reset} ` +
      `${timeColor} ` +
      `${colors.dim}${ip}${colors.reset}`
    );
    
    // Log request body for POST/PUT/PATCH (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const sanitizedBody = { ...req.body };
      // Remove sensitive fields
      delete sanitizedBody.password;
      delete sanitizedBody.token;
      delete sanitizedBody.secret;
      
      if (Object.keys(sanitizedBody).length > 0) {
        console.log(`${colors.dim}  Body:${colors.reset}`, sanitizedBody);
      }
    }
    
    // Log query parameters if present
    if (Object.keys(req.query).length > 0) {
      console.log(`${colors.dim}  Query:${colors.reset}`, req.query);
    }
    
    // Log user agent for debugging
    if (process.env.NODE_ENV === 'development' && req.get('User-Agent')) {
      console.log(`${colors.dim}  UA: ${req.get('User-Agent')}${colors.reset}`);
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Simple console logger with colors
 */
export const consoleLogger = {
  info: (message, data = null) => {
    console.log(`${colors.green}ℹ INFO:${colors.reset} ${message}`, data || '');
  },
  
  warn: (message, data = null) => {
    console.log(`${colors.yellow}⚠ WARNING:${colors.reset} ${message}`, data || '');
  },
  
  error: (message, data = null) => {
    console.log(`${colors.red}❌ ERROR:${colors.reset} ${message}`, data || '');
  },
  
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.blue}🐛 DEBUG:${colors.reset} ${message}`, data || '');
    }
  },
  
  success: (message, data = null) => {
    console.log(`${colors.green}✅ SUCCESS:${colors.reset} ${message}`, data || '');
  }
};

export default {
  logger,
  consoleLogger
};