function sortRepositoryData(repositoriesData) {
    for (var repositoryKey in repositoriesData) {
        var repository = repositoriesData[repositoryKey];

        for (var pullRequestKey in repository.pull_requests) {
            var pullRequest = repository.pull_requests[pullRequestKey];
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
        }
    }
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
        // for (var repositoryKey in repositoriesData) {
        //     if(repositoriesData[repositoryKey].status !== 'LOADED'){
        //         console.log(repositoriesData[repositoryKey].name + ': ' + repositoriesData[repositoryKey].status);
        //     }
        // }

        sortRepositoryData(repositoriesData);

        var username = userData['username'];

        var repositoriesDiv = document.createElement('div');

        var repositoryKeysSorted = [];
        for (var repositoryKey in repositoriesData) {
            repositoryKeysSorted.push(repositoryKey);
        }
        repositoryKeysSorted.sort();

        var renderedRepositories = false;
        for (var i = 0, repositoryKey; repositoryKey = repositoryKeysSorted[i]; i++) {
            var repository = repositoriesData[repositoryKey];
            var pullRequests = repository.pull_requests;

            if (pullRequests === undefined || Object.keys(pullRequests).length === 0 || repository.status === 'OLD') {
                continue;
            }

            var repositoryElement = document.createElement('div');
            repositoryElement.className = 'repository row';

            var repositoryContentElement = document.createElement('div');
            repositoryContentElement.className = 'small-12';

            var repositoryTitleElement = getRepositoryTitleElement(repository, items);
            repositoryContentElement.appendChild(repositoryTitleElement);

            var repositoryPullRequestsElement = document.createElement('div');
            repositoryPullRequestsElement.id = repository.id;
            repositoryPullRequestsElement.className = 'pull-requests';
            if (items['switch-expanded'] === false) {
                repositoryPullRequestsElement.className += ' hide-repository-content';
            }

            var pullRequestKeyDatesSorted = [];
            for (var pullRequestKey in pullRequests) {
                pullRequestKeyDatesSorted.push({key: pullRequestKey, date: pullRequests[pullRequestKey].created_at});
            }
            pullRequestKeyDatesSorted.sort(function (a, b) {
                return b.date.localeCompare(a.date);
            });

            var renderedPRs = false;
            for (var j = 0, pullRequestKeyDate; pullRequestKeyDate = pullRequestKeyDatesSorted[j]; j++) {
                var pullRequest = pullRequests[pullRequestKeyDate.key];

                if (pullRequest.pr_status === 'OLD') {
                    continue;
                }

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

                if (!renderPullRequest(pullRequest, items, username)) {
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

function getRepositoryTitleElement(repository, items) {
    var pullRequestTitleElement = document.createElement('span');
    pullRequestTitleElement.className = 'repository-title';

    var pullRequestTitleIconElement = document.createElement('i');
    pullRequestTitleIconElement.className = 'toggle-pull-requests';
    if (items['switch-expanded'] === true) {
        pullRequestTitleIconElement.className += ' fi-arrows-compress';
    } else {
        pullRequestTitleIconElement.className += ' fi-arrows-expand';
    }
    pullRequestTitleIconElement.setAttribute('data-toggle-id', repository.id);

    var pullRequestTitleTextElement = document.createElement('a');
    pullRequestTitleTextElement.className = 'repository-title-text';
    pullRequestTitleTextElement.href = repository.url;
    pullRequestTitleTextElement.innerHTML = repository.full_name; // + ' - ' + (Object.keys(pullRequests).length) + ' PRs';

    pullRequestTitleElement.appendChild(pullRequestTitleIconElement);
    pullRequestTitleElement.appendChild(pullRequestTitleTextElement);

    return pullRequestTitleElement;
}

function getPullRequestCol1Element(pullRequest) {
    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-1 pull-request-column';

    var pullRequestStatusElement = document.createElement('div');
    pullRequestStatusElement.className = 'pull-request-status-block';

    var pullRequestIconStatusElement = document.createElement('i');
    pullRequestIconStatusElement.className = 'pull-request-icon-status';

    var statusText = '?';
    if (pullRequest.pr_status === 'LOADED' || pullRequest.pr_status === 'UNCHANGED') {
        if (pullRequest.rejected_reviewers.length === 0) {
            if (pullRequest.approved_reviewers.length > 0) {
                if (pullRequest.mergeable !== null && pullRequest.mergeable === true) {
                    statusText = 'ALL GOOD';
                    pullRequestStatusElement.style.backgroundColor = '#00ae11';
                    pullRequestIconStatusElement.className += ' fi-check';
                } else {
                    statusText = 'CONFLICTS MUST BE FIXED';
                    pullRequestStatusElement.style.backgroundColor = '#ddde00';
                    pullRequestIconStatusElement.className += ' fi-wrench';
                }
            } else {
                statusText = 'APPROVAL REQUIRED';
                pullRequestStatusElement.style.backgroundColor = '#ff8415';
                pullRequestIconStatusElement.className += ' fi-torsos-all';
            }
        } else {
            statusText = 'CHANGES REQUESTED';
            pullRequestStatusElement.style.backgroundColor = '#b40900';
            pullRequestIconStatusElement.className += ' fi-x';
        }
    } else {
        if (pullRequest.pr_status === 'ERROR' ||
            pullRequest.reviews_status === 'ERROR' ||
            pullRequest.labels_status === 'ERROR') {
            statusText = 'ERROR LOADING DATA';
            pullRequestStatusElement.style.backgroundColor = '#a800a2';
            pullRequestIconStatusElement.className += ' fi-skull';
        } else {
            statusText = 'DATA IS LOADING';
            pullRequestStatusElement.style.backgroundColor = '#a8a8a8';
            pullRequestIconStatusElement.className += ' fi-refresh';
        }
    }

    pullRequestStatusElement.title = statusText;
    pullRequestStatusElement.alt = statusText;

    pullRequestStatusElement.appendChild(pullRequestIconStatusElement);

    pullRequestColElement.appendChild(pullRequestStatusElement);
    return pullRequestColElement;
}

function getPullRequestCol2Element(pullRequest) {
    var createdDate = new Date(pullRequest.created_at);

    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-4 pull-request-column';

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

    pullRequestColElement.appendChild(pullRequestFromBranchElement);
    pullRequestColElement.appendChild(pullRequestToBranchElement);
    pullRequestColElement.appendChild(pullRequestInfoElement);
    return pullRequestColElement;
}

function getPullRequestCol3Element(pullRequest) {
    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-1 pull-request-column';

    if (pullRequest.assignees.length === 0) {
        var noAssigneeElement = document.createElement('div');
        noAssigneeElement.className = 'user-badge';
        noAssigneeElement.innerHTML = '?';
        noAssigneeElement.title = 'NOT ASSIGNED';
        noAssigneeElement.alt = 'NOT ASSIGNED';

        pullRequestColElement.appendChild(noAssigneeElement);
    } else {
        for (var i = 0, assignee; assignee = pullRequest.assignees[i]; i++) {
            var assigneeLinkElement = getUserBadge(assignee, 'ASSIGNED', '#2ba6cb');

            pullRequestColElement.appendChild(assigneeLinkElement);
        }
    }

    return pullRequestColElement;
}

function getPullRequestCol4Element(pullRequest) {
    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-5 pull-request-column';

    for (var i = 0, reviewer; reviewer = pullRequest.rejected_reviewers[i]; i++) {
        var assigneeLinkElement = getUserBadge(reviewer, 'REJECTED', '#b40900');

        pullRequestColElement.appendChild(assigneeLinkElement);
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

        pullRequestColElement.appendChild(assigneeLinkElement);
    }

    for (var i = 0, reviewer; reviewer = pullRequest.pending_reviewers[i]; i++) {
        var assigneeLinkElement = getUserBadge(reviewer, 'INVITED', '#ddde00');

        pullRequestColElement.appendChild(assigneeLinkElement);
    }

    for (var i = 0, reviewer; reviewer = pullRequest.approved_reviewers[i]; i++) {
        var assigneeLinkElement = getUserBadge(reviewer, 'APPROVED', '#00ae11');

        pullRequestColElement.appendChild(assigneeLinkElement);
    }

    for (var i = 0, reviewer; reviewer = pullRequest.dismissed_reviewers[i]; i++) {
        var assigneeLinkElement = getUserBadge(reviewer, 'DISMISSED', '#55007f');

        pullRequestColElement.appendChild(assigneeLinkElement);
    }

    return pullRequestColElement;
}

function getUserBadge(user, statusText, color) {
    var updated_at = new Date(user.updated_at);

    var userLinkElement = document.createElement('a');
    userLinkElement.className = 'user-badge';
    userLinkElement.href = user.url;
    userLinkElement.style.borderColor = color;
    userLinkElement.style.backgroundColor = color;

    var assigneeBadgeElement = document.createElement('img');
    assigneeBadgeElement.className = 'user-badge';
    assigneeBadgeElement.src = user.avatar_url;
    assigneeBadgeElement.title = user.username + ' - ' + statusText + ' - ' + formatDateTime(updated_at);
    assigneeBadgeElement.alt = user.username + ' - ' + statusText + ' - ' + formatDateTime(updated_at);

    userLinkElement.appendChild(assigneeBadgeElement);

    return userLinkElement;
}

function getPullRequestCol5Element(pullRequest) {
    var pullRequestColElement = document.createElement('div');
    pullRequestColElement.className = 'small-1 pull-request-column';

    for (var i = 0, label; label = pullRequest.labels[i]; i++) {
        var labelElement = document.createElement('div');
        labelElement.className = 'pr-label';
        labelElement.innerHTML = label.name;
        labelElement.style.backgroundColor = '#' + label.color;
        labelElement.style.color = invertColor(label.color);

        pullRequestColElement.appendChild(labelElement);
    }

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