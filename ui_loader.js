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
        if (repository.pull_requests.length == 0) {
            continue;
        }

        var repositoryHtml = '<div style="background-color: #93bcff; margin-bottom: 8px; padding: 2px 8px 2px 8px;">\n';
        repositoryHtml += '<h2><a href="' + repository.url + '">' + repository.full_name + '</a></h2>\n';
        repositoryHtml += '<div style="background-color: #000000;">\n';

        for (var j = 0, pullRequest; pullRequest = repository.pull_requests[j]; j++) {

            var approved = pullRequest.disapproved_reviewers.length === 0 && pullRequest.approved_reviewers.length > 0;

            var pullRequestHTML = '<div  style="margin: 0 0 8px 0; padding: 2px 8px 8px 8px; background-color: #ffffff;">\n';
            pullRequestHTML += '<table>\n';
            pullRequestHTML += '<tr>\n';
            pullRequestHTML += '<td>\n';
            //TODO images for check and fail
            pullRequestHTML += '<span style="background-color: ' + (approved ? '#00ae11' : '#b40900') + '">O</span>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '<h3><a href="' + pullRequest.url + '">' + pullRequest.title + '</a></h3>\n';
            pullRequestHTML += '<span style="margin-left: 8px;"><b>' + pullRequest.head_name + '</b> =&gt; <b>' + pullRequest.base_name + '</b></span>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '<td>\n';
            pullRequestHTML += '</td>\n';
            pullRequestHTML += '</tr>\n';
            pullRequestHTML += '</table>\n';
            pullRequestHTML += '</div>\n';

            for (var k = 0, assignee; assignee = pullRequest.assignees[k]; k++) {

            }

            for (var l = 0, disapproved_reviewer; disapproved_reviewer = pullRequest.disapproved_reviewers[i]; l++) {

            }

            for (var m = 0, comment_reviewer; comment_reviewer = pullRequest.comment_reviewers[m]; m++) {

            }

            for (var n = 0, pending_reviewer; pending_reviewer = pullRequest.pending_reviewers[n]; n++) {

            }

            for (var o = 0, approved_reviewer; approved_reviewer = pullRequest.approved_reviewers[o]; o++) {

            }

            repositoryHtml += pullRequestHTML;
        }

        repositoryHtml += '</div>\n';
        repositoryHtml += '</div>\n';

        repositoriesHtml = repositoriesHtml + repositoryHtml;
    }

    repositoriesDiv.innerHTML = repositoriesHtml;
}