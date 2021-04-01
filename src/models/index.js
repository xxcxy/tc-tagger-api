/**
 * Initialize and export all model schemas.
 */

const config = require('config')
const dynamoose = require('dynamoose')

dynamoose.aws.sdk.config.update({
  accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
  region: config.AMAZON.AWS_REGION
})

if (config.AMAZON.IS_LOCAL_DB) {
  dynamoose.aws.ddb.local(config.AMAZON.DYNAMODB_URL)
}

dynamoose.model.defaults.set({
  create: false,
  update: false,
  waitForActive: false
})

module.exports = {
  ChallengeDetail: dynamoose.model(config.DB_COLLECTION_CHALLENGES, require('./ChallengeDetail'))
}
