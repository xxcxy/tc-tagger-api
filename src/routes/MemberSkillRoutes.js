/**
 * Contains member-skill routes
 */
const constants = require('../../app-constants')

module.exports = {
  '/member-skills': {
    get: {
      controller: 'MemberSkillController',
      method: 'searchMemberSkill',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.READ_CHALLENGES, constants.Scopes.ALL_CHALLENGES]
    }
  }
}
