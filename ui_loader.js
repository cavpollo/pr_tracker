document.addEventListener('DOMContentLoaded', function () {
    renderRepositoryData();

    // document.getElementById('reload').onclick = function () {
    //     var backgroundPage = chrome.extension.getBackgroundPage();
    //     renderRepositoryData(backgroundPage.userData, backgroundPage.repositoriesData);
    // }
});

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

function renderRepositoryData() {
    chrome.storage.sync.get(null, function (items) {
        var backgroundPage = chrome.extension.getBackgroundPage();
        userData = backgroundPage.userData;
        repositoriesData = backgroundPage.repositoriesData;

        // console.log(userData);
        console.log(repositoriesData);
        // console.log(items);

        sortRepositoryData(repositoriesData);

        var username = userData['username'];

        var repositoriesDiv = document.getElementById('repositories');

        while (repositoriesDiv.firstChild) {
            repositoriesDiv.removeChild(repositoriesDiv.firstChild);
        }

        var reposDoneLoading = true;
        var reposErrorLoading = false;

        var renderedRepositories = false;
        for (var repositoryKey in repositoriesData) {
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

            var renderedPRs = false;
            for (var pullRequestKey in pullRequests) {
                var pullRequest = pullRequests[pullRequestKey];

                if (pullRequest.pr_status === 'OLD') {
                    continue;
                }

                var prDoneLoading = true;
                var prErrorLoading = false;

                if (!(pullRequest.pr_status === 'LOADED' || pullRequest.pr_status === 'UNCHANGED') ||
                    pullRequest.reviews_status !== 'LOADED' ||
                    pullRequest.labels_status !== 'LOADED') {
                    prDoneLoading = false;
                    reposDoneLoading = false;
                }

                if (pullRequest.pr_status === 'ERROR' ||
                    pullRequest.reviews_status === 'ERROR' ||
                    pullRequest.labels_status === 'ERROR') {
                    prErrorLoading = true;
                    reposErrorLoading = true;
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

        if (!renderedRepositories) {
            var noPullRequestsContainerTitleElement = document.createElement('div');
            noPullRequestsContainerTitleElement.className = 'row';

            var noPullRequestsTitleElement = document.createElement('h3');
            noPullRequestsTitleElement.innerHTML = 'No Pull Requests Found.';
            noPullRequestsContainerTitleElement.appendChild(noPullRequestsTitleElement);

            repositoriesDiv.appendChild(noPullRequestsContainerTitleElement);

            var noPullRequestsContainerTextElement = document.createElement('div');
            noPullRequestsContainerTextElement.className = 'row';

            var noPullRequestsTextElement = document.createElement('p');
            noPullRequestsTextElement.innerHTML = 'Try redefining your filters. They may have not matched any record.';
            noPullRequestsContainerTextElement.appendChild(noPullRequestsTextElement);

            repositoriesDiv.appendChild(noPullRequestsContainerTextElement);
        }
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

        if (items['switch-user-approved'] === true && userPresent(pullRequest.approved_reviewers, username)) {
            render = true;
        }

        if (items['switch-user-dismissed'] === true && userPresent(pullRequest.dismissed_reviewers, username)) {
            render = true;
        }

        if (items['switch-user-commented'] === true && userPresent(pullRequest.comment_reviewers, username)) {
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
    var userLinkElement = document.createElement('a');
    userLinkElement.className = 'user-badge';
    userLinkElement.href = user.url;
    userLinkElement.style.borderColor = color;
    userLinkElement.style.backgroundColor = color;

    var assigneeBadgeElement = document.createElement('img');
    assigneeBadgeElement.className = 'user-badge';
    assigneeBadgeElement.src = user.avatar_url;
    assigneeBadgeElement.title = user.username + ' - ' + statusText;
    assigneeBadgeElement.alt = user.username + ' - ' + statusText;

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


// TODO: Mark the status of the repositories as RENDERED once they have been drawn
//       and selectively redraw them when needed(?)
function renderRepositoryDataOld(userData, repositoriesData) {
    sortRepositoryData(repositoriesData);

    console.log(userData);

    var username = userData['username'];

    console.log(repositoriesData);

    var repositoriesDiv = document.getElementById('repositories');

    var prUserFilter = document.getElementById('pr_user_filter');
    var prUserFilterValue = prUserFilter.options[prUserFilter.selectedIndex].value;

    var prStatusFilter = document.getElementById('pr_status_filter');
    var prStatusFilterValue = prStatusFilter.options[prStatusFilter.selectedIndex].value;

    var repositoriesHtml = '';

    var reposDoneLoading = true;
    var reposErrorLoading = false;

    var repoCount = 0;
    var prCount = 0;

    for (var repositoryKey in repositoriesData) {
        var repository = repositoriesData[repositoryKey];
        var pullRequests = repository.pull_requests;

        if (pullRequests === undefined || Object.keys(pullRequests).length === 0 || repository.status === 'OLD') {
            continue;
        }

        var repositoryHtml = '<div style="background-color: #93bcff; margin-bottom: 8px; padding: 2px 8px 2px 8px; border-radius: 8px;">\n';
        repositoryHtml += '<h2><a href="' + repository.url + '">' + repository.full_name + '</a></h2>\n';
        repositoryHtml += '<div>\n';

        var anyPR = false;
        var tempPrCount = 0;

        for (var pullRequestKey in pullRequests) {
            var pullRequest = pullRequests[pullRequestKey];

            if (pullRequest.pr_status === 'OLD') {
                continue;
            }

            var prDoneLoading = true;
            var prErrorLoading = false;

            if (!(pullRequest.pr_status === 'LOADED' || pullRequest.pr_status === 'UNCHANGED') ||
                pullRequest.reviews_status !== 'LOADED' ||
                pullRequest.labels_status !== 'LOADED') {
                prDoneLoading = false;
                reposDoneLoading = false;
            }

            if (pullRequest.pr_status === 'ERROR' ||
                pullRequest.reviews_status === 'ERROR' ||
                pullRequest.labels_status === 'ERROR') {
                prErrorLoading = true;
                reposErrorLoading = true;
            }

            var imPending = false;
            var isMine = false;
            var interacted = false;

            var approved = pullRequest.rejected_reviewers.length === 0 && pullRequest.approved_reviewers.length > 0;
            var noApprovals = pullRequest.rejected_reviewers.length === 0 && pullRequest.approved_reviewers.length === 0;
            var canBeMerged = pullRequest.mergeable !== null && pullRequest.mergeable === true;
            var statusText = approved ? (canBeMerged ? 'ALL GOOD' : 'CONFLICTS MUST BE FIXED') : (noApprovals ? 'APPROVAL REQUIRED' : 'CHANGES REQUESTED');
            var createdDate = new Date(pullRequest.created_at);

            var pullRequestHTML = '<div style="margin: 0 0 8px 0; padding: 2px 8px 8px 8px; background-color: #ffffff; border-radius: 4px;">\n';
            pullRequestHTML += '<table>\n';
            pullRequestHTML += '<tr>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: ' + (approved ? (canBeMerged ? '#00ae11' : '#ddde00') : '#b40900') + '; border-radius: 4px;" title="' + statusText + '" alt="' + statusText + '"></div>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<h3><a href="' + pullRequest.url + '">' + pullRequest.title + '</a>' + (prErrorLoading ? ' - Error loading data =(' : (prDoneLoading ? '' : ' - Loading data, please wait.')) + '</h3>\n';
            pullRequestHTML += '<p style="margin-left: 8px;"><b>' + pullRequest.head_name + '</b> --merge into--&gt; <b>' + pullRequest.base_name + '</b></p>\n';
            pullRequestHTML += '<p style="margin-left: 8px;">Created at ' + formatDate(createdDate) + ' by ' + pullRequest.created_by + ' - ' + pullRequest.changed_files + ' files ' + '</p>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<div style="width: 32px;"></div>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td style="vertical-align: bottom;">\n';

            if (username === pullRequest.created_by) {
                isMine = true;
            }

            if (pullRequest.assignees.length === 0) {
                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; line-height: 36px; display: inline-block; background-color: #444444; color: #ffffff; vertical-align:middle; text-align:center; border-radius: 4px;">?</div>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var i = 0, assignee; assignee = pullRequest.assignees[i]; i++) {
                if (username === assignee.username) {
                    isMine = true;
                    interacted = true;
                }

                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<a href="' + assignee.url + '">\n';
                pullRequestHTML += '<img src="' + assignee.avatar_url + '" style="height: 36px; width: 36px;" title="' + assignee.username + '" alt="' + assignee.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<div style="width: 8px;"></div>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td style="vertical-align: bottom;">\n';


            for (var i = 0, reviewer; reviewer = pullRequest.rejected_reviewers[i]; i++) {
                if (username === reviewer.username) {
                    interacted = true;
                }

                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #b40900; border-radius: 4px;" title="REJECTED" alt="REJECTED"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var i = 0, reviewer; reviewer = pullRequest.comment_reviewers[i]; i++) {

                var commentedOnSelf = false;
                for (var l = 0, assignee; assignee = pullRequest.assignees[l]; l++) {
                    if (assignee.username === reviewer.username) {
                        commentedOnSelf = true;
                        break;
                    }
                }

                if (commentedOnSelf || pullRequest.created_by === reviewer.username) {
                    continue;
                }

                if (username === reviewer.username) {
                    interacted = true;
                }

                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #a8a8a8; border-radius: 4px;" title="COMMENT" alt="COMMENT"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var i = 0, reviewer; reviewer = pullRequest.pending_reviewers[i]; i++) {
                if (username === reviewer.username) {
                    imPending = true;
                    interacted = true;
                }

                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #ddde00; border-radius: 4px;" title="INVITED" alt="INVITED"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var i = 0, reviewer; reviewer = pullRequest.approved_reviewers[i]; i++) {
                if (username === reviewer.username) {
                    interacted = true;
                }

                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #00ae11; border-radius: 4px;" title="APPROVED" alt="APPROVED"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var i = 0, reviewer; reviewer = pullRequest.dismissed_reviewers[i]; i++) {
                if (username === reviewer.username) {
                    interacted = true;
                }

                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #55007f; border-radius: 4px;" title="DISMISSED" alt="DISMISSED"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<div style="width: 16px;"></div>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';

            for (var i = 0, label; label = pullRequest.labels[i]; i++) {
                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 72px; height: 36px; line-height: 36px; display: inline-block; background-color: #' + label.color + '; vertical-align:middle; text-align:center; border-radius: 4px;">\n';
                pullRequestHTML += '<b>' + label.name + '</b>\n';
                pullRequestHTML += '</div>\n';
                pullRequestHTML += '</div>\n';
            }

            pullRequestHTML += '</td>\n';
            pullRequestHTML += '</tr>\n';
            pullRequestHTML += '</table>\n';
            pullRequestHTML += '</div>\n';


            if (prUserFilterValue === 'all' ||
                (prUserFilterValue === 'pending' && imPending) ||
                (prUserFilterValue === 'mine' && isMine) ||
                (prUserFilterValue === 'interacted' && interacted)) {

                if (prStatusFilterValue === 'all' ||
                    (prStatusFilterValue === 'no_reviews' && !approved && noApprovals) ||
                    (prStatusFilterValue === 'rejected' && !approved && !noApprovals) ||
                    (prStatusFilterValue === 'conflict' && approved && !canBeMerged) ||
                    (prStatusFilterValue === 'approved' && approved && canBeMerged) ||
                    (prStatusFilterValue === 'approved_no_pending' && approved && canBeMerged && pullRequest.pending_reviewers.length === 0)) {
                    repositoryHtml += pullRequestHTML;
                    tempPrCount++;
                    anyPR = true;
                }
            }
        }

        repositoryHtml += '</div>\n';
        repositoryHtml += '</div>\n';

        if (anyPR === true) {
            repositoriesHtml += repositoryHtml;
            prCount = prCount + tempPrCount;
            repoCount++;
        }
    }

    repositoriesDiv.innerHTML = repositoriesHtml;

    var loadStatusDiv = document.getElementById('status');

    var loadStatusHTML = '';
    loadStatusHTML += '<div>\n';
    loadStatusHTML += repoCount + ' repositories - ' + prCount + ' pull requests - ';
    if (reposDoneLoading) {
        loadStatusHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #3ab400; border-radius: 18px;" title="DONE LOADING" alt="DONE LOADING"></div>\n';
    } else {
        if (reposErrorLoading) {
            loadStatusHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #b40004; border-radius: 18px;" title="ERROR LOADING" alt="ERROR LOADING"></div>\n';
        } else {
            loadStatusHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #b2b400; border-radius: 18px;" title="LOADING" alt="LOADING"></div>\n';
        }
    }
    loadStatusHTML += '</div>\n';

    loadStatusDiv.innerHTML = loadStatusHTML;
}

function formatDate(date) {
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return day + ' ' + monthNames[monthIndex] + ' ' + year;
}