/**
 * Drop tables in database. All data will be cleared.
 */

require('../src/bootstrap')
const models = require('../src/models')
const logger = require('../src/common/logger')
const dynamoose = require('dynamoose')

logger.info('Requesting to delete tables')

const deleteTables = async () => {
  const ddb = dynamoose.aws.ddb()
  for (const model of Object.values(models)) {
    await ddb.deleteTable({ TableName: model.Model.name }).promise()
  }
}

if (!module.parent) {
  deleteTables().then(() => {
    logger.info('Done! The table deletion might still take some time. Please check the Dynamodb interface to verify that all processes have indeed completed and you are good to proceed with the next step')
    process.exit()
  }).catch((e) => {
    logger.logFullError(e)
    process.exit(1)
  })
}

module.exports = {
  deleteTables
}
