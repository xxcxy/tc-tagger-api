/**
 * This service provides operations of challengeTag.
 */

const _ = require('lodash')
const Joi = require('joi')
const moment = require('moment')
const helper = require('../common/helper')
const logger = require('../common/logger')
const models = require('../models')

/**
 * Get challenge list
 * @param {Object} challengeIdList the challenge id list
 * @param {String} status the challenge status
 * @param {Function} monitor the process monitor
 * @returns an array of challenge ids
 */
async function getChallengeListToUpdate (challengeIdList, status, monitor) {
  if (status === 'open') {
    monitor('Fetching all active challenges from topcoder API...')
    // get challenges open for registration
    return helper.getAllPageChallenge({ status: 'Active', currentPhaseName: 'Registration' })
  } else if (status === 'completed') {
    return helper.findCompletedChallenge(monitor)
  } else if (challengeIdList) {
    monitor(`Fetching ${JSON.stringify(challengeIdList)} challenges from topcoder API...`)
    const challengeList = []
    for (const challengeId of challengeIdList) {
      const challenge = await helper.getChallenge(challengeId)
      if (challenge) {
        challengeList.push(challenge)
      }
    }
    return [{ total: challengeList.length, data: challengeList }]
  }
}

/**
 * Update challenge tag
 * @params {Object} data the array of challengeId to be updated
 * @params {Object} criteria the request query parameters
 * @Params {Object} res the response
 */
async function updateChallengeTag (data, criteria, res) {
  const monitor = helper.generateMonitor(res, criteria.stream)
  let metrics
  let challengeDetailSaved = 0
  let lastRefreshedAt
  if (await helper.checkTaggingService()) {
    const challengeGenerator = await getChallengeListToUpdate(data.challengeId, criteria.status, monitor)
    for await (const challengePage of challengeGenerator) {
      if (!challengePage) {
        continue
      }
      if (!metrics) {
        metrics = helper.createMetrics(challengePage.total)
      }
      const challengeList = challengePage.data
      monitor('Extracting Tags for challenges...')
      const challengeTagList = []
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
      lastRefreshedAt = _.max([lastRefreshedAt, ..._.map(challengeTagList, 'appealsEndDate')])
      monitor('Saving challenge Tags...')
      for (const bit of _.chunk(challengeTagList, 1)) {
        monitor(`Saving tags for challenge ${bit[0].id}`)
        try {
          await models.ChallengeDetail.batchPut(bit)
          challengeDetailSaved += bit.length
          monitor(`Saved ${challengeDetailSaved} challenge details`)
        } catch (e) {
          metrics.success = metrics.success - bit.length
          metrics.fail = metrics.fail + bit.length
          logger.logFullError(e, { signature: 'updateChallengeTag' })
          monitor(`An error(${e.message}) occurred when saving challenge tags for ${JSON.stringify(bit[0])}`)
        }
      }
    }
    if (criteria.status === 'completed' && challengeDetailSaved > 0 && metrics.fail === 0) {
      await new models.ChallengeDetail({ id: '1', lastRefreshedAt }).save()
    }
  }
  monitor(`summary: challenge found[${_.get(metrics, 'all', 0)}], processed successfully[${_.get(metrics, 'success', 0)}], [${_.get(metrics, 'hasTags', 0)}] of challenges have tags, processed failed[${_.get(metrics, 'fail', 0)}], time spent[${moment.duration(Date.now() - _.get(metrics, 'startTime', Date.now())).humanize({ ss: 1 })}]`, true)
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
