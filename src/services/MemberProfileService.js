/**
 * This service provides operations of memberProfile.
 */

const _ = require('lodash')
const Joi = require('joi')
const moment = require('moment')
const helper = require('../common/helper')
const logger = require('../common/logger')
const models = require('../models')
const { BATCH_PUT_MAX_COUNT } = require('../../app-constants')

/**
 * Update or create member skills history
 * @param {Object} challenge the challenge
 * @param {Array} tags the tags
 * @param {Object} memberMap the map of member skills history, key is handle
 * @param {Function} monitor the process monitor
 */
async function updateSkillsHistory (challenge, tags, memberMap, monitor) {
  for (const winner of challenge.winners) {
    const handle = winner.handle
    let skillsHistory = memberMap[handle]
    if (!skillsHistory) {
      skillsHistory = await models.MemberSkillsHistory.get(handle)
    }
    if (skillsHistory) {
      const history = skillsHistory.history || []
      const record = _.find(history, ['challengeId', challenge.id])
      if (record) {
        record.Timestamp = challenge.appealsEndDate.toISOString()
        record.tags = tags
      } else {
        history.push({ challengeId: challenge.id, Timestamp: challenge.appealsEndDate.toISOString(), tags })
      }
      skillsHistory.history = history
      skillsHistory.LastRefreshedAt = new Date().toISOString()
      memberMap[handle] = skillsHistory
    } else {
      logger.debug(`create member skills history => new for ${handle}`)
      memberMap[handle] = {
        handle,
        history: [{ challengeId: challenge.id, tags, Timestamp: challenge.appealsEndDate.toISOString() }]
      }
    }
    monitor(`Extracted ${JSON.stringify(tags)} for user ${handle}`)
  }
}

/**
 * Get challenge list
 * @param {Object} query the query parameters
 * @param {String} status the challenge status
 * @param {Function} monitor the process monitor
 * @returns an array of challenge ids
 */
async function getChallengeListToUpdate (query, monitor) {
  const challengeList = []
  if (query.challengeId) {
    monitor(`Fetching challenge ${query.challengeId} from topcoder API...`)
    challengeList.push(await helper.getChallenge(query.challengeId))
  } else if (query.startDate) {
    const criteria = { status: 'Completed', updatedDateStart: query.startDate, updatedDateEnd: query.endDate, 'types[]': ['CH', 'F2F'] }
    monitor(`Fetching start at ${query.startDate.toISOString()}, end at ${query.endDate.toISOString()} completed challenges from topcoder API`)
    challengeList.push(...await helper.getAllPageChallenge(criteria))
  } else {
    challengeList.push(...await helper.findCompletedChallenge(monitor))
  }
  monitor(`Fetched ${challengeList.length} challenges from topcoder API `)
  return challengeList
}

/**
 * Update member profile
 * @params {Object} criteria the query parameters
 * @Params {Object} res the response
 */
