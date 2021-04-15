/**
 * Fill skills history for one user.
 *
 * This script can be used to call endpoint `PUT /v5/tagger/member-profiles` for all the challenges which are won by one user.
 *
 * How to use:
 *  - set env variables:
 *     AUTH0_URL
 *     AUTH0_AUDIENCE
 *     AUTH0_CLIENT_ID
 *     AUTH0_CLIENT_SECRET
 *     TOPCODER_BASE_API
 *
 *   - run `npm run tag-member -- <memberHandle>`
 */

const _ = require('lodash')
const { default: axios } = require('axios')
const logger = require('../src/common/logger')
const { getM2MToken } = require('../src/common/helper')

// remote URL and token
const TAGGER_BASE_API_URL = process.env.TOPCODER_BASE_API
const TAGGER_TOKEN = null // if token is not provided, then we would use the token generated by `getM2MToken`
// at the moment Submitter Role Id is same for DEV and PROD so we can hardcode it here
const SUBMITTER_RESOURCE_ROLE_ID = process.env.SUBMITTER_RESOURCE_ROLE_ID || '732339e7-8e30-49d7-9198-cccf9451e221'

// Uncomment for LOCAL Tagger API
// const TAGGER_BASE_API_URL = 'http://localhost:3000'
// const TAGGER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoiZW5qdzE4MTBlRHozWFR3U08yUm4yWTljUVRyc3BuM0JAY2xpZW50cyIsImF1ZCI6Imh0dHBzOi8vbTJtLnRvcGNvZGVyLWRldi5jb20vIiwiaWF0IjoxNTUwOTA2Mzg4LCJleHAiOjIxNDc0ODM2NDgsImF6cCI6ImVuancxODEwZUR6M1hUd1NPMlJuMlk5Y1FUcnNwbjNCIiwic2NvcGUiOiJ3cml0ZTpjaGFsbGVuZ2VzIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.ntwpRvzSvWIgJsdaCA5QzbxZeMutpQgVdk-1UI6m6oI'

/**
 * Get user id by user handle from V3 Member Service
 *
 * @param {String} handle user handle
 * @returns Promise<number> user id
 */
async function getMemberIdByHandle (handle) {
  logger.debug(`getMemberIdByHandle "${handle}" from v3`)
  const res = await axios.get(`${process.env.TOPCODER_BASE_API}/v3/members/${handle}`)

  const memberId = _.get(res, 'data.result.content.userId')

  if (_.isUndefined(memberId)) {
    throw new Error(`User with handle: ${handle} doesn't exist`)
  } else {
    logger.debug(`getMemberIdByHandle found user id ${memberId} for handle "${handle}"`)
  }

  return memberId
}

/*
 * Call tagger API for all the challenges won by a user
 */
async function tagMember (memberHandle) {
  const memberId = await getMemberIdByHandle(memberHandle)

  const params = { perPage: 10000, page: 1, resourceRoleId: SUBMITTER_RESOURCE_ROLE_ID }
  let totalSubmittedChallenges = -1
  let totalProcessedChallenges = 0
  while (true) {
    const token = await getM2MToken()
    let challengesIdsRes
    try {
      logger.info('Getting the list of challenges where user submitted...')
      challengesIdsRes = await axios.get(`${process.env.TOPCODER_BASE_API}/v5/resources/${memberId}/challenges`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (err) {
      logger.logFullError(err, {
        component: 'tagMember',
        context: 'GET /resources'
      })
      throw err
    }
    const submittedToChallengeIds = challengesIdsRes.data

    logger.info(`Got the list of challenges where user submitted page: ${params.page}/${challengesIdsRes.headers['x-total-pages']}, count: ${submittedToChallengeIds.length}`)
    totalSubmittedChallenges = challengesIdsRes.headers['x-total']

    const taggerToken = TAGGER_TOKEN || token

    for (const challengeId of submittedToChallengeIds) {
      let challengeRes
      try {
        logger.debug(`Getting challenge object to make sure that user won it: ${challengeId}`)
        challengeRes = await axios.get(`${process.env.TOPCODER_BASE_API}/v5/challenges/${challengeId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      } catch (err) {
        logger.logFullError(err, {
          component: 'tagMember',
          context: 'GET /challenge/:id'
        })
        throw err
      }

      const challenge = challengeRes.data
      const winnerHandles = _.map(challenge.winners || [], (winner) => winner.handle.toLowerCase())

      if (!_.includes(winnerHandles, memberHandle.toLowerCase())) {
        logger.debug(`Challenge is skipped as user haven't won it: ${challengeId}`)
      } else {
        let processRes
        try {
          logger.debug(`Update member profiles for winners "${winnerHandles}" of the challenge: ${challengeId}`)
          processRes = await axios.put(`${TAGGER_BASE_API_URL}/v5/tagger/member-profiles?challengeId=${challengeId}`,
            {},
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
            component: 'tagMember',
            context: 'PUT /member-profiles'
          })
          throw err
        }

        logger.info(`Members Updated: ${processRes.data['Members Updated']}/${winnerHandles.length} for the challenge: ${challengeId}`)
      }

      totalProcessedChallenges += 1
      logger.info(`Progress: ${totalProcessedChallenges}/${totalSubmittedChallenges}`)
    }

    if (parseInt(challengesIdsRes.headers['x-total-pages']) > params.page) {
      params.page = params.page + 1
    } else {
      break
    }
  }
}

if (process.argv.length < 2) {
  logger.logFullError('Provide handle like this "npm run tag-member -- <memberHandle>"')
  process.exit(1)
}

const memberHandle = process.argv[2]

tagMember(memberHandle)
  .then(() => {
    logger.info('Done')
    process.exit()
  })
  .catch((err) => {
    logger.error(err)
    process.exit(1)
  })
