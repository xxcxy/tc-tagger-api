/**
 * Controller for MemberProfile endpoints
 */
const service = require('../services/MemberProfileService')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
  * Update challenge tag by array of ids
  * @param req the request
  * @param res the response
  */
async function updateMemberProfile (req, res) {
  await service.updateMemberProfile(req.query, res)
}

/**
  * Search member profiles
  * @param req the request
  * @param res the response
  */
async function searchMemberProfile (req, res) {
  const result = await service.searchMemberProfile(req.query)
  logger.info(`get member profiles => ${result.result.length}`)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

module.exports = {
  updateMemberProfile,
  searchMemberProfile
}
