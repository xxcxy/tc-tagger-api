/**
 * Contains member-skill routes
 */

module.exports = {
  '/member-skills': {
    get: {
      controller: 'MemberSkillController',
      method: 'searchMemberSkill'
    }
  }
}
