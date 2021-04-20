/**
 * This file defines helper methods
 */

const querystring = require('querystring')
const config = require('config')
const _ = require('lodash')
const { default: axios } = require('axios')
const logger = require('./logger')
const models = require('../models')
const { BATCH_GET_MAX_COUNT } = require('../../app-constants')

const m2mAuth = require('tc-core-library-js').auth.m2m

const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'AUTH0_PROXY_SERVER_URL']))

/**
 * Get M2M token
 *
 * @returns {Promise<string>} token
 */
async function getM2MToken () {
  return await m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Wrap async function to standard express function
 * @param {Function} fn the async function
 * @returns {Function} the wrapped function
 */
function wrapExpress (fn) {
  return function (req, res, next) {
    fn(req, res, next).catch(next)
  }
}

/**
 * Wrap all functions from object
 * @param obj the object (controller exports)
 * @returns {Object|Array} the wrapped object
 */
function autoWrapExpress (obj) {
  if (_.isArray(obj)) {
    return obj.map(autoWrapExpress)
  }
  if (_.isFunction(obj)) {
    if (obj.constructor.name === 'AsyncFunction') {
      return wrapExpress(obj)
    }
    return obj
  }
  _.each(obj, (value, key) => {
    obj[key] = autoWrapExpress(value)
  })
  return obj
}

/**
 * Checks if the source matches the term.
 *
 * @param {Array} source the array in which to search for the term
 * @param {Array | String} term the term to search
 */
function checkIfExists (source, term) {
  let terms

  if (!_.isArray(source)) {
    throw new Error('Source argument should be an array')
  }

  source = source.map(s => s.toLowerCase())

  if (_.isString(term)) {
    terms = term.split(' ')
  } else if (_.isArray(term)) {
    terms = term.map(t => t.toLowerCase())
  } else {
    throw new Error('Term argument should be either a string or an array')
  }

  for (let i = 0; i < terms.length; i++) {
    if (source.includes(terms[i])) {
      return true
    }
  }

  return false
}

/**
 * Get link for a given page.
 * @param {Object} req the HTTP request
 * @param {Number} page the page number
 * @returns {String} link for the page
 */
function getPageLink (req, page) {
  const q = _.assignIn({}, req.query, { page })
  return `${req.protocol}://${req.get('Host')}${req.baseUrl}${req.path}?${querystring.stringify(q)}`
}

/**
 * Set HTTP response headers from result.
 * @param {Object} req the HTTP request
 * @param {Object} res the HTTP response
 * @param {Object} result the operation result
 */
function setResHeaders (req, res, result) {
  const totalPages = Math.ceil(result.total / result.perPage)
  if (result.page > 1) {
    res.set('X-Prev-Page', result.page - 1)
  }
  if (result.page < totalPages) {
    res.set('X-Next-Page', result.page + 1)
  }
  res.set('X-Page', result.page)
  res.set('X-Per-Page', result.perPage)
  res.set('X-Total', result.total)
  res.set('X-Total-Pages', totalPages)
  // set Link header
  if (totalPages > 0) {
    let link = `<${getPageLink(req, 1)}>; rel="first", <${getPageLink(req, totalPages)}>; rel="last"`
    if (result.page > 1) {
      link += `, <${getPageLink(req, result.page - 1)}>; rel="prev"`
    }
    if (result.page < totalPages) {
      link += `, <${getPageLink(req, result.page + 1)}>; rel="next"`
    }
    res.set('Link', link)
  }
}

/**
 * Get challenge from tc challenge service
 * @param {String} challengeId the challenge id
 * @returns {Object} the challenge
 */
async function getChallenge (challengeId) {
  const token = await getM2MToken()
  try {
    const res = await axios.get(`${config.CHALLENGE_BASE_URL}/v5/challenges/${challengeId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return adaptChallenge(res.data)
  } catch (e) {
    logger.logFullError(e, {
      component: 'helper',
      context: 'getChallenge'
    })
  }
}

/**
 * Adapt the challenge to challengeTag object
 * @param {Object} data the original challenge object
 * @returns {Object} the challengeTag
 */
function adaptChallenge (data) {
  const challenge = _.pick(data, ['id', 'name', 'track', 'description', 'tags'])
  challenge.startDate = new Date(data.startDate)
  challenge.endDate = new Date(data.endDate)
  challenge.winners = _.map(data.winners, w => ({ handle: w.handle, placement: _.toString(w.placement), userId: _.toString(w.userId) }))
  challenge.lastRefreshedAt = new Date()
  challenge.appealsEndDate = getAppealsEndDate(data)
  return challenge
}

/**
 * Get specific page of challenge from tc challenge service
 * @param {Object} criteria The query params
 * @returns {Object} challenge array with total count
 */
async function getSpecificPageChallenge (criteria) {
  const params = {
    ..._.pick(criteria, ['page', 'perPage', 'track', 'tracks', 'type', 'types', 'search', 'name', 'description']),
    status: 'Active',
    currentPhaseName: 'Registration',
    sortBy: 'updated',
    sortOrder: 'asc',
    isLightweight: 'false'
  }
  try {
    const res = await axios.get(`${config.CHALLENGE_BASE_URL}/v5/challenges`, { params })
    const data = _.map(res.data, d => adaptChallenge(d))
    return { total: parseInt(res.headers['x-total']), data }
  } catch (e) {
    logger.error('TopCoder API unavailable!')
  }
}

/**
 * Get all matched challenge from tc challenge service
 * @param {Object} criteria The query params
 * @returns {Object} challenge array with total count
 */
async function getAllPageChallenge (criteria) {
  const token = await getM2MToken()
  const result = []
  const params = _.extend({
    page: 1,
    perPage: '100',
    status: 'Active',
    currentPhaseName: 'Registration',
    sortBy: 'updated',
    sortOrder: 'asc',
    isLightweight: 'false'
  }, criteria)
  while (true) {
    try {
      const res = await axios.get(`${config.CHALLENGE_BASE_URL}/v5/challenges`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      result.push(..._.map(res.data, d => adaptChallenge(d)))
      if (parseInt(res.headers['x-total-pages']) > params.page) {
        params.page = params.page + 1
      } else {
        break
      }
    } catch (e) {
      logger.error('TopCoder API unavailable!')
      break
    }
  }
  return result
}

/**
 * Get appealsEndDate from challenge object
 * @param {Object} challenge The challenge object
 * @returns {Date} the appealsEndDate
 */
function getAppealsEndDate (challenge) {
  const maxDate = _.max(_.map(challenge.phases, p => new Date(p.actualEndDate)))
  if (maxDate) {
    return maxDate
  }
  return new Date(challenge.updated)
}

/**
 * Get challenge from db
 * @param {String} challengeIds The challengeIds
 * @returns {Array} the array of challenge
 */
async function getChallengeFromDb (challengeIds) {
  const result = []
  if (challengeIds) {
    for (const ids of _.chunk(challengeIds.split(','), BATCH_GET_MAX_COUNT)) {
      const items = await models.ChallengeDetail.batchGet(ids)
      result.push(..._.map(items, i => _.extend(_.omit(i, 'lastRefreshedAt', 'outputTags'), { outputTags: _.map(i.outputTags, 'tag') })))
    }
  } else {
    const items = await models.ChallengeDetail.scan().all().exec()
    result.push(..._.map(_.filter(items, i => i.id !== '1'), i => _.extend(_.omit(i, 'lastRefreshedAt', 'outputTags'), { outputTags: _.map(i.outputTags, 'tag') })))
  }
  return result
}

/**
 * Get tags from tagging service and set to the challenge
 * @param {Object} challenge The challenge
 * @returns {Object} the challenge with outputTags
 */
async function getChallengeTag (challenge) {
  if (challenge) {
    const tags = []
    const emsiType = _.toLower(config.TAGGING_EMSI_TYPE)
    if (_.includes(['external', 'internal_refresh', 'internal_no_refresh'], emsiType)) {
      const tagArr = await getTags(`emsi/${emsiType}`, challenge.description, emsiType === 'external' ? parseInt(config.TEXT_LENGTH) : null)
      tags.push(...tagArr)
    }
    if (_.toLower(config.ENABLE_CUSTOM_TAGGING) === 'true') {
      const tagArr = await getTags('custom', challenge.description)
      tags.push(...tagArr)
    }
    const outputTags = _.uniqBy(tags, v => _.toLower(v.tag))
    return { ..._.omit(challenge, 'description'), outputTags }
  }
}

/**
 * Get tags from tagging service
 * @param {String} type The tagging type
 * @param {String} description The challenge description
 * @param {Number} length The text length
 * @returns {Array} array of tags
 */
async function getTags (type, description, length) {
  const requestBody = { text: description, extract_confidence: _.toLower(config.EXTRACT_CONFIDENCE) === 'true' }
  if (length) {
    requestBody.length = length
  }
  const res = await axios.post(`${config.TAGGING_API_BASE_URL}/v5/contest-tagging/${type}`, querystring.stringify(requestBody), { validateStatus: null })
  if (res.status === 200) {
    return res.data
  } else {
    logger.error(`post ${type} error with response: ${JSON.stringify(res.data)}, `)
    return []
  }
}

/**
 * Check the tagging service health
 * @returns {Boolean} tagging service health or not
 */
async function checkTaggingService () {
  try {
    await axios.get(`${config.TAGGING_API_BASE_URL}/v5/contest-tagging/health`)
    if (_.toLower(config.UPDATE_LOCAL_BEFORE_TAGGING) === 'true') {
      logger.info('Syncing EMSI Local file with Server!')
      const res = await axios.post(`${config.TAGGING_API_BASE_URL}/v5/contest-tagging/emsi/updated_local_emsi`, { validateStatus: null })
      logger.info(`Syncing EMSI Local result: ${JSON.stringify(res.data)}`)
    }
    return true
  } catch (e) {
    logger.error('Tagging Server Unavailable!')
    return false
  }
}

/**
 * Get the tags from db and set to challenge
 * @param {Array} challengeList The array of challenge
 * @returns {Array} The array of challenge with outputTags
 */
async function assignOutputTag (challengeList) {
  const result = []
  for (const ids of _.chunk(_.map(challengeList, 'id'), BATCH_GET_MAX_COUNT)) {
    const fromDb = await models.ChallengeDetail.batchGet(ids)
    result.push(..._.map(fromDb, i => [i.id, _.map(i.outputTags, 'tag')]))
  }
  const tags = _.fromPairs(result)
  return _.map(challengeList, c => ({ ..._.omit(c, 'lastRefreshedAt', 'description'), outputTags: _.get(tags, c.id, []) }))
}

/**
 * Get member skills history from db
 * @param {String} handles The handles
 * @returns {Array} the array of member skills history
 */
async function getMemberSkillsHistory (handles) {
  if (handles) {
    const result = []
    for (const ids of _.chunk(handles.split(','), BATCH_GET_MAX_COUNT)) {
      const items = await models.MemberSkillsHistory.batchGet(ids)
      result.push(...items)
    }
    return result
  } else {
    return await models.MemberSkillsHistory.scan().all().exec()
  }
}

/**
 * Check if the history match the criteria start date and end date
 * @param {Object} history the skills history
 * @param {Date} startDate the criteria start date
 * @param {Date} endDate the criteria end date
 * @returns {Boolean}
 */
function matchHistory (history, startDate, endDate) {
  if (startDate && startDate > new Date(history.Timestamp)) {
    return false
  }
  if (endDate && endDate < new Date(history.Timestamp)) {
    return false
  }
  return true
}

/**
 * Check if the history math the criteria skill
 * @param {Object} history the skills history
 * @param {String} skill the skills
 * @returns {Boolean}
 */
function matchHistorySkill (history, skill) {
  if (!skill) {
    return true
  }
  return _.some(_.split(skill, ','), sk => _.some(history, h => _.some(h.tags, t => t.tag === sk)))
}

/**
 *
 * @param {Array} memberSkillsHistoryList the member skills history array
 * @param {Date} startDate the start date
 * @param {Date} endDate the end date
 * @param {String} skill the skill
 * @returns matched array of member skills history
 */
function filterMemberSkillHistory (memberSkillsHistoryList, startDate, endDate, skill) {
  const result = _.map(memberSkillsHistoryList, msh => ({
    handle: msh.handle,
    history: _.filter(msh.history, h => matchHistory(h, startDate, endDate))
  }))
  return _.filter(result, msh => msh.handle !== '1' && matchHistorySkill(msh.history, skill))
}

/**
 * Generate a monitor function
 * @param {Object} res the http response
 * @param {Boolean} stream the stream parameter
 * @returns monitor function
 */
function generateMonitor (res, stream) {
  const messageCollector = []
  if (stream) {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Transfer-Encoding', 'chunked')
  }
  return (msg, end) => {
    logger.info(msg)
    const message = `[${new Date().toISOString()}] ${msg}`
    if (stream) {
      res.write(`{"message": "${message}" }\n`)
    } else {
      messageCollector.push({ message })
    }
    if (end) {
      if (stream) {
        res.end()
      } else {
        res.send(messageCollector)
      }
    }
  }
}

/**
 * Find completed challenge list
 * @param {Function} monitor the process monitor
 * @returns an array of challenge
 */
async function findCompletedChallenge (monitor) {
  const criteria = { status: 'Completed' }
  const cd = await models.ChallengeDetail.get('1')
  if (cd && cd.lastRefreshedAt) {
    criteria.updatedDateStart = cd.lastRefreshedAt
    monitor(`Fetching completed start at ${cd.lastRefreshedAt.toISOString()} challenges from topcoder API`)
  } else {
    monitor('Fetching all completed challenges from topcoder API...')
  }
  return await getAllPageChallenge(criteria)
}

/**
 * Generate a metrics object
 * @param {Number} all the record count
 * @returns the metrics object
 */
function createMetrics (all) {
  return { all, success: 0, fail: 0, hasTags: 0, startTime: Date.now(), doneCount: 0, timeSpent: 0, avgTimePerDocument: 0, timeLeft: 0 }
}

/**
 * Update the metrics
 * @param {Object} metrics the metrics
 * @param {Number} result the count of extracted tags, -1 means failed
 */
function updateMetrics (metrics, result) {
  metrics.doneCount = metrics.doneCount + 1
  metrics.timeSpent = Date.now() - metrics.startTime
  metrics.avgTimePerDocument = metrics.timeSpent / metrics.doneCount
  metrics.timeLeft = metrics.avgTimePerDocument * (metrics.all - metrics.doneCount)
  if (result === -1) {
    metrics.fail = metrics.fail + 1
  } else if (result === 0) {
    metrics.success = metrics.success + 1
  } else if (result > 0) {
    metrics.success = metrics.success + 1
    metrics.hasTags = metrics.hasTags + 1
  }
}

module.exports = {
  getM2MToken,
  autoWrapExpress,
  checkIfExists,
  setResHeaders,
  getChallenge,
  getSpecificPageChallenge,
  getAllPageChallenge,
  getChallengeFromDb,
  getChallengeTag,
  checkTaggingService,
  assignOutputTag,
  getMemberSkillsHistory,
  filterMemberSkillHistory,
  generateMonitor,
  findCompletedChallenge,
  createMetrics,
  updateMetrics
}
