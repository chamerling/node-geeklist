var OAuth = require('oauth').OAuth

var Geeklist = function (options) {
  this.options = options

  this.consumer = {
      key    : options.consumer_key
    , secret : options.consumer_secret
  }

  if (options.access_token && options.access_secret) {
    this.access = {
        token: options.access_token
      , secret: options.access_secret
    }
  }

  this.usePin = options.usePin || false

  this.callback = options.callback

  this.apiServer = options.api_server || 'http://api.geekli.st'
  this.wwwServer = options.www_server || 'http://geekli.st'

  var requestUrl = this.apiServer + '/v1/oauth/request_token'
  var accessUrl = requestUrl.replace('request', 'access')

  this.client = new OAuth(
      requestUrl
    , accessUrl
    , this.consumer.key
    , this.consumer.secret
    , '1.0A'
    , this.usePin ? 'oob' : this.callback
    , 'HMAC-SHA1'
  )
}


/**
 * Constructs Full API url
 *
 * @param {String} url: End resource url
 * @return {String}
 */

Geeklist.prototype._makeUrl = function(url) {
  return this.apiServer + '/v1/' + url
}

Geeklist.prototype._parseUrl = function(url) {
  return url.parse(url, true).query
}

Geeklist.prototype._authorize = function(callback) {
  var self = this

  this.client.getOAuthRequestToken(function(err, token, secret, res) {
    if (err) return callback(err)

    var obj = {
        token: token
      , secret: secret
      , auth_url: self.wwwServer + '/oauth/authorize?oauth_token=' + token
    }

    callback(null, obj)
  })
}

Geeklist.prototype._getAccess = function(token, secret, verifier, callback) {
  var self = this

  this.client.getOAuthAccessToken(
      token
    , secret
    , verifier
    , function(err, token, secret, res) {
        if (err) return callback(err)

        var obj = {
            token: token
          , secret: secret
          , res: res
        }

        callback(null, obj)
      }
  )
}

Geeklist.prototype._callback = function(tokens, callback) {
  this._getAccess(
      tokens.token
    , tokens.secret
    , tokens.verifier
    , callback
  )
}


Geeklist.prototype._pin = function(pin, tokens, callback) {
  this._getAccess(
      tokens.token
    , tokens.secret
    , pin
    , callback
  )
}


/**
 * Get resource
 *
 * @param {String} url
 * @param {Object} tokens
 * @param {Callback} callback
 *
 * @api private
 */

Geeklist.prototype._get = function (url, tokens, callback) {
  console.log(url)
  this.client.getProtectedResource(
      this._makeUrl(url)
    , 'get'
    , tokens.token
    , tokens.secret
    , callback
  )
}


/**
 * Post data
 *
 * @param {String} url
 * @param {Object} data
 * @param {Object} tokens
 * @param {Callback} callback
 *
 * @api private
 */

Geeklist.prototype._post = function (url, data, tokens, callback) {
  this.client.post(
      this._makeUrl(url)
    , tokens.access
    , tokens.secret
    , data
    , 'json'
    , callback
  )
}

Geeklist.prototype.auth = function(tokens) {
  this.access = {
      token: tokens.token
    , secret: tokens.secret
  }
}

var Resources = require('./resources')

Geeklist.prototype.user = function() {
  var self = this
  if (!self.access) {
    var err = 'Access token and secret required'
    if (self.errorFn) {
      return self.errorFn(err)
    } else {
      throw new Error(err)
    }
  }

  var resources = new Resources(
      'user'
    , null
    , self.access
    , self
  )

  return resources
}

Geeklist.prototype.users      = require('./users').all
//Geeklist.prototype.cards      = require('./cards')
//Geeklist.prototype.micros     = require('./micros')
//Geeklist.prototype.activities = require('./activities')

Geeklist.prototype.safe = function(fn) {
  function log(err, res) {
    if (err) return console.dir(err)

    console.log(res)
  }

  fn = fn || log

  return fn
}

exports.create = function(options) {
  return new Geeklist(options)
}