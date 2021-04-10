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
  const memberSkillsHistoryList = []
  const LastRefreshedAt = new Date().toISOString()
  while (true) {
    const res = await axios.get('https://api.topcoder-dev.com/v5/challenge-tags', { params })
    const items = _.map(_.filter(res.data, d => !_.includes(['6b4de0f4-6815-49e0-9009-1f34ec39252c', '8b2f4f6c-1530-4065-a3cc-9c64c67b81f8'], d.id)), d => ({
      id: d.id,
      name: d.name,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      track: d.track,
      appealsEndDate: new Date(d.appealsEndDate),
      outputTags: _.map(d.tags, ts => ({ tag: ts })),
      tags: [],
      winners: _.map(d.winners, w => ({ handle: w.handle, placement: _.toString(w.placement), userId: _.toString(w.userId) }))
    }))
    _.forEach(items, item => {
      _.forEach(item.winners, winner => {
        const memberSkillsHistory = _.find(memberSkillsHistoryList, ['handle', winner.handle])
        if (memberSkillsHistory) {
          memberSkillsHistory.history.push({ challengeId: item.id, Timestamp: item.appealsEndDate.toISOString(), tags: item.outputTags })
        } else {
          memberSkillsHistoryList.push({ handle: winner.handle, LastRefreshedAt, history: [{ challengeId: item.id, Timestamp: item.appealsEndDate.toISOString(), tags: item.outputTags }] })
        }
      })
    })
    for (const bit of _.chunk(items, BATCH_MAX_COUNT)) {
      await models.ChallengeDetail.batchPut(bit)
    }
    for (const msh of _.chunk(memberSkillsHistoryList, BATCH_MAX_COUNT)) {
      await models.MemberSkillsHistory.batchPut(msh)
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
