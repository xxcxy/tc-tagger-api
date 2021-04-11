/**
 * This script can be used to call `PUT /v5/tagger/challenge-tag` endpoint for a batch of challenges from Challenge API.
 * Probably we would not need it anymore and can remove.
 *
 * How to use:
 *   - set env variables AUTH0_URL, AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET (se we can get private challenges)
 *   - comment/uncomment TAGGER_BASE_API_URL/TAGGER_TOKEN depend on if you like to use local or DEV environment
 *   - run `npm run tag-challenges`
 */

const _ = require('lodash')
const config = require('config')
const { default: axios } = require('axios')
const logger = require('../src/common/logger')
const { getM2MToken } = require('../src/common/helper')

// local URL and token
const TAGGER_BASE_API_URL = 'http://localhost:3000'
const TAGGER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoiZW5qdzE4MTBlRHozWFR3U08yUm4yWTljUVRyc3BuM0JAY2xpZW50cyIsImF1ZCI6Imh0dHBzOi8vbTJtLnRvcGNvZGVyLWRldi5jb20vIiwiaWF0IjoxNTUwOTA2Mzg4LCJleHAiOjIxNDc0ODM2NDgsImF6cCI6ImVuancxODEwZUR6M1hUd1NPMlJuMlk5Y1FUcnNwbjNCIiwic2NvcGUiOiJ3cml0ZTpjaGFsbGVuZ2VzIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.ntwpRvzSvWIgJsdaCA5QzbxZeMutpQgVdk-1UI6m6oI'

// remote URL and token
// const TAGGER_BASE_API_URL = 'https://api.topcoder-dev.com'
// const TAGGER_TOKEN = null // if token is not provided, then we would use the token generated by `getM2MToken`

/*
 * Call tagger API for the challenges from API
 */
async function tagChallenges () {
  const params = { perPage: 1, page: 1, status: 'Active' }
  while (true) {
    const token = await getM2MToken()
    let res
    try {
      res = await axios.get(`${config.CHALLENGE_BASE_URL}/v5/challenges`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (err) {
      logger.logFullError(err, {
        component: 'tagChallenges',
        context: 'GET /challenges'
      })
      throw err
    }
    const challenge = res.data

    logger.info(`Got page ${params.page}/${res.headers['x-total-pages']}, count: ${challenge.length}`)

    const taggerToken = TAGGER_TOKEN || token

    let processRes
    try {
      processRes = await axios.put(`${TAGGER_BASE_API_URL}/v5/tagger/challenge-tags`,
        {
          challengeId: _.map(challenge, 'id')
        },
        {
          timeout: 60 * 1000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${taggerToken}`
          }
        }
      )
    } catch (err) {
      logger.logFullError(err, {
        component: 'tagChallenges',
        context: 'PUT /challenge-tags'
      })
      throw err
    }

    logger.info(`Challenges processed: ${processRes.data['Challenges Updated']}`)

    if (parseInt(res.headers['x-total-pages']) > params.page) {
      params.page = params.page + 1
    } else {
      break
    }
  }
}

tagChallenges()
  .then(() => {
    logger.info('Done')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })