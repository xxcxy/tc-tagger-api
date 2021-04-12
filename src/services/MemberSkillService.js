/**
 * This service provides operations of memberSkill.
 */

const fs = require('fs')
const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
 * Calculate skill confidence from timestamp array
 * @param {Array} timeArray the tag's timestamp array
 * @returns {Number} number of skill confidence
 */
function calculateSkillConfidence (timeArray) {
  const currentTimestamp = Date.now()
  const halfLifeMilliseconds = 86400000 * parseInt(config.HALF_LIFE_DAYS)
  const decayScore = _.sum(_.map(timeArray, t => Math.pow(0.5, (currentTimestamp - Date.parse(t)) / halfLifeMilliseconds)))
  return _.round(Math.log(1 + decayScore), 3)
}

/**
 * Calculate skills confidence
 * @param {Array} skillsHistory the skills history
 * @param {Array} skipSkills the skip skills
 * @returns {Array} an array of skills with confidence
 */
function calculateSkillsConfidence (skillsHistory, skipSkills) {
  const tags = _.flatMap(_.map(skillsHistory, h => _.map(_.filter(h.tags, t => !_.includes(skipSkills, t.tag)), t => ({ timestamp: h.Timestamp, tag: t.tag }))))
  return _.map(_.toPairs(_.groupBy(tags, 'tag')), p => ({ skill: p[0], skillConfidence: calculateSkillConfidence(_.map(p[1], 'timestamp')) }))
}

/**
 * Get skip skills
 * @returns {Array} the skip skills
 */
function getSkipSkills () {
  const data = fs.readFileSync(config.SKIP_SKILLS_PATH, 'UTF-8')
  return _.map(data.split(/\r?\n/), s => _.trim(s))
}

/**
 * Search member skills
 * @params {Object} criteria the search criteria
 * @returns {Object} the search result, contain total/page/perPage and result array
 */
async function searchMemberSkill (criteria) {
  const { page, perPage } = criteria
  logger.debug(`member_skill: ${criteria.handles}: ${criteria.startDate} - ${criteria.endDate}`)
  const skipSkills = getSkipSkills()
  let memberSkillsHistoryList = await helper.getMemberSkillsHistory(criteria.handles)
  memberSkillsHistoryList = helper.filterMemberSkillHistory(memberSkillsHistoryList, criteria.startDate, criteria.endDate, criteria.skill)
  const memberSkills = _.map(memberSkillsHistoryList, msh => ({ [msh.handle]: _.orderBy(calculateSkillsConfidence(msh.history, skipSkills), ['skillConfidence'], ['desc']) }))
  return {
    total: memberSkills.length,
    page,
    perPage,
    result: _.slice(memberSkills, (page - 1) * perPage, page * perPage)
  }
}

searchMemberSkill.schema = Joi.object().keys({
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
  searchMemberSkill
}
