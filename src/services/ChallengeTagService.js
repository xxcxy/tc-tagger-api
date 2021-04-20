/**
 * This service provides operations of challengeTag.
 */

const _ = require('lodash')
const Joi = require('joi')
const moment = require('moment')
const helper = require('../common/helper')
const logger = require('../common/logger')
const models = require('../models')
const { BATCH_PUT_MAX_COUNT } = require('../../app-constants')

/**
 * Get challenge list
 * @param {Object} challengeIdList the challenge id list
 * @param {String} status the challenge status
 * @param {Function} monitor the process monitor
 * @returns an array of challenge ids
 */
async function getChallengeListToUpdate (challengeIdList, status, monitor) {
  const challengeList = []
  if (status === 'open') {
    monitor('Fetching all active challenges from topcoder API...')
    // get challenges open for registration
    challengeList.push(...await helper.getAllPageChallenge({ status: 'Active', currentPhaseName: 'Registration' }))
  } else if (status === 'completed') {
    challengeList.push(...await helper.findCompletedChallenge(monitor))
  } else if (challengeIdList) {
    monitor(`Fetching ${JSON.stringify(challengeIdList)} challenges from topcoder API...`)
    for (const challengeId of challengeIdList) {
      challengeList.push(await helper.getChallenge(challengeId))
    }
  }
  monitor(`Fetched ${challengeList.length} challenges from topcoder API `)
  return challengeList
}

/**
 * Update challenge tag
 * @params {Object} data the array of challengeId to be updated
 * @params {Object} criteria the request query parameters
 * @Params {Object} res the response
 */
async function updateChallengeTag (data, criteria, res) {
  const monitor = helper.generateMonitor(res, criteria.stream)
  const challengeTagList = []
  const challengeList = await getChallengeListToUpdate(data.challengeId, criteria.status, monitor)
  const metrics = helper.createMetrics(challengeList.length)
  if (await helper.checkTaggingService()) {
    monitor('Extracting Tags for challenges...')
    for (const challenge of challengeList) {
      monitor(`Processing challenge ${challenge.id}...`)
      try {
        const challengeWithTags = await helper.getChallengeTag(challenge)
        helper.updateMetrics(metrics, challengeWithTags.outputTags.length)
        challengeTagList.push(challengeWithTags)
        monitor(`Extracted ${JSON.stringify(challengeWithTags.outputTags)} for challenge ${challenge.id}`)
      } catch (e) {
        helper.updateMetrics(metrics, -1)
        monitor(`Process challenge ${challenge.id} failed by ${e.message}`)
      }
      monitor(`Processed ${metrics.doneCount} of ${metrics.all} challenges, processed percentage ${Math.round(metrics.doneCount * 100 / metrics.all, 0)}%, average time per record ${moment.duration(metrics.avgTimePerDocument).humanize({ ss: 1 })}, time spent: ${moment.duration(metrics.timeSpent).humanize({ ss: 1 })}, time left: ${moment.duration(metrics.timeLeft).humanize({ ss: 1 })}`)
    }
    monitor('Saving challenge Tags...')
    let saved = 0
    for (const bit of _.chunk(challengeTagList, BATCH_PUT_MAX_COUNT)) {
      try {
        await models.ChallengeDetail.batchPut(bit)
        saved += bit.length
        monitor(`Saved ${saved} of ${challengeTagList.length} challenge`)
      } catch (e) {
        metrics.success = metrics.success - bit.length
        metrics.fail = metrics.fail + bit.length
        logger.logFullError(e, { signature: 'updateChallengeTag' })
        monitor(`An error(${e.message}) occurred when saving challenge tags`)
      }
    }
    if (criteria.status === 'completed' && challengeTagList.length > 0) {
      const lastRefreshedAt = _.max(_.map(challengeTagList, 'appealsEndDate'))
      await new models.ChallengeDetail({ id: '1', lastRefreshedAt }).save()
    }
  }
  monitor(`summary: challenge found[${metrics.all}], processed successfully[${metrics.success}], [${metrics.hasTags}] of challenges have tags, processed failed[${metrics.fail}], time spent[${moment.duration(Date.now() - metrics.startTime).humanize({ ss: 1 })}]`, true)
}

updateChallengeTag.schema = Joi.object().keys({
  data: Joi.object().keys({
    challengeId: Joi.when('...criteria.status', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.array().items(Joi.string()).min(1).required()
    })
  }).required(),
  criteria: Joi.object().keys({
    status: Joi.string().valid('open', 'completed'),
    stream: Joi.boolean()
  }),
  res: Joi.any().required()
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
      const searchResult = await helper.getAllPageChallenge(_.assign(
        _.pick(criteria, ['track', 'tracks', 'type', 'types', 'search', 'name', 'description']),
        // challenges open for registration
        {
          status: 'Active',
          currentPhaseName: 'Registration'
        }
      ))
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
