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
      scopes: [constants.Scopes.WRITE_CHALLENGES, constants.Scopes.ALL_CHALLENGES]
    },
    get: {
      controller: 'ChallengeTagController',
      method: 'searchChallengeTag'
    }
  }
}
