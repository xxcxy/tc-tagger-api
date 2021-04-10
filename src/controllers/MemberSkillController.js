/**
 * Controller for MemberProfile endpoints
 */
const service = require('../services/MemberSkillService')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
  * Search member skills
  * @param req the request
  * @param res the response
  */
async function searchMemberSkill (req, res) {
  const result = await service.searchMemberSkill(req.query)
  logger.info(`get member profiles => ${result.result.length}`)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

module.exports = {
  searchMemberSkill
}
