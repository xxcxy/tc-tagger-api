/**
 * App constants
 */

const BATCH_MAX_COUNT = 25

const UserRoles = {
  Admin: 'administrator',
  User: 'Topcoder User'
}

const Scopes = {
  WRITE_CHALLENGES: 'write:challenges',
  ALL_CHALLENGES: 'all:challenges'
}

module.exports = {
  BATCH_MAX_COUNT,
  UserRoles,
  Scopes
}
