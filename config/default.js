module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,
  BASE_PATH: process.env.BASE_PATH || '/v5/tagger',

  AUTH_SECRET: process.env.AUTH_SECRET || 'mysecret',
  VALID_ISSUERS: process.env.VALID_ISSUERS || '["https://api.topcoder-dev.com", "https://api.topcoder.com", "https://topcoder-dev.auth0.com/", "https://auth.topcoder-dev.com/"]',
  AMAZON: {
    AWS_REGION: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    DYNAMODB_READ_CAPACITY_UNITS: process.env.DYNAMODB_READ_CAPACITY_UNITS || 10,
    DYNAMODB_WRITE_CAPACITY_UNITS: process.env.DYNAMODB_WRITE_CAPACITY_UNITS || 5,
    IS_LOCAL_DB: process.env.IS_LOCAL_DB ? process.env.IS_LOCAL_DB === 'true' : false,
    // On the real server we are using policies to access dynamo DB instead of AWS key.
    // But for local deployment we still need dummy values, which would be only use if `IS_LOCAL_DB=true`
    AWS_ACCESS_KEY_ID: 'local-dummy',
    AWS_SECRET_ACCESS_KEY: 'local-dummy',
    // We also have to provide URL if `IS_LOCAL_DB=true`
    DYNAMODB_URL: process.env.AWS_DYNAMODB_URL || 'http://localhost:8000',
  },

  DB_COLLECTION_CHALLENGES: process.env.ENV_SOLUTION_DB_COLLECTION_CHALLENGES || 'ChallengeTags',
  TAGGING_EMSI_TYPE: process.env.ENV_TAGGING_TAGGING_EMSI_TYPE || 'internal_no_refresh',
  ENABLE_CUSTOM_TAGGING: process.env.ENV_TAGGING_ENABLE_CUSTOM_TAGGING || 'false',
  UPDATE_LOCAL_BEFORE_TAGGING: process.env.ENV_TAGGING_UPDATE_LOCAL_BEFORE_TAGGING || 'false',
  EXTRACT_CONFIDENCE: process.env.ENV_TAGGING_EXTRACT_CONFIDENCE || 'false',
  TEXT_LENGTH: process.env.ENV_TAGGING_TEXT_LENGTH || 300,

  CHALLENGE_BASE_URL: process.env.ENV_CHALLENGE_BASE_URL || 'https://api.topcoder-dev.com',

  TAGGING_API_BASE_URL: process.env.ENV_TAGGING_API_BASE_URL || 'https://api.topcoder-dev.com'
}
