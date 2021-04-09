/**
 * App constants
 */

const BATCH_MAX_COUNT = 100

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
  BATCH_MAX_COUNT,
  UserRoles,
  Scopes
}
