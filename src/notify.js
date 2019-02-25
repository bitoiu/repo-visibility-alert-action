// Requires and variable definition

console.dir(process.env)

const client = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN)
const request = require('request-promise')
const log = require('loglevel')
const fs = require('fs')

const notifyMessageTemplate = 'Hey $USER$. The repository $ORG/REPO$ has been made public by $ACTOR$'
const replyMessageTemplate = ', If you want to convert it back to private, reply to this SMS with PRIVATE:$REPO$'
const recipients_url = process.env.NUMBERS
const github_user = process.env.GITHUB_REPOSITORY.split('/')[0]
const github_repo = process.env.GITHUB_REPOSITORY.split('/')[1]

let getRecipients = async function () {

  let options = {url: recipients_url}
  try {

    let body = await request.get(options)
    let recipients_list = []
    log.debug('Users to be notified (pending verification):')
    body.split(/\r\n|\n|\r/).forEach(function (line) {
      log.debug(`${line}`)
      recipients_list.push({
        'name': line.split(':')[0],
        'number': line.split(':')[1]
      })
    })
    return recipients_list
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

let getWebhookData = function () {

  let payload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  return {
    actor: payload.sender.login
  }

}

let getOwners = async function () {

  let options = {

    url: `https://api.github.com/orgs/${github_user}/members`,
    resolveWithFullResponse: true,
    headers: {
      'User-Agent': 'https://github.com/bitoiu',
      'Accept': 'application/vnd.github.v3+json'
    },
    qs: {
      access_token: process.env.GH_TOKEN,
      role: 'admin'
    }
  }

  try {
    let response = await request.get(options)
    if (response.statusCode != 200) {
      if (response.statusCode != 404) {
        log.error('404 Error: Sometimes this happens when the current repository is not part of an organization, but an user account instead.')
      }
      log.error(response.statusCode)
      process.exit(1)
    }
    let owners_list = JSON.parse(response.body).map(user => user.login)
    log.trace(response.body)
    log.debug('List of owners:' + owners_list)
    return owners_list
  } catch (err) {
    log.error(err)
    process.exit(1)
  }
}

let sendMessage = function (recipients) {

  // Message users
  client.messages
    .create({
      body: notifyMessageTemplate,
      from: '+441375350442',
      to: '+447535113049'
    })
}

let getValidRecipients = function (allRecipients, organizationOwners) {

  return allRecipients.filter((recipient) => {
    for (owner of organizationOwners) {
      if (recipient.name == owner) {
        return true
      }
    }
    return false
  })
}

let getPersonalisedMessage = function () {

  return notifyMessageTemplate
    .replace('$ORG/REPO$', process.env.GITHUB_REPOSITORY)
    .replace('$ACTOR$', webhookData.actor)
    .concat(process.env.NOTIFY_ONLY == 'true'
      ? '.'
      : replyMessageTemplate.replace('$REPO$', github_repo)
    )
}

let messageUsers = function (users, message) {

  // Texting multiple times requires looping
  users.forEach(user => {
    log.info(`Texting ${user.name} at ${user.number}`)
    client.messages
      .create({
        body: message.replace('$USER$', user.name),
        from: '+441375350442',
        to: user.number
      })
  })
}

let main = async function () {

  // Get list of recipients on file and current owner list
  [allRecipients, organizationOwners] = await Promise.all([getRecipients(), getOwners()])

  // If there's no recipients on file, exit gracefully
  if (allRecipients.length <= 0) {
    log.warn('No one to notify, recipients file is empty or malformed')
    process.exit(0)
  }

  // Match current owners with recipients on file
  let validRecipients = getValidRecipients(allRecipients, organizationOwners)
  let message = getPersonalisedMessage()
  messageUsers(validRecipients, message)

}

log.setLevel(process.env.LOG_LEVEL || 'info')
const webhookData = getWebhookData()
log.info(`Event data: ${JSON.stringify(webhookData)}`)
main()