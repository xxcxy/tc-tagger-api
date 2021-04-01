/**
 * This service provides operations of challengeTag.
 */

const _ = require('lodash')
const Joi = require('joi')
// const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const models = require('../models')
const { BATCH_MAX_COUNT } = require('../../app-constants')

/**
 * Update challenge tag
 * @params {Object} the array of challengeId to be updated
 * @returns {Object} the updated message
 */
async function updateChallengeTag (data) {
  const challengeTagList = []
  if (await helper.checkTaggingService()) {
    logger.info('Extracting Tags for challenges!')
    for (const challengeId of data.challengeId) {
      const challenge = await helper.getChallenge(challengeId)
      const challengeWithTags = await helper.getChallengeTag(challenge)
      if (challengeWithTags) {
        challengeTagList.push(challengeWithTags)
      }
    }
    try {
      for (const bit of _.chunk(challengeTagList, BATCH_MAX_COUNT)) {
        await models.ChallengeDetail.batchPut(bit)
      }
    } catch (e) {
      logger.logFullError(e, { signature: 'updateChallengeTag' })
      throw new errors.InternalServerError('There is an error when updateChallengeTag')
    }
  }
  return { 'Challenges Updated': challengeTagList.length }
}

updateChallengeTag.schema = Joi.object().keys({
  data: Joi.object().keys({
    challengeId: Joi.array().items(Joi.string()).min(1).required()
  }).required()
}).required()

/**
 * Search challenge tags
 * @params {Object} criteria the search criteria
 * @returns {Object} the search result, contain total/page/perPage and result array
 */
async function searchChallengeTag (criteria) {
  const { page, perPage } = criteria
  if (!criteria.challengeId && criteria.status === 'open') {
    if (!criteria.tag) {
      const searchResult = await helper.getSpecificPageChallenge(criteria)
      const result = await helper.assignOutputTag(searchResult.data)
      return {
        total: searchResult.total,
        page,
        perPage,
        result
      }
    } else {
      const searchResult = await helper.getAllPageChallenge(criteria)
      const result = await helper.assignOutputTag(searchResult)
      const afterFilter = _.filter(result, c => criteria.tag.split(',').every(t => _.includes(c.outputTags, t)))
      return {
        total: afterFilter.length,
        page,
        perPage,
        result: _.slice(afterFilter, (page - 1) * perPage, page * perPage)
      }
    }
  } else {
    let result = await helper.getChallengeFromDb(criteria.challengeId)
    if (criteria.tag) {
      result = _.filter(result, c => criteria.tag.split(',').every(t => _.includes(c.outputTags, t)))
    }
    return {
      total: result.length,
      page,
      perPage,
      result: _.slice(result, (page - 1) * perPage, page * perPage)
    }
  }
}

searchChallengeTag.schema = Joi.object().keys({
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    challengeId: Joi.string(),
    status: Joi.string().valid('open'),
    tag: Joi.string(),
    type: Joi.string(),
    track: Joi.string(),
    name: Joi.string(),
    search: Joi.string(),
    description: Joi.string(),
    types: Joi.array().items(Joi.string()),
    tracks: Joi.array().items(Joi.string())
  }).required()
}).required()

module.exports = {
  updateChallengeTag,
  searchChallengeTag
}
