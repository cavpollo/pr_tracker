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
        }
    }
}

// TODO: Mark the status of the respositories as RENDERED once they have been drawn
//       and selectively redraw them when needed
function renderRepositoryData(repositoriesData) {
    sortRepositoryData(repositoriesData);

    console.log(repositoriesData);

    var repositoriesDiv = document.getElementById('repositories');

    var repositoriesHtml = '';

    for (var i = 0, repository; repository = repositoriesData[i]; i++) {
        if (repository.pull_requests.length === 0) {
            continue;
        }

        var repositoryHtml = '<div style="background-color: #93bcff; margin-bottom: 8px; padding: 2px 8px 2px 8px;">\n';
        repositoryHtml += '<h2><a href="' + repository.url + '">' + repository.full_name + '</a></h2>\n';
        repositoryHtml += '<div style="background-color: #000000;">\n';

        for (var j = 0, pullRequest; pullRequest = repository.pull_requests[j]; j++) {

            var approved = pullRequest.disapproved_reviewers.length === 0 && pullRequest.approved_reviewers.length > 0;
            var createdDate = new Date(pullRequest.created_at);

            console.log(pullRequest);

            var pullRequestHTML = '<div  style="margin: 0 0 8px 0; padding: 2px 8px 8px 8px; background-color: #ffffff;">\n';
            pullRequestHTML += '<table>\n';
            pullRequestHTML += '<tr>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: '+(approved ? '#00ae11' : '#b40900')+'"></div>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<h3><a href="' + pullRequest.url + '">' + pullRequest.title + '</a></h3>\n';
            pullRequestHTML += '<p style="margin-left: 8px;"><b>' + pullRequest.head_name + '</b> ==merge into==&gt; <b>' + pullRequest.base_name + '</b></p>\n';
            pullRequestHTML += '<p style="margin-left: 8px;">Created ' + formatDate(createdDate) + ' - ' + pullRequest.changed_files + ' files ' + (pullRequest.mergeable !== null ? (pullRequest.mergeable === false ? '- <b>Cannot</b> be merged' : '- Can be merged') : '') + '</p>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<div style="width: 32px;"></div>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td style="vertical-align: bottom;">\n';

            if(pullRequest.assignees.length === 0){

                pullRequestHTML += '<div">';
                pullRequestHTML += '<div style="width: 36px; height: 36px; line-height: 36px; display: inline-block; background-color: #444444; color: #ffffff; vertical-align:middle; text-align:center;">?</div>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var k = 0, assignee; assignee = pullRequest.assignees[k]; k++) {
                pullRequestHTML += '<div>';
                pullRequestHTML += '<a href="' + assignee.url + '">\n';
                pullRequestHTML += '<img src="' + assignee.avatar_url + '" style="height: 36px; width: 36px;" alt="' + assignee.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<div style="width: 8px;"></div>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td style="vertical-align: bottom;">\n';


            for (var l = 0, reviewer; reviewer = pullRequest.disapproved_reviewers[l]; l++) {
                pullRequestHTML += '<div>';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #b40900"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var m = 0, reviewer; reviewer = pullRequest.comment_reviewers[m]; m++) {
                pullRequestHTML += '<div>';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #a8a8a8"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var n = 0, reviewer; reviewer = pullRequest.pending_reviewers[n]; n++) {
                pullRequestHTML += '<div>';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #ddde00"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
                pullRequestHTML += '</div>\n';
            }

            for (var o = 0, reviewer; reviewer = pullRequest.approved_reviewers[o]; o++) {
                pullRequestHTML += '<div>';
                pullRequestHTML += '<div style="width: 36px; height: 36px; display: inline-block; background-color: #00ae11"></div>\n';
                pullRequestHTML += '<a href="' + reviewer.url + '">\n';
                pullRequestHTML += '<img src="' + reviewer.avatar_url + '" style="height: 36px; width: 36px;" alt="' + reviewer.username + '" />\n';
                pullRequestHTML += '</a>\n';
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
}

function formatDate(date) {
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return day + ' ' + monthNames[monthIndex] + ' ' + year;
}