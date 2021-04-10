/**
 * Initialize and export all model schemas.
 */

const config = require('config')
const dynamoose = require('dynamoose')

let awsConfigs = {
  // We are using policies to access dynamo DB instead of AWS key.
  // So we don't need to pass AWS key.
  region: config.AMAZON.AWS_REGION
}

if (config.AMAZON.IS_LOCAL_DB) {
  awsConfigs = {
    // when running locally we have to pass some dummy values as AWS Key
    accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
    region: config.AMAZON.AWS_REGION
  }
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
  MemberSkillsHistory: dynamoose.model(config.DB_COLLECTION_MEMBER, require('./MemberSkillsHistory')),
  ChallengeDetail: dynamoose.model(config.DB_COLLECTION_CHALLENGES, require('./ChallengeDetail'))
}
