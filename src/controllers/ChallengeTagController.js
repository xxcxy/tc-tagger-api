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

function sendAndSleep (response, secondsLeft) {
  if (secondsLeft <= 0) {
    response.end()
  } else {
    response.write(`{"seconds left": ${secondsLeft} }\n`)
    setTimeout(function () {
      sendAndSleep(response, secondsLeft - 1)
    }, 1000)
  }
};

async function streamDemo (req, res) {
  // when using text/plain it did not stream
  // without charset=utf-8, it only worked in Chrome, not Firefox
  // res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Transfer-Encoding', 'chunked')

  sendAndSleep(res, parseInt(req.query.duration || 5) * 60)
}

module.exports = {
  updateChallengeTag,
  searchChallengeTag,
  streamDemo
}
