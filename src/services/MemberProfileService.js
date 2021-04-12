/**
 * This service provides operations of memberProfile.
 */

const _ = require('lodash')
const Joi = require('joi')
const helper = require('../common/helper')
const logger = require('../common/logger')
const models = require('../models')

/**
 * Update or create member skills history
 * @param {String} handle the member handle
 * @param {Object} challenge the challenge
 * @param {Array} tags the tags
 */
async function updateSkillsHistory (handle, challenge, tags) {
  const skillsHistory = await models.MemberSkillsHistory.get(handle)
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
    await models.MemberSkillsHistory.update(skillsHistory)
  } else {
    logger.debug(`create member skills history => new for ${handle}`)
    await models.MemberSkillsHistory.create({
      handle,
      history: [{ challengeId: challenge.id, tags, Timestamp: challenge.appealsEndDate.toISOString(), LastRefreshedAt: new Date().toISOString() }]
    })
  }
}

/**
 * Update member profile
 * @params {String} challengeId the challenge id
 * @returns {Object} the updated message
 */
async function updateMemberProfile (challengeId) {
  logger.info('Fetching data from topcoder API')
  const challenge = await helper.getChallenge(challengeId)
  if (!challenge) {
    return { 'Members Updated': 0 }
  }
  logger.debug(`Challenge details ${JSON.stringify(challenge)}`)

  let challengeDetail = await models.ChallengeDetail.get(challengeId)

  if (!challengeDetail) {
    if (await helper.checkTaggingService()) {
      logger.info('Extracting Tags for challenges!')
      const challengeWithTags = await helper.getChallengeTag(challenge)
      try {
        challengeDetail = await models.ChallengeDetail.create(challengeWithTags)
      } catch (e) {
        logger.logFullError(e, { signature: 'updateChallengeTag' })
      }
    }
  }
  if (!challengeDetail) {
    return { 'Members Updated': 0 }
  }

  for (const winner of challenge.winners) {
    await updateSkillsHistory(winner.handle, challenge, challengeDetail.outputTags)
  }
  logger.info(`Parsed raw data: ${challenge.winners.length}`)
  return { 'Members Updated': challenge.winners.length }
}

updateMemberProfile.schema = Joi.object().keys({
  challengeId: Joi.string().uuid().required()
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
