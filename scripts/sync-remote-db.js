/**
 * Migrate Data from remote api to Dynamo DB
 */

const _ = require('lodash')
const { default: axios } = require('axios')
const logger = require('../src/common/logger')
const models = require('../src/models')
const { BATCH_MAX_COUNT } = require('../app-constants')

/*
 * Migrate records from DB to ES
 */
async function migrateRecords () {
  const params = { perPage: 100, page: 1 }
  while (true) {
    const res = await axios.get('https://api.topcoder-dev.com/v5/challenge-tags', { params })
    const items = _.map(res.data, d => ({
      id: d.id,
      name: d.name,
      startDate: Date.parse(d.startDate),
      endDate: Date.parse(d.endDate),
      track: d.track,
      appealsEndDate: Date.parse(d.appealsEndDate),
      outputTags: _.map(d.tags, ts => ({ tag: ts })),
      tags: [],
      winners: _.map(d.winners, w => ({ handle: w.handle, placement: _.toString(w.placement), userId: _.toString(w.userId) }))
    }))
    for (const bit of _.chunk(items, BATCH_MAX_COUNT)) {
      await models.ChallengeDetail.batchPut(bit)
    }
    logger.info(`sync page ${params.page}, count: ${items.length}`)
    if (parseInt(res.headers['x-total-pages']) > params.page) {
      params.page = params.page + 1
    } else {
      break
    }
  }
}

migrateRecords()
  .then(() => {
    logger.info('Done')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
