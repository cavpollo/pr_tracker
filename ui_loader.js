document.addEventListener('DOMContentLoaded', function () {
    var backgroundPage = chrome.extension.getBackgroundPage();
    renderRepositoryData(backgroundPage.userData, backgroundPage.repositoriesData);

    document.getElementById('reload').onclick = function () {
        var backgroundPage = chrome.extension.getBackgroundPage();
        renderRepositoryData(backgroundPage.userData, backgroundPage.repositoriesData);
    }
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

            pullRequest.disapproved_reviewers.sort(function (a, b) {
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

// TODO: Mark the status of the repositories as RENDERED once they have been drawn
//       and selectively redraw them when needed(?)
function renderRepositoryData(userData, repositoriesData) {
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

            var approved = pullRequest.disapproved_reviewers.length === 0 && pullRequest.approved_reviewers.length > 0;
            var noApprovals = pullRequest.disapproved_reviewers.length === 0 && pullRequest.approved_reviewers.length === 0;
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


            for (var i = 0, reviewer; reviewer = pullRequest.disapproved_reviewers[i]; i++) {
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