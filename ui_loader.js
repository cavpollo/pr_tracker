document.addEventListener('DOMContentLoaded', function () {
    var backgroundPage = chrome.extension.getBackgroundPage();
    renderRepositoryData(backgroundPage.repositoriesData);

    document.getElementById('reload').onclick = function () {
        var backgroundPage = chrome.extension.getBackgroundPage();
        renderRepositoryData(backgroundPage.repositoriesData);
    }
});

function sortRepositoryData(repositoriesData) {
    repositoriesData.sort(function (a, b) {
        return a.full_name.localeCompare(b.full_name);
    });

    for (var i = 0, repository; repository = repositoriesData[i]; i++) {
        repository.pull_requests.sort(function (a, b) {
            return a.created_at.localeCompare(b.created_at);
        });

        for (var j = 0, pullRequest; pullRequest = repository.pull_requests[j]; j++) {
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
function renderRepositoryData(repositoriesData) {
    sortRepositoryData(repositoriesData);

    console.log(repositoriesData);

    var repositoriesDiv = document.getElementById('repositories');

    var repositoriesHtml = '';

    var doneLoading = true;
    var errorLoading = false;

    for (var i = 0, repository; repository = repositoriesData[i]; i++) {
        if (repository.pull_requests.length === 0) {
            continue;
        }

        var repositoryHtml = '<div style="background-color: #93bcff; margin-bottom: 8px; padding: 2px 8px 2px 8px; border-radius: 8px;">\n';
        repositoryHtml += '<h2><a href="' + repository.url + '">' + repository.full_name + '</a></h2>\n';
        repositoryHtml += '<div>\n';

        for (var j = 0, pullRequest; pullRequest = repository.pull_requests[j]; j++) {
            if (pullRequest.status !== 'LOADED') {
                doneLoading = false;
            }
            if (pullRequest.status === 'ERROR') {
                errorLoading = true;
            }

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
            pullRequestHTML += '<h3><a href="' + pullRequest.url + '">' + pullRequest.title + '</a>' + (pullRequest.status !== 'LOADED' ? ' - Loading Data, please wait.' : '') + '</h3>\n';
            pullRequestHTML += '<p style="margin-left: 8px;"><b>' + pullRequest.head_name + '</b> --merge into--&gt; <b>' + pullRequest.base_name + '</b></p>\n';
            pullRequestHTML += '<p style="margin-left: 8px;">Created ar ' + formatDate(createdDate) + ' by ' + pullRequest.created_by + ' - ' + pullRequest.changed_files + ' files ' + '</p>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<div style="width: 32px;"></div>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td style="vertical-align: bottom;">\n';

            if (pullRequest.assignees.length === 0) {

                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; line-height: 36px; display: inline-block; background-color: #444444; color: #ffffff; vertical-align:middle; text-align:center; border-radius: 4px;">?</div>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var k = 0, assignee; assignee = pullRequest.assignees[k]; k++) {
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


            for (var l = 0, reviewer; reviewer = pullRequest.disapproved_reviewers[l]; l++) {
                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #b40900; border-radius: 4px;" title="REJECTED" alt="REJECTED"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var m = 0, reviewer; reviewer = pullRequest.comment_reviewers[m]; m++) {
                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #a8a8a8; border-radius: 4px;" title="COMMENT" alt="COMMENT"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var n = 0, reviewer; reviewer = pullRequest.pending_reviewers[n]; n++) {
                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #ddde00; border-radius: 4px;" title="INVITED" alt="INVITED"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var o = 0, reviewer; reviewer = pullRequest.approved_reviewers[o]; o++) {
                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #00ae11; border-radius: 4px;" title="APPROVED" alt="APPROVED"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" title="' + reviewer.username + '" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var p = 0, reviewer; reviewer = pullRequest.dismissed_reviewers[p]; p++) {
                pullRequestHTML += '<div>\n';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #00a8a3; border-radius: 4px;" title="DISMISSED" alt="DISMISSED"></div>\n';
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

            for (var q = 0, label; label = pullRequest.labels[q]; q++) {
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

            repositoryHtml += pullRequestHTML;
        }

        repositoryHtml += '</div>\n';
        repositoryHtml += '</div>\n';

        repositoriesHtml = repositoriesHtml + repositoryHtml;
    }

    repositoriesDiv.innerHTML = repositoriesHtml;

    var loadStatusDiv = document.getElementById('status');

    var loadStatusHTML = '';
    loadStatusHTML += '<div>\n';
    if (doneLoading) {
        loadStatusHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #3ab400; border-radius: 18px;" title="DONE LOADING" alt="DONE LOADING"></div>\n';
    } else {
        if (errorLoading) {
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