FROM node:10.11.0-alpine

COPY ./src /action

ENTRYPOINT ["/action/entrypoint.sh"]

LABEL "com.github.actions.name"="Repository Visibility SMS Alert"
LABEL "com.github.actions.description"="Notifies active organization owners that a repository has been made public and allows them to react via SMS"
LABEL "com.github.actions.icon"="lock"
LABEL "com.github.actions.color"="red"
LABEL "repository"="http://github.com/bitoiu/repo-visibility-alert-action"
LABEL "homepage"="http://github.com/bitoiu"
LABEL "maintainer"="http://github.com/bitoiu"
