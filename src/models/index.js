/**
 * Initialize and export all model schemas.
 */

const config = require('config')
const dynamoose = require('dynamoose')

// We are using policies to access dynamo DB instead of AWS key.
// So we don't need to pass AWS key.
dynamoose.aws.sdk.config.update({
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
