function sortRepositoryData(groupBy, repositoriesData) {
    var groupedPRs = {};
    var counter = 0;

    switch (groupBy) {
        case 'assignee':
            for (var repositoryKey in repositoriesData) {
                var repository = repositoriesData[repositoryKey];
                var pullRequests = repository.pull_requests;

                var sortedPullRequest = sortPullRequests(pullRequests);

                for (var i = 0, pullRequest; pullRequest = sortedPullRequest[i]; i++) {
                    for (var j = 0, assignee; assignee = pullRequest.assignees[j]; j++) {
                        if (groupedPRs[assignee.id] === undefined) {
                            var group = {
                                id: counter,
                                name: assignee.username,
                                url: assignee.url,
                                pull_requests: [pullRequest]
                            };

                            groupedPRs[assignee.id] = group;
                            counter++;
                        } else {
                            groupedPRs[assignee.id].pull_requests.push(pullRequest);
                        }
                    }
                }
            }

            break;
        case 'status':
            for (var repositoryKey in repositoriesData) {
                var repository = repositoriesData[repositoryKey];
                var pullRequests = repository.pull_requests;

                var sortedPullRequest = sortPullRequests(pullRequests);

                for (var i = 0, pullRequest; pullRequest = sortedPullRequest[i]; i++) {
                    var textStatus = '?';

                    var displayStatus = getPullRequestDisplayStatus(pullRequest);
                    switch (displayStatus) {
                        case 'OK':
                            textStatus = 'ALL GOOD';
                            break;
                        case 'CONFLICTS':
                            textStatus = 'CONFLICTS MUST BE FIXED';
                            break;
                        case 'APPROVAL_REQUIRED':
                            textStatus = 'APPROVAL REQUIRED';
                            break;
                        case 'REJECTED':
                            textStatus = 'CHANGES REQUESTED';
                            break;
                        case 'ERROR':
                            textStatus = 'ERROR LOADING DATA';
                            break;
                        case 'LOADING':
                            textStatus = 'DATA IS LOADING';
                            break;
                        default:
                            textStatus = 'INTERNAL ERROR';
                            break;
                    }

                    if (groupedPRs[displayStatus] === undefined) {
                        var group = {
                            id: counter,
                            name: textStatus,
                            url: null,
                            pull_requests: [pullRequest]
                        };

                        groupedPRs[displayStatus] = group;
                        counter++;
                    } else {
                        groupedPRs[displayStatus].pull_requests.push(pullRequest);
                    }
                }
            }

            break;
        case 'label':
            for (var repositoryKey in repositoriesData) {
                var repository = repositoriesData[repositoryKey];
                var pullRequests = repository.pull_requests;

                var sortedPullRequest = sortPullRequests(pullRequests);

                for (var i = 0, pullRequest; pullRequest = sortedPullRequest[i]; i++) {
                    for (var j = 0, label; label = pullRequest.labels[j]; j++) {
                        if (groupedPRs[label.name] === undefined) {
                            var group = {
                                id: counter,
                                name: label.name,
                                url: null,
                                pull_requests: [pullRequest]
                            };

                            groupedPRs[label.name] = group;
                            counter++;
                        } else {
                            groupedPRs[label.name].pull_requests.push(pullRequest);
                        }
                    }
                }
            }

            break;
        case 'repository':
        default:
            for (var repositoryKey in repositoriesData) {
                var repository = repositoriesData[repositoryKey];

                var sortedPullRequest = sortPullRequests(repository.pull_requests);

                var group = {
                    id: counter,
                    name: repository.full_name,
                    url: repository.url,
                    pull_requests: sortedPullRequest
                };

                groupedPRs[repository.id] = group;
                counter++;
            }
            break;
    }

    var groupWithName = [];
    for (var groupKey in groupedPRs) {
        var group = groupedPRs[groupKey];
        groupWithName.push({value: group, name: group.name});
    }

    groupWithName.sort(function (a, b) {
        return a.name.localeCompare(b.name);
    });

    var sortedGroups = [];
    for (var i = 0, group; group = groupWithName[i]; i++) {
        sortedGroups.push(group.value);
    }

    return sortedGroups;
}

function sortPullRequests(pullRequests){
    var pullRequestsWithDate = [];
    for (var pullRequestKey in pullRequests) {
        var pullRequest = pullRequests[pullRequestKey];

        pullRequest.assignees.sort(function (a, b) {
            return a.username.localeCompare(b.username);
        });

        pullRequest.pending_reviewers.sort(function (a, b) {
            return a.username.localeCompare(b.username);
        });

        pullRequest.rejected_reviewers.sort(function (a, b) {
            return a.username.localeCompare(b.username);
        });

        pullRequest.approved_reviewers.sort(function (a, b) {
            return a.username.localeCompare(b.username);
        });

        pullRequest.comment_reviewers.sort(function (a, b) {
            return a.username.localeCompare(b.username);
        });

        pullRequest.dismissed_reviewers.sort(function (a, b) {
            return a.username.localeCompare(b.username);
        });

        pullRequest.labels.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });

        pullRequestsWithDate.push({value: pullRequest, date: pullRequest.created_at});
    }

    pullRequestsWithDate.sort(function (a, b) {
        return b.date.localeCompare(a.date);
    });

    var sortedPullRequests = [];
    for (var i = 0, pullRequest; pullRequest = pullRequestsWithDate[i]; i++) {
        sortedPullRequests.push(pullRequest.value);
    }

    return sortedPullRequests;
}

function getRepositoryData(callback) {
    chrome.storage.sync.get(null, function (items) {
        var backgroundPage = chrome.extension.getBackgroundPage();
        var userData = backgroundPage.userData;
        var repositoriesData = backgroundPage.repositoriesData;
        var dataTS = backgroundPage.dataTS;

        // console.log(userData);
        // console.log(repositoriesData);
        // console.log(items);

        var groupedData = sortRepositoryData(items['pr-group-by'], repositoriesData);

        var username = userData['username'];

        var repositoriesDiv = document.createElement('div');

        var renderedRepositories = false;
        for (var i = 0, group; group = groupedData[i]; i++) {
            var pullRequests = group.pull_requests;

            if (pullRequests === undefined || pullRequests.length === 0) {
                continue;
            }

            var repositoryElement = document.createElement('div');
            repositoryElement.className = 'repository row';

            var repositoryContentElement = document.createElement('div');
            repositoryContentElement.className = 'small-12';

            var repositoryTitleElement = getRepositoryTitleElement(group, items);
            repositoryContentElement.appendChild(repositoryTitleElement);

            var repositoryPullRequestsElement = document.createElement('div');
            repositoryPullRequestsElement.id = group.id;
            repositoryPullRequestsElement.className = 'pull-requests';
            if (items['switch-expanded'] === false) {
                repositoryPullRequestsElement.className += ' hide-repository-content';
            }

            var renderedPRs = false;
            for (var j = 0, pullRequest; pullRequest = pullRequests[j]; j++) {
                // console.log(pullRequest.pr_status + ': ' + group.name + ' -- ' + pullRequest.title);
                // if (pullRequest.pr_status === 'OLD') {
                //     continue;
                // }

                var prDoneLoading = true;
                var prErrorLoading = false;

                if (!(pullRequest.pr_status === 'LOADED' || pullRequest.pr_status === 'UNCHANGED') ||
                    pullRequest.reviews_status !== 'LOADED' ||
                    pullRequest.labels_status !== 'LOADED') {
                    prDoneLoading = false;
                }

                if (pullRequest.pr_status === 'ERROR' ||
                    pullRequest.reviews_status === 'ERROR' ||
                    pullRequest.labels_status === 'ERROR') {
                    prErrorLoading = true;
                }

                var shouldRenderPR = renderPullRequest(pullRequest, items, username);
                if (!shouldRenderPR) {
                    continue;
                }

                renderedPRs = true;

                var pullRequestBlobElement = document.createElement('div');
                pullRequestBlobElement.className = 'pull-request';

                var pullRequestTitleElement = document.createElement('div');
                pullRequestTitleElement.className = 'pull-request-title';

                var pullRequestTitleLinkElement = document.createElement('a');
                pullRequestTitleLinkElement.className = 'pull-request-title-link';
                pullRequestTitleLinkElement.href = pullRequest.url;
                pullRequestTitleLinkElement.innerHTML = pullRequest.title;
                pullRequestTitleElement.appendChild(pullRequestTitleLinkElement);

                pullRequestBlobElement.appendChild(pullRequestTitleElement);

                var pullRequestElement = document.createElement('div');
                pullRequestElement.className = 'row pull-request-row';

                var pullRequestCol1Element = getPullRequestCol1Element(pullRequest);
                var pullRequestCol2Element = getPullRequestCol2Element(pullRequest);
                var pullRequestCol3Element = getPullRequestCol3Element(pullRequest);
                var pullRequestCol4Element = getPullRequestCol4Element(pullRequest);
                var pullRequestCol5Element = getPullRequestCol5Element(pullRequest);

                pullRequestElement.appendChild(pullRequestCol1Element);
                pullRequestElement.appendChild(pullRequestCol2Element);
                pullRequestElement.appendChild(pullRequestCol3Element);
                pullRequestElement.appendChild(pullRequestCol4Element);
                pullRequestElement.appendChild(pullRequestCol5Element);

                pullRequestBlobElement.appendChild(pullRequestElement);

                repositoryPullRequestsElement.appendChild(pullRequestBlobElement);
            }

            if (renderedPRs) {
                repositoryContentElement.appendChild(repositoryPullRequestsElement);

                repositoryElement.appendChild(repositoryContentElement);

                repositoriesDiv.appendChild(repositoryElement);

                renderedRepositories = true;
            }
        }

        var reposDoneLoading = true;
        var reposErrorLoading = false;
        for (var repositoryKey in repositoriesData) {
            var pullRequests = repositoriesData[repositoryKey].pull_requests;
            for (var pullRequestKey in pullRequests) {
                var pullRequest = pullRequests[pullRequestKey];

                if (pullRequest.pr_status === 'LOADING' || pullRequest.pr_status === 'ERROR' ||
                    pullRequest.reviews_status === 'LOADING' || pullRequest.reviews_status === 'ERROR' ||
                    pullRequest.labels_status === 'LOADING' || pullRequest.labels_status === 'ERROR') {
                    reposDoneLoading = false;
                }

                if (pullRequest.pr_status === 'ERROR' ||
                    pullRequest.reviews_status === 'ERROR' ||
                    pullRequest.labels_status === 'ERROR') {
                    reposErrorLoading = true;
                }
            }
        }

        if (!repositoriesDiv) {
            var noPullRequestsContainerTitleElement = document.createElement('div');
            noPullRequestsContainerTitleElement.className = 'row';

            var noPullRequestsTitleElement = document.createElement('h3');
            if (reposDoneLoading) {
                noPullRequestsTitleElement.innerHTML = 'No Pull Requests found.';
            } else {
                noPullRequestsTitleElement.innerHTML = 'Pull Requests are being loaded.';
            }
            noPullRequestsContainerTitleElement.appendChild(noPullRequestsTitleElement);

            repositoriesDiv.appendChild(noPullRequestsContainerTitleElement);

            var noPullRequestsContainerTextElement = document.createElement('div');
            noPullRequestsContainerTextElement.className = 'row';

            var noPullRequestsTextElement = document.createElement('p');
            if (reposDoneLoading) {
                noPullRequestsTextElement.innerHTML = 'Try redefining your filters. They may have not matched any record.';
            } else {
                noPullRequestsTextElement.innerHTML = 'The Pull Request information is being loaded. Please wait.';
            }
            noPullRequestsContainerTextElement.appendChild(noPullRequestsTextElement);

            repositoriesDiv.appendChild(noPullRequestsContainerTextElement);
        }

        callback(repositoriesDiv, dataTS, reposDoneLoading, reposErrorLoading);
    });
}

