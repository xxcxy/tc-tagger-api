/**
 * Configure all routes for express app
 */

const _ = require('lodash')
const config = require('config')
const HttpStatus = require('http-status-codes')
const helper = require('./src/common/helper')
const errors = require('./src/common/errors')
const routes = require('./src/routes')
const authenticator = require('tc-core-library-js').middleware.jwtAuthenticator

/**
 * Checks if the source matches the term.
 *
 * @param {Array} source the array in which to search for the term
 * @param {Array | String} term the term to search
 */
function checkIfExists (source, term) {
  let terms

  if (!_.isArray(source)) {
    throw new Error('Source argument should be an array')
  }

  source = source.map(s => s.toLowerCase())

  if (_.isString(term)) {
    terms = term.split(' ')
  } else if (_.isArray(term)) {
    terms = term.map(t => t.toLowerCase())
  } else {
    throw new Error('Term argument should be either a string or an array')
  }

  for (let i = 0; i < terms.length; i++) {
    if (source.includes(terms[i])) {
      return true
    }
  }

  return false
}

/**
 * Configure all routes for express app
 * @param app the express app
 */
module.exports = (app) => {
  // Load all routes
  _.each(routes, (verbs, path) => {
    _.each(verbs, (def, verb) => {
      const controllerPath = `./src/controllers/${def.controller}`
      const method = require(controllerPath)[def.method]; // eslint-disable-line
      if (!method) {
        throw new Error(`${def.method} is undefined`)
      }

      const actions = []
      actions.push((req, res, next) => {
        req.signature = `${def.controller}#${def.method}`
        next()
      })

      // add Authenticator check if route has auth
      if (def.auth) {
        actions.push((req, res, next) => {
          authenticator(_.pick(config, ['AUTH_SECRET', 'VALID_ISSUERS']))(req, res, next)
        })

        actions.push((req, res, next) => {
          if (!req.authUser) {
            return next(new errors.UnauthorizedError('Action is not allowed for invalid token'))
          }

          if (req.authUser.scopes) {
            // M2M
            if (def.scopes && !checkIfExists(def.scopes, req.authUser.scopes)) {
              res.forbidden = true
              next(new errors.ForbiddenError('You are not allowed to perform this action!'))
            } else {
              next()
            }
          } else if ((_.isArray(def.access) && def.access.length > 0) ||
            (_.isArray(def.scopes) && def.scopes.length > 0)) {
            next(new errors.UnauthorizedError('You are not authorized to perform this action'))
          } else {
            next()
          }
        })
      }

      actions.push(method)
      const fullPath = config.get('BASE_PATH') + path
      app[verb](fullPath, helper.autoWrapExpress(actions))
    })
  })

  // Check if the route is not found or HTTP method is not supported
  app.use('*', (req, res) => {
    let url = req.baseUrl
    if (url.indexOf(config.get('BASE_PATH')) === 0) {
      url = url.substring(config.get('BASE_PATH').length)
    }
    const route = routes[url]
    if (route) {
      res.status(HttpStatus.StatusCodes.METHOD_NOT_ALLOWED).json({ message: 'The requested HTTP method is not supported.' })
    } else {
      res.status(HttpStatus.StatusCodes.NOT_FOUND).json({ message: 'The requested resource cannot be found.' })
    }
  })
}
