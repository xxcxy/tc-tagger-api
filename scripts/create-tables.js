/**
 * Create table schemes in database
 */

require('../src/bootstrap')
const models = require('../src/models')
const logger = require('../src/common/logger')
const dynamoose = require('dynamoose')

logger.info('Requesting to create tables')

const createTables = async () => {
  const ddb = dynamoose.aws.ddb()
  for (const model of Object.values(models)) {
    const modelTableParams = await model.table.create.request()
    await ddb.createTable(modelTableParams).promise()
  }
}

if (!module.parent) {
  createTables().then(() => {
    logger.info('Done! The table creation might still take some time. Please check the Dynamodb interface to verify that all processes have indeed completed and you are good to proceed with the next step')
    process.exit()
  }).catch((e) => {
    logger.logFullError(e)
    process.exit(1)
  })
}

module.exports = {
  createTables
}
