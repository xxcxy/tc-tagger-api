/**
 * This defines ChallengeDetail model.
 */

const config = require('config')
const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  id: {
    type: String,
    hashKey: true,
    required: true
  },
  name: {
    type: String,
    required: false
  },
  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false
  },
  track: {
    type: String,
    required: false
  },
  lastRefreshedAt: {
    type: Date,
    required: false
  },
  appealsEndDate: {
    type: Date,
    required: false
  },
  tags: {
    type: Array,
    required: false,
    schema: { type: String }
  },
  outputTags: {
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
  },
  winners: {
    type: Array,
    required: false,
    schema: [{
      type: Object,
      schema: {
        handle: {
          type: String,
          required: false
        },
        placement: {
          type: String,
          required: false
        },
        userId: {
          type: String,
          required: false
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