function renderPullRequest(pullRequest, items, username) {
    var render = false;
    if (items['switch-all'] === true) {
        render = true;
    } else {
        if (pullRequest.rejected_reviewers.length > 0) {
            if (items['switch-pr-rejected'] === true) {
                render = true;
            }
        } else {
            if (pullRequest.approved_reviewers.length > 0) {
                if (items['switch-pr-approved'] === true) {
                    render = true;
                }
            } else {
                if (items['switch-pr-not-reviewed'] === true) {
                    render = true;
                }
            }
        }

        if (items['switch-pr-dismissed'] === true && pullRequest.dismissed_reviewers.length > 0) {
            render = true;
        }

        if (items['switch-pr-merge-conflict'] === true && pullRequest.mergeable !== null && pullRequest.mergeable === false) {
            render = true;
        }

        if (items['switch-user-rejected'] === true && userPresent(pullRequest.rejected_reviewers, username)) {
            render = true;
        }

        if (items['switch-user-commented'] === true && userPresent(pullRequest.comment_reviewers, username)) {
            render = true;
        }

        if (items['switch-user-pending-to-review'] === true && userPresent(pullRequest.pending_reviewers, username)) {
            render = true;
        }

        if (items['switch-user-approved'] === true && userPresent(pullRequest.approved_reviewers, username)) {
            render = true;
        }

        if (items['switch-user-dismissed'] === true && userPresent(pullRequest.dismissed_reviewers, username)) {
            render = true;
        }

        if (items['switch-user-assigned'] === true && userPresent(pullRequest.assignees, username)) {
            render = true;
        }

        if (items['switch-user-creator'] === true && pullRequest.created_by === username) {
            render = true;
        }
    }

    return render;
}

function userPresent(users, username) {
    var found = false;
    for (var i = 0, user; user = users[i]; i++) {
        if (username === user.username) {
            found = true;
            break;
        }
    }

    return found;
}

function getRepositoryTitleElement(group, items) {
    var pullRequestTitleElement = document.createElement('span');
    pullRequestTitleElement.className = 'repository-title';

    var pullRequestTitleIconElement = document.createElement('i');
    pullRequestTitleIconElement.className = 'toggle-pull-requests';
    if (items['switch-expanded'] === true) {
        pullRequestTitleIconElement.className += ' fi-arrows-compress';
    } else {
        pullRequestTitleIconElement.className += ' fi-arrows-expand';
    }
    pullRequestTitleIconElement.setAttribute('data-toggle-id', group.id);

    var pullRequestTitleTextElement = document.createElement('a');
    pullRequestTitleTextElement.className = 'repository-title-text';
    pullRequestTitleTextElement.href = group.url;
    pullRequestTitleTextElement.innerHTML = group.name;

    pullRequestTitleElement.appendChild(pullRequestTitleIconElement);
    pullRequestTitleElement.appendChild(pullRequestTitleTextElement);

    return pullRequestTitleElement;
}

function getPullRequestDisplayStatus(pullRequest) {
    var statusText = '?';
    if (pullRequest.pr_status === 'LOADED' || pullRequest.pr_status === 'UNCHANGED') {
        if (pullRequest.rejected_reviewers.length === 0) {
            if (pullRequest.approved_reviewers.length > 0) {
                if (pullRequest.mergeable !== null && pullRequest.mergeable === true) {
                    statusText = 'OK';
                } else {
                    statusText = 'CONFLICTS';
                }
            } else {
                statusText = 'APPROVAL_REQUIRED';
            }
        } else {
            statusText = 'REJECTED';
        }
    } else {
        if (pullRequest.pr_status === 'ERROR' ||
            pullRequest.reviews_status === 'ERROR' ||
            pullRequest.labels_status === 'ERROR') {
            statusText = 'ERROR';
        } else {
            statusText = 'LOADING';
        }
    }

    return statusText;
}

function getPullRequestCol1Element(pullRequest) {
    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-1 pull-request-column';

    var pullRequestStatusElement = document.createElement('div');
    pullRequestStatusElement.className = 'pull-request-status-block';

    var pullRequestIconStatusElement = document.createElement('i');
    pullRequestIconStatusElement.className = 'pull-request-icon-status';

    var bgColor = '';
    var iconClass = '';
    var textStatus = '';

    var displayStatus = getPullRequestDisplayStatus(pullRequest);
    switch (displayStatus) {
        case 'OK':
            bgColor = '#00ae11';
            iconClass = 'fi-check';
            textStatus = 'ALL GOOD';
            break;
        case 'CONFLICTS':
            bgColor = '#ddde00';
            iconClass = 'fi-wrench';
            textStatus = 'CONFLICTS MUST BE FIXED';
            break;
        case 'APPROVAL_REQUIRED':
            bgColor = '#ff8415';
            iconClass = 'fi-torsos-all';
            textStatus = 'APPROVAL REQUIRED';
            break;
        case 'REJECTED':
            bgColor = '#b40900';
            iconClass = 'fi-x';
            textStatus = 'CHANGES REQUESTED';
            break;
        case 'ERROR':
            bgColor = '#a800a2';
            iconClass = 'fi-skull';
            textStatus = 'ERROR LOADING DATA';
            break;
        case 'LOADING':
            bgColor = '#a8a8a8';
            iconClass = 'fi-refresh';
            textStatus = 'DATA IS LOADING';
            break;
        default:
            bgColor = '#222222';
            iconClass = 'fi-x';
            textStatus = 'INTERNAL ERROR';
            break;
    }

    pullRequestStatusElement.style.backgroundColor = bgColor;
    pullRequestIconStatusElement.className += ' ' + iconClass;
    pullRequestStatusElement.title = displayStatus;
    pullRequestStatusElement.alt = displayStatus;

    pullRequestStatusElement.appendChild(pullRequestIconStatusElement);

    pullRequestColElement.appendChild(pullRequestStatusElement);
    return pullRequestColElement;
}

function getPullRequestCol2Element(pullRequest) {
    var createdDate = new Date(pullRequest.created_at);

    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-4 pull-request-column';

    var pullRequestDescriptionElement = document.createElement('div');
    pullRequestDescriptionElement.className = 'text-description-block';

    var pullRequestFromBranchElement = document.createElement('div');
    pullRequestFromBranchElement.className = 'text-no-overflow';

    var pullRequestFromBranchTitleElement = document.createElement('span');
    pullRequestFromBranchTitleElement.className = 'pull-request-branch-title';
    pullRequestFromBranchTitleElement.innerHTML = 'From: ';

    var pullRequestFromBranchContentElement = document.createElement('span');
    pullRequestFromBranchContentElement.innerHTML = pullRequest.head_name;

    pullRequestFromBranchElement.appendChild(pullRequestFromBranchTitleElement);
    pullRequestFromBranchElement.appendChild(pullRequestFromBranchContentElement);


    var pullRequestToBranchElement = document.createElement('div');
    pullRequestToBranchElement.className = 'text-no-overflow';

    var pullRequestToBranchTitleElement = document.createElement('span');
    pullRequestToBranchTitleElement.className = 'pull-request-branch-title';
    pullRequestToBranchTitleElement.innerHTML = 'To: ';

    var pullRequestToBranchContentElement = document.createElement('span');
    pullRequestToBranchContentElement.innerHTML = pullRequest.base_name;

    pullRequestToBranchElement.appendChild(pullRequestToBranchTitleElement);
    pullRequestToBranchElement.appendChild(pullRequestToBranchContentElement);


    var pullRequestInfoElement = document.createElement('div');
    pullRequestInfoElement.innerHTML = 'Created at ' + formatDate(createdDate) + ' by ' + pullRequest.created_by + ' - ' + pullRequest.changed_files + ' files';

    pullRequestDescriptionElement.appendChild(pullRequestFromBranchElement);
    pullRequestDescriptionElement.appendChild(pullRequestToBranchElement);
    pullRequestDescriptionElement.appendChild(pullRequestInfoElement);

    pullRequestColElement.appendChild(pullRequestDescriptionElement);

    return pullRequestColElement;
}

function getPullRequestCol3Element(pullRequest) {
    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-1 pull-request-column';

    var pullRequestAssigneesElement = document.createElement('div');
    pullRequestAssigneesElement.className = 'assignees-block';

    if (pullRequest.assignees.length === 0) {
        var noAssigneeElement = document.createElement('div');
        noAssigneeElement.className = 'user-badge';
        noAssigneeElement.innerHTML = '?';
        noAssigneeElement.title = 'NOT ASSIGNED';
        noAssigneeElement.alt = 'NOT ASSIGNED';

        pullRequestAssigneesElement.appendChild(noAssigneeElement);
    } else {
        for (var i = 0, assignee; assignee = pullRequest.assignees[i]; i++) {
            var assigneeLinkElement = getUserBadge(assignee, 'ASSIGNED', '#2ba6cb');

            pullRequestAssigneesElement.appendChild(assigneeLinkElement);
        }
    }

    pullRequestColElement.appendChild(pullRequestAssigneesElement);
    return pullRequestColElement;
}

function getPullRequestCol4Element(pullRequest) {
    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-5 pull-request-column';

    var pullRequestReviewersElement = document.createElement('div');
    pullRequestReviewersElement.className = 'reviewers-block';

    for (var i = 0, reviewer; reviewer = pullRequest.rejected_reviewers[i]; i++) {
        var assigneeLinkElement = getUserBadge(reviewer, 'REJECTED', '#b40900');

        pullRequestReviewersElement.appendChild(assigneeLinkElement);
    }

    for (var i = 0, reviewer; reviewer = pullRequest.comment_reviewers[i]; i++) {
        var commentedOnSelf = pullRequest.created_by === reviewer.username;
        for (var l = 0, assignee; assignee = pullRequest.assignees[l]; l++) {
            if (assignee.username === reviewer.username) {
                commentedOnSelf = true;
                break;
            }
        }

        if (commentedOnSelf) {
            continue;
        }

        var assigneeLinkElement = getUserBadge(reviewer, 'COMMENT', '#a8a8a8');

        pullRequestReviewersElement.appendChild(assigneeLinkElement);
    }

    for (var i = 0, reviewer; reviewer = pullRequest.pending_reviewers[i]; i++) {
        var assigneeLinkElement = getUserBadge(reviewer, 'INVITED', '#ddde00');

        pullRequestReviewersElement.appendChild(assigneeLinkElement);
    }

    for (var i = 0, reviewer; reviewer = pullRequest.approved_reviewers[i]; i++) {
        var assigneeLinkElement = getUserBadge(reviewer, 'APPROVED', '#00ae11');

        pullRequestReviewersElement.appendChild(assigneeLinkElement);
    }

    for (var i = 0, reviewer; reviewer = pullRequest.dismissed_reviewers[i]; i++) {
        var assigneeLinkElement = getUserBadge(reviewer, 'DISMISSED', '#55007f');

        pullRequestReviewersElement.appendChild(assigneeLinkElement);
    }

    pullRequestColElement.appendChild(pullRequestReviewersElement);
    return pullRequestColElement;
}

function getUserBadge(user, statusText, color) {
    var updated_at = user.updated_at === undefined ? '' : ' - ' + formatDateTime(new Date(user.updated_at));

    var userLinkElement = document.createElement('a');
    userLinkElement.className = 'user-badge';
    userLinkElement.href = user.url;
    userLinkElement.style.borderColor = color;
    userLinkElement.style.backgroundColor = color;

    var assigneeBadgeElement = document.createElement('img');
    assigneeBadgeElement.className = 'user-badge';
    assigneeBadgeElement.src = user.avatar_url;
    assigneeBadgeElement.title = user.username + ' - ' + statusText + updated_at;
    assigneeBadgeElement.alt = user.username + ' - ' + statusText + updated_at;

    if (statusText === 'INVITED') {
        assigneeBadgeElement.className += ' pending-review';
    }

    userLinkElement.appendChild(assigneeBadgeElement);

    return userLinkElement;
}

function getPullRequestCol5Element(pullRequest) {
    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-1 pull-request-column';

    var pullRequestLabelBlockElement = document.createElement('div');
    pullRequestLabelBlockElement.className = 'label-block';

    for (var i = 0, label; label = pullRequest.labels[i]; i++) {
        var labelElement = document.createElement('div');
        labelElement.className = 'pr-label';
        labelElement.innerHTML = label.name;
        labelElement.style.backgroundColor = '#' + label.color;
        labelElement.style.color = invertColor(label.color);

        pullRequestLabelBlockElement.appendChild(labelElement);
    }

    pullRequestColElement.appendChild(pullRequestLabelBlockElement);
    return pullRequestColElement;
}

function invertColor(hex) {
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    var r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);

    // http://stackoverflow.com/a/3943023/112731
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186
        ? '#000000'
        : '#FFFFFF';
}

function formatDate(date) {
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return day + ' ' + monthNames[monthIndex] + ' ' + year;
}

function formatDateTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();

    return formatDate(date) + ' ' + hours + ':' + minutes + ' UTC';
}