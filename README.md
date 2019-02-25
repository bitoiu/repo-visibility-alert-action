## repo-visibility-alert-action

This GitHub Action can be installed in organizations repositories and it will notify the owners via SMS when a repository changes from private to public visibility. This GitHub Action can be configured to just notify the organization owners or it can be configured to work in conjunction with its sibling Action that will allow for users to reply to the SMS to set the repository back to private. You can choose which mode it runs on.    

![example](https://user-images.githubusercontent.com/33058359/53344570-e40ca180-390a-11e9-81fd-41f80826a2ae.png)

🚧 The sibling Action that allows for SMS replies is under development 🚧 

## Pre-requisites

To run this action you'll need:
 - To be part of the [Actions beta](https://github.com/features/actions). 
 - A [Twillio Account and correspondent `account_sid` and `auth_token`](https://www.twilio.com/docs/usage/your-request-to-twilio#credentials). To test this Action one can setup a trial Twilio account.
 - **A text file hosted anywhere** with the list of target owners and their phone numbers. I personally use [GitHub Gists](https://gist.github.com) and get the link of the raw file. Just note that edits to file in Gists change the raw file URL.
 - A [GitHub Personal Access or App Token](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) with scope `read:org` from a user who's at least a member of the organization, but ideally an owner. 
 
## How does it work

**This action only works for organization repositories.**

Assuming all the credentials are in place the logic of this Action is quite simple. It fetches a list of `owner:phone_number` from a file and checks of those listed who are currently organization owners. This is to prevent a situation where an outdated address book would notify non-organization owners or even worse, members that have left the organization. It then proceeds to send an SMS via Twilio everytime a reposisory is made public with information about the repository name and the user responsible for the event. 

This Action itself was designed to be the first part of a pair of Actions that allow for notification and reaction. The second part of this process is an action that is triggered via the Twilio API everytime an owner responds to the first text instructing the repository to be made private again. 

## Setup

### 1. Create the release workflow

Add a new workflow to your `.github/main.workflow` to trigger on `public`. Give it a name representative of our goals here, so something like `Public Repo SMS Alert`:

![new-workflow](https://user-images.githubusercontent.com/33058359/53343917-5c726300-3909-11e9-9a0b-a35ef810b908.png)

### 2. Configure the Action

Create an action that uses this repository `bitoiu/repo-visibility-alert-action@master` or points to Docker Hub at `docker://bitoiu/repo-visibility-alert-action`. Follow that by configuring the secrets and environment variables:

**Required**:
 - `GH_TOKEN`: a [GitHub Personal Access or App Token](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) with scope `read:org`
 - `NUMBERS`: URL pointing to a public hosted file where every line is in the form of `owner_handle:phone-number`, for example `bitoiu:+447535223145`.
 - `ACCOUNT_SID`: The [Twilio account ID](https://www.twilio.com/docs/usage/your-request-to-twilio#credentials)
 - `AUTH_TOKEN`: The [Twilio auth token](https://www.twilio.com/docs/usage/your-request-to-twilio#credentials)

**Optional**:
 - `NOTIFY_ONLY`: default is unset. Setting it to `true` changes the text message to simply notifying the users instead of also prompting them to reply.
 - `LOG_LEVEL`: default is `info`. Can be set to `trace` to check payloads from the GitHub API calls. 

_Note:In case you're wondering why the `env.template` file has more variables than the ones listed above, those are for [local testing purposes](#local-testing), since those variables get set by the GitHub Actions run time._

![action-configuration](https://user-images.githubusercontent.com/33058359/53345740-7f067b00-390d-11e9-8c14-96047ccfca67.png)


### 3. Save (commit) the workflow

Make sure you commit all pending changes. After you've done that your `main.workflow` should look similar to this:

```
workflow "Public Repo SMS Alert" {
  on = "public"
  resolves = ["SMS Alert"]
}

action "SMS Alert" {
  uses = "bitoiu/repo-visibility-alert-action@master"
  secrets = ["ACCOUNT_SID", "AUTH_TOKEN", "NUMBERS", "GH_TOKEN"]
  env = {
    LOG_LEVEL = "trace"
    NOTIFY_ONLY = "true"
  }
}
```

### 6. Testing the workflow!

In order to validate all the settings you can either [test them locally](#local-testing) or setup a test repository; I would suggest the later. Simply toggle the repository from private to public and as long as there's phone numbers listed in the file and the users match current organization owners, the messages will should go through.  

## Local testing

The main script that does the heavy lifting is a NodeJS file. As such you can simply test it like any other node program. Note that to test this Action locally, you'll need to manually set the rest of the environment variables that are provided at runtime like `GITHUB_EVENT_PATH` or `GITHUB_REPOSITORY`, for example, run the following on the repository root: 

```bash
GITHUB_REPOSITORY="YouTestOrg/YourRestRepo" GH_TOKEN="" NUMBERS="" ACCOUNT_SID="" AUTH_TOKEN="" LOG_LEVEL="trace" GITHUB_EVENT_PATH="src/sample-payload.json" NOTIFY_ONLY="true" node src/notify.js
```

If you prefer to test the container directly (which is a tiny bit slower but more reliable) you just need to create a copy of `env.template` named `env`, fill the unset variables and run:

```
docker build -t release . && docker run --env-file=./env release
```

## Pull Requests and Issues are Welcome

Would you want support for multiple adaptors dealing with different SMS or E-mail providers? Do you know how to add emojis to the Twilio messages? Pull Requests are open for business :octocat::heart:
