/**
 * Contains member-profile routes
 */
const constants = require('../../app-constants')

module.exports = {
  '/member-profiles': {
    put: {
      controller: 'MemberProfileController',
      method: 'updateMemberProfile',
      auth: 'jwt',
      scopes: [constants.Scopes.WRITE_CHALLENGES, constants.Scopes.ALL_CHALLENGES]
    },
    get: {
      controller: 'MemberProfileController',
      method: 'searchMemberProfile'
    }
  }
}
