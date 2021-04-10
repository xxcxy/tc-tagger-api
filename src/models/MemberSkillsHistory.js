/**
 * This defines MemberSkillsHistory model.
 */

const config = require('config')
const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  handle: {
    type: String,
    hashKey: true,
    required: true
  },
  LastRefreshedAt: {
    type: String,
    required: false
  },
  history: {
    type: Array,
    required: false,
    schema: [{
      type: Object,
      schema: {
        challengeId: {
          type: String,
          required: false
        },
        Timestamp: {
          type: String,
          required: false
        },
        tags: {
          type: Array,
          required: false,
          schema: [{
            type: Object,
            schema: {
              tag: {
                type: String,
                required: false
              },
              type: {
                type: String,
                required: false
              },
              source: {
                type: String,
                required: false
              }
            }
          }]
        }
      }
    }]
  }
},
{
  throughput: {
    read: Number(config.AMAZON.DYNAMODB_READ_CAPACITY_UNITS),
    write: Number(config.AMAZON.DYNAMODB_WRITE_CAPACITY_UNITS)
  },
  saveUnknown: true,
  useDocumentTypes: true
}
)

module.exports = schema
