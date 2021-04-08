/**
 * Contains challenge-tag routes
 */
const constants = require('../../app-constants')

module.exports = {
  '/challenge-tags': {
    put: {
      controller: 'ChallengeTagController',
      method: 'updateChallengeTag',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.WRITE_CHALLENGES, constants.Scopes.ALL_CHALLENGES]
    },
    get: {
      controller: 'ChallengeTagController',
      method: 'searchChallengeTag',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.READ_CHALLENGES, constants.Scopes.ALL_CHALLENGES]
    }
  },
  '/challenge-tags/stream-demo': {
    get: {
      controller: 'ChallengeTagController',
      method: 'streamDemo'
    }
  }
}
