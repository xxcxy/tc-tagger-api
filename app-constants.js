/**
 * App constants
 */

// DynamoDB batchPut limit
const BATCH_PUT_MAX_COUNT = 25

// DynamoDB batchGet limit
const BATCH_GET_MAX_COUNT = 100

const UserRoles = {
  Admin: 'administrator',
  User: 'Topcoder User'
}

const Scopes = {
  READ_CHALLENGES: 'read:challenges',
  WRITE_CHALLENGES: 'write:challenges',
  ALL_CHALLENGES: 'all:challenges'
}

module.exports = {
  BATCH_PUT_MAX_COUNT,
  BATCH_GET_MAX_COUNT,
  UserRoles,
  Scopes
}
