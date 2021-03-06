module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,
  BASE_PATH: process.env.BASE_PATH || '/v5/tagger',

  AUTH_SECRET: process.env.AUTH_SECRET || 'mysecret',
  VALID_ISSUERS: process.env.VALID_ISSUERS || '["https://api.topcoder-dev.com", "https://api.topcoder.com", "https://topcoder-dev.auth0.com/", "https://auth.topcoder-dev.com/"]',

  // Auth0 URL, used to get TC M2M token
  AUTH0_URL: process.env.AUTH0_URL,
  // Auth0 audience, used to get TC M2M token
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
  // Auth0 client id, used to get TC M2M token
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  // Auth0 client secret, used to get TC M2M token
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  // Proxy Auth0 URL, used to get TC M2M token
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  AMAZON: {
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    DYNAMODB_READ_CAPACITY_UNITS: process.env.DYNAMODB_READ_CAPACITY_UNITS || 10,
    DYNAMODB_WRITE_CAPACITY_UNITS: process.env.DYNAMODB_WRITE_CAPACITY_UNITS || 5,
    IS_LOCAL_DB: process.env.IS_LOCAL_DB ? process.env.IS_LOCAL_DB === 'true' : false,
    // On the real server we are using policies to access dynamo DB instead of AWS key.
    // But for local deployment we still need dummy values, which would be only use if `IS_LOCAL_DB=true`
    AWS_ACCESS_KEY_ID: 'local-dummy',
    AWS_SECRET_ACCESS_KEY: 'local-dummy',
    // We also have to provide URL if `IS_LOCAL_DB=true`
    DYNAMODB_URL: process.env.DYNAMODB_URL || 'http://localhost:8000'
  },

  DB_COLLECTION_CHALLENGES: process.env.DB_COLLECTION_CHALLENGES || 'challenge_tags',
  TAGGING_EMSI_TYPE: process.env.TAGGING_EMSI_TYPE || 'internal_no_refresh',
  ENABLE_CUSTOM_TAGGING: process.env.ENABLE_CUSTOM_TAGGING || 'false',
  UPDATE_LOCAL_BEFORE_TAGGING: process.env.UPDATE_LOCAL_BEFORE_TAGGING || 'false',
  EXTRACT_CONFIDENCE: process.env.EXTRACT_CONFIDENCE || 'false',
  HALF_LIFE_DAYS: process.env.HALF_LIFE_DAYS || 1000,
  SKIP_SKILLS_PATH: process.env.SKIP_SKILLS_PATH || 'skip_skill_list.txt',

  DB_COLLECTION_MEMBER: process.env.DB_COLLECTION_MEMBER || 'member_skills_history',
  TEXT_LENGTH: process.env.TEXT_LENGTH || 300,

  CHALLENGE_BASE_URL: process.env.CHALLENGE_BASE_URL || 'https://api.topcoder-dev.com',

  TAGGING_API_BASE_URL: process.env.TAGGING_API_BASE_URL || 'https://api.topcoder-dev.com',

  M2M_AUDIT_USER_ID: process.env.M2M_AUDIT_USER_ID || -1,
  M2M_AUDIT_HANDLE: process.env.M2M_AUDIT_HANDLE || 'TopcoderService',
  SUBMITTER_RESOURCE_ROLE_ID: process.env.SUBMITTER_RESOURCE_ROLE_ID || '732339e7-8e30-49d7-9198-cccf9451e221',
  TASK_TYPE_ID: process.env.TASK_TYPE_ID || 'ecd58c69-238f-43a4-a4bb-d172719b9f31'
}
