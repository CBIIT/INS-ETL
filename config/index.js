let path = require("path");
let localEnv = require("dotenv");
let _ = require("lodash");

const cfg = localEnv.config();
if (!cfg.error) {
    let tmp = cfg.parsed;
    process.env = {
        ...process.env,
        NODE_ENV: tmp.NODE_ENV,
        DATA_FOLDER: tmp.DATA_FOLDER,
        LOGDIR: tmp.LOGDIR,
        LOG_LEVEL: tmp.LOG_LEVEL,
    };
}

// All configurations will extend these options
// ============================================
var config = {
  // Root path of server
  root: path.resolve(__dirname, "../../"),

  dataFolder: process.env.DATA_FOLDER || path.resolve(__dirname, "../data"),

  // Log directory
  logDir: process.env.LOGDIR || "/local/content/ins/etl/logs",

  // Node environment (dev, test, stage, prod), must select one.
  env: process.env.NODE_ENV || "prod",

  // Used by winston logger
  logLevel: process.env.LOG_LEVEL || "silly",

};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(config, {});