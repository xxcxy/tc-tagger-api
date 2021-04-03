/**
 * Controller for ChallengeTag endpoints
 */
const service = require('../services/ChallengeTagService')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
 * Update challenge tag by array of ids
 * @param req the request
 * @param res the response
 */
async function updateChallengeTag (req, res) {
  res.send(await service.updateChallengeTag(req.body))
}

/**
 * Search challenge tags
 * @param req the request
 * @param res the response
 */
async function searchChallengeTag (req, res) {
  const result = await service.searchChallengeTag(Object.assign({}, req.query, req.body))
  logger.info(`get challenge tags => ${result.result.length}`)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

module.exports = {
  updateChallengeTag,
  searchChallengeTag
}
