/**
 * Initialize and export all model schemas.
 */

const config = require('config')
const dynamoose = require('dynamoose')


const awsConfigs = config.AMAZON.IS_LOCAL_DB ?
{
  // when running locally we have to pass some dummy values as AWS Key
  accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
  region: config.AMAZON.AWS_REGION,
} : {
  // We are using policies to access dynamo DB instead of AWS key.
  // So we don't need to pass AWS key.
  region: config.AMAZON.AWS_REGION
}

dynamoose.aws.sdk.config.update(awsConfigs)

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
