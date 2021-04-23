/**
 * Copy member history form one user to another one (for testing purposes)
 *
 * Usage:
 *    ```
 *    npm run copy-member -- <sourceMemberHandle> <targetMemberHandle>"
 *    ```
 */
 const _ = require('lodash')
 const logger = require('../src/common/logger')
 const models = require('../src/models')

/**
 * Copy member history form one user to another one
 */
async function copyMemberSkillsHistory (sourceMemberHandle, targetMemberHandle) {
  const skillsHistory = await models.MemberSkillsHistory.get(sourceMemberHandle)

  if (skillsHistory) {
    skillsHistory.handle = targetMemberHandle
    logger.debug(`skillsHistory: ${JSON.stringify(skillsHistory)}`)
    await models.MemberSkillsHistory.create(skillsHistory)
  } else {
    logger.debug(`member skills history not found for ${sourceMemberHandle}`)
  }
}

const [sourceMemberHandle, targetMemberHandle] = process.argv.slice(2)

if (!sourceMemberHandle || !targetMemberHandle) {
    logger.logFullError('Please, provide member handles to copy like "npm run copy-member -- <sourceMemberHandle> <targetMemberHandle>"')
    process.exit(1)
}

copyMemberSkillsHistory(sourceMemberHandle, targetMemberHandle)
  .then(() => {
    logger.info('Done')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })