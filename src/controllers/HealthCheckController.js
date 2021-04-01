/**
 * Controller for health check endpoint
 */
const models = require('../models')
const errors = require('../common/errors')

// the topcoder-healthcheck-dropin library returns checksRun count,
// here it follows that to return such count
let checksRun = 0

/**
  * Check health of the app
  * @param {Object} req the request
  * @param {Object} res the response
  */
async function checkHealth (req, res) {
  // perform a quick database access operation, if there is no error and is quick, then consider it healthy
  checksRun += 1
  await models.ChallengeDetail.query({ id: '1234-1234' }).limit(1).exec()
    .catch((e) => {
      if (e.name === 'TimeoutError') {
        throw new errors.ServiceUnavailableError('Database operation is slow.')
      }
      throw new errors.ServiceUnavailableError(`There is database operation error, ${e.message}`)
    })
  // there is no error, and it is quick, then return checks run count
  res.send({ checksRun })
}

module.exports = {
  checkHealth
}