async function updateMemberProfile (criteria, res) {
  logger.info('Fetching data from topcoder API')
  const monitor = helper.generateMonitor(res, criteria.stream)
  const challengeList = await getChallengeListToUpdate(criteria, monitor)
  logger.debug(`Challenge details ${JSON.stringify(challengeList)}`)

  const updateChallengeTags = []
  const memberMap = {}
  let taggingServiceChecked = false
  const metrics = helper.createMetrics(challengeList.length)
  // collect and update skills history
  for (const challenge of challengeList) {
    const challengeDetail = await models.ChallengeDetail.get(challenge.id)
    if (!challengeDetail) {
      if (taggingServiceChecked || (await helper.checkTaggingService())) {
        taggingServiceChecked = true
        monitor(`Extracting Tags for challenge ${challenge.id}...`)
        try {
          const challengeWithTags = await helper.getChallengeTag(challenge)
          await updateSkillsHistory(challenge, challengeWithTags.outputTags, memberMap, monitor)
          updateChallengeTags.push(challengeWithTags)
          helper.updateMetrics(metrics, challengeWithTags.outputTags.length)
        } catch (e) {
          helper.updateMetrics(metrics, -1)
          monitor(`Process challenge ${challenge.id} failed by ${e.message}`)
        }
      } else {
        helper.updateMetrics(metrics, -1)
        monitor(`Process challenge ${challenge.id} failed by taggingService not health`)
      }
    } else {
      helper.updateMetrics(metrics, challengeDetail.outputTags.length)
      await updateSkillsHistory(challenge, challengeDetail.outputTags, memberMap, monitor)
    }
    monitor(`Processed ${metrics.doneCount} of ${metrics.all} challenges, processed percentage ${Math.round(metrics.doneCount * 100 / metrics.all, 0)}%, average time per record ${moment.duration(metrics.avgTimePerDocument).humanize({ ss: 1 })}, time spent: ${moment.duration(metrics.timeSpent).humanize({ ss: 1 })}, time left: ${moment.duration(metrics.timeLeft).humanize({ ss: 1 })}`)
  }
  // save all new challengeTags
  let saved = 0
  for (const bit of _.chunk(updateChallengeTags, BATCH_PUT_MAX_COUNT)) {
    try {
      await models.ChallengeDetail.batchPut(bit)
      saved += bit.length
      monitor(`Saved ${saved} of ${updateChallengeTags.length} challenge`)
    } catch (e) {
      logger.logFullError(e, { signature: 'updateChallengeTag' })
      monitor(`An error(${e.message}) occurred when saving challenge tags`)
    }
  }
  if (!criteria.challengeId && !criteria.startDate) {
    const lastRefreshedAt = _.max(_.map(challengeList, 'appealsEndDate'))
    await new models.ChallengeDetail({ id: '1', lastRefreshedAt }).save()
  }
  // save skills history
  saved = 0
  const memberCount = _.size(memberMap)
  for (const bit of _.chunk(_.values(memberMap), BATCH_PUT_MAX_COUNT)) {
    try {
      await models.MemberSkillsHistory.batchPut(bit)
      saved += bit.length
      monitor(`Saved ${saved} of ${memberCount} skills history`)
    } catch (e) {
      logger.logFullError(e, { signature: 'updateSkillsHistory' })
      monitor(`An error(${e.message}) occurred when saving skills history`)
    }
  }
  monitor(`summary: user process[${memberCount}], processed successfully[${saved}], processed failed[${memberCount - saved}], time spent[${moment.duration(Date.now() - metrics.startTime).humanize({ ss: 1 })}]`, true)
}

updateMemberProfile.schema = Joi.object().keys({
  criteria: Joi.object().keys({
    challengeId: Joi.when('startDate', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.string().uuid()
    }),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().default(() => new Date()),
    stream: Joi.boolean()
  }).required(),
  res: Joi.any().required()
}).required()

/**
 * Search member profiles
 * @params {Object} criteria the search criteria
 * @returns {Object} the search result, contain total/page/perPage and result array
 */
async function searchMemberProfile (criteria) {
  const { page, perPage } = criteria
  logger.debug(`member_profile: ${criteria.handles} ${criteria.startDate} ${criteria.endDate}`)
  let memberSkillsHistoryList = await helper.getMemberSkillsHistory(criteria.handles)
  memberSkillsHistoryList = helper.filterMemberSkillHistory(memberSkillsHistoryList, criteria.startDate, criteria.endDate, criteria.skill)
  const memberProfiles = _.map(memberSkillsHistoryList, msh => ({ [msh.handle]: _.orderBy(_.map(msh.history, h => ({ challengeId: h.challengeId, timestamp: h.Timestamp })), ['timestamp'], ['desc']) }))
  return {
    total: memberProfiles.length,
    page,
    perPage,
    result: _.slice(memberProfiles, (page - 1) * perPage, page * perPage)
  }
}

searchMemberProfile.schema = Joi.object().keys({
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    handles: Joi.string(),
    skill: Joi.string(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso()
  }).required()
}).required()

module.exports = {
  updateMemberProfile,
  searchMemberProfile
}
