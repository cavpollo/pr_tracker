var requestTimeoutSeconds = 1000 * 2;
var removeOldRepositoriesSeconds = 45;
var refreshPeriodMinutes = 3;
var watchdogPeriodMinutes = 7;
var maxRequestsPerSecond = 20;
var userData = {};
var repositoriesData = {};
var dataTS = Date.now();
var globalError = false;
var apiTimeoutSeconds = 1;
var apiTimeoutRandomSeconds = 10;
var startApiTime = 0;
var apiCount = 0;
var currentRandomId = -1;

var OLD = 'OLD';
var LOADING = 'LOADING';
var LOADED = 'LOADED';
var ERROR = 'ERROR';
var UNCHANGED = 'UNCHANGED';

function goToIndexPage() {
    var indexUrl = chrome.runtime.getURL('index.html');

    chrome.tabs.getAllInWindow(undefined, function (openTabs) {
        for (var i = 0, openTab; openTab = openTabs[i]; i++) {
            if (openTab.url && openTab.url === indexUrl) {
                chrome.tabs.update(openTab.id, {selected: true});

                loadData();

                return;
            }
        }

        chrome.tabs.create({url: indexUrl});
    });
}


function onAlarm(alarm) {
    console.log('Got alarm: ', alarm);
    if (alarm) {
        var alarm_name = alarm.name;
        if (alarm_name === 'watchdog') {
            createAlarm('refresh', refreshPeriodMinutes);
        } else {
            if (alarm_name === 'refresh') {
                loadData();
            } else {
                console.error('Unknown alarm: ' + alarm_name);
            }
        }
    }
}

function createAlarm(alarmName, periodInMinutes) {
    chrome.alarms.get(alarmName, function (alarm) {
        if (alarm) {
            // Nothing
        } else {
            chrome.alarms.create(alarmName, {periodInMinutes: periodInMinutes});
        }
    });
}


function init() {
    chrome.browserAction.onClicked.addListener(goToIndexPage);
    chrome.alarms.onAlarm.addListener(onAlarm);

    notLoggedInIcon();

    loadData();
    createAlarm('refresh', refreshPeriodMinutes);
    createAlarm('watchdog', watchdogPeriodMinutes);
}


function notLoggedInIcon() {
    chrome.browserAction.setIcon({path: 'images/not_logged_in.png'});
    chrome.browserAction.setBadgeBackgroundColor({color: [190, 190, 190, 230]});
    chrome.browserAction.setBadgeText({text: 'X'});
}

function updateIcon() {
    if (globalError) {
        chrome.browserAction.setIcon({path: 'images/logged_in.png'});
        chrome.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]});
        chrome.browserAction.setBadgeText({text: 'X'});
    } else {
        var doneLoading = true;
        var errorLoading = false;
        for (var repositoryKey in repositoriesData) {
            var repository = repositoriesData[repositoryKey];

            for (var pullRequestKey in repository.pull_requests) {
                var pullRequest = repository.pull_requests[pullRequestKey];

                if (pullRequest.pr_status === LOADING || pullRequest.pr_status === ERROR ||
                    pullRequest.reviews_status === LOADING || pullRequest.reviews_status === ERROR ||
                    pullRequest.labels_status === LOADING || pullRequest.labels_status === ERROR) {
                    doneLoading = false;
                    break;
                }

                if (pullRequest.pr_status === ERROR ||
                    pullRequest.reviews_status === ERROR ||
                    pullRequest.labels_status === ERROR) {
                    errorLoading = true;
                    break;
                }
            }
        }

        if (Object.keys(repositoriesData).length > 0 && (errorLoading || doneLoading)) {
            var username = userData.username;
            var notificationCount = 0;

            for (var repositoryKey in repositoriesData) {
                var repository = repositoriesData[repositoryKey];

                for (var pullRequestKey in repository.pull_requests) {
                    var pullRequest = repository.pull_requests[pullRequestKey];

                    if (!(pullRequest.pr_status === LOADED || pullRequest.pr_status === UNCHANGED) ||
                        pullRequest.reviews_status === LOADED &&
                        pullRequest.labels_status === LOADED) {

                        var isMine = false;
                        var rejected = pullRequest.rejected_reviewers.length > 0;
                        var mergeConflict = pullRequest.mergeable !== null && pullRequest.mergeable === false;
                        var invitedToReview = false;

                        if (username === pullRequest.created_by) {
                            isMine = true;
                        } else {
                            for (var k = 0, assignee; assignee = pullRequest.assignees[k]; k++) {
                                if (username === assignee.username) {
                                    isMine = true;
                                }
                            }
                        }

                        for (var k = 0, reviewer; reviewer = pullRequest.pending_reviewers[k]; k++) {
                            if (username === reviewer.username) {
                                invitedToReview = true;
                            }
                        }


                        if ((isMine && (rejected || mergeConflict)) ||
                            invitedToReview) {
                            notificationCount++;
                        }
                    }
                }
            }

            chrome.browserAction.setIcon({path: 'images/logged_in.png'});
            if (errorLoading) {
                chrome.browserAction.setBadgeBackgroundColor({color: [96, 0, 160, 255]});
                chrome.browserAction.setBadgeText({text: '' + notificationCount});
            } else {
                if (notificationCount === 0) {
                    chrome.browserAction.setBadgeBackgroundColor({color: [0, 153, 45, 255]});
                } else {
                    chrome.browserAction.setBadgeBackgroundColor({color: [153, 0, 0, 255]});
                }
                chrome.browserAction.setBadgeText({text: '' + notificationCount});
            }
        }
    }
}


function asyncGetWithTimeout(methodName, randomId, authToken, url, page, callback, errorCallback, params) {
    apiCount = apiCount + 1;

    var now = new Date();

    var timeInSeconds = (now.getTime() - startApiTime.getTime()) / 1000;
    var requestsPerSecond = timeInSeconds < 0.5 ? 0 : apiCount / timeInSeconds;
    // console.log(methodName + ' Requests Per Second: ' + apiCount + 'req / ' + timeInSeconds + 's = ' + requestsPerSecond + 'req/s');

    if (requestsPerSecond > maxRequestsPerSecond) {
        apiCount = apiCount - 1;
        doTimeout(methodName, randomId, authToken, url, page, callback, errorCallback, params);
    } else {
        asyncGet(methodName, randomId, authToken, url, page, callback, errorCallback, params);
    }
}

function doTimeout(methodName, randomId, authToken, url, page, callback, errorCallback, params) {
    var timeout = (apiTimeoutSeconds * 1000) + (apiTimeoutRandomSeconds * 1000 * Math.random());
    // console.log(methodName + ': Retry in ' + timeout);
    setTimeout(function () {
        //console.debug(methodName + ': Retrying');
        asyncGetWithTimeout(methodName, randomId, authToken, url, page, callback, errorCallback, params);
    }, timeout);
}

function asyncGet(methodName, randomId, authToken, url, page, callback, errorCallback, params) {
    if (randomId !== currentRandomId) {
        console.debug(methodName + ' Request is too old: ' + currentRandomId + ' !== ' + randomId);
        return;
    }

    var xhr = new XMLHttpRequest();

    if (url === undefined) {
        console.debug(methodName + ' No url');
        if (errorCallback) {
            errorCallback(methodName, randomId, params);
        }
        return;
    }

    var buildUrl = url;
    if (page) {
        buildUrl = buildUrl + (buildUrl.includes('?') ? '&' : '?') + 'per_page=50&page=' + page
    }
    // console.log(buildUrl);

    var abortTimerId = window.setTimeout(function () {
        console.error(methodName + ' aborting');
        xhr.abort();
    }, requestTimeoutSeconds);

    function handleError(url) {
        console.error(methodName + ' exception  - ' + url);

        if (errorCallback) {
            errorCallback(methodName, randomId, params);
        }
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            window.clearTimeout(abortTimerId);

            if (this.status === 0) {
                console.error(methodName + ' API Call Limit Exceeded (or no connection) - will retry');
                asyncGetWithTimeout(methodName, randomId, authToken, url, page, callback, errorCallback, params);
                return;
            }

            if (this.status !== 304 && (this.status < 200 || this.status >= 300)) {
                console.error(methodName + ' Failed: ' + this.status + ' - ' + url);
                handleError(url);
                return;
            }

            var zeroIndexCurrentPage = page - 1;
            var lastPage = zeroIndexCurrentPage;

            var link = xhr.getResponseHeader('link');
            if (link) {
                // The link header paging starts from 0, but the query paging starts from 1...
                var linkRegex = (/(\d+)>; rel="last"/).exec(link);

                if(linkRegex) {
                    lastPage = parseInt(linkRegex[1]);
                }

                if (lastPage > zeroIndexCurrentPage) {
                    asyncGetWithTimeout(methodName, randomId, authToken, url, page + 1, callback, errorCallback, params);
                }
            }

            if (xhr.responseText) {
                var response = JSON.parse(xhr.responseText);

                // console.log(methodName + ': ');
                // console.log(response);

                if (callback) {
                    if (randomId !== currentRandomId) {
                        console.debug(methodName + ' Request is too old: ' + currentRandomId + ' !== ' + randomId);
                        return;
                    }

                    callback(randomId, authToken, params, response, zeroIndexCurrentPage, lastPage);
                }

                return;
            }

            handleError(url);
        };
        xhr.onerror = function (error) {
            handleError(url);
        };
        xhr.open('GET', buildUrl, true);
        xhr.setRequestHeader('Authorization', 'token ' + authToken);
        xhr.send(null);
    } catch (e) {
        handleError(url);
    }
}


function setNewRandom() {
    currentRandomId = Math.random();
    return currentRandomId;
}

function loadData() {
    console.log('LOAD DATA CALL');
    chrome.storage.sync.get({
        authToken: '',
        organization: '',
        reposIgnored: ''
    }, function (items) {
        var authToken = items.authToken;
        var organization = items.organization;
        var reposIgnored = items.reposIgnored.split(',').map(function (s) {
            return s.trim()
        });

        if (authToken && organization) {
            chrome.alarms.clear('refresh', function (wasCleared) {
                chrome.alarms.create('refresh', {periodInMinutes: refreshPeriodMinutes});
            });

            var randomId = setNewRandom();
            startApiTime = new Date();
            apiCount = 0;
            globalError = false;

            console.debug('LOAD DATA: ' + randomId);

            if (Object.keys(userData).length === 0) {
                asyncGetWithTimeout('User',
                    randomId,
                    authToken,
                    'https://api.github.com/user',
                    null,
                    getUserData,
                    getUserDataError,
                    {
                        organization: organization,
                        reposIgnored: reposIgnored
                    });
            } else {
                setRepositoryDataAsOld();

                asyncGetWithTimeout('Repositories',
                    randomId,
                    authToken,
                    'https://api.github.com/orgs/' + organization + '/repos',
                    1,
                    getRepositories,
                    getRepositoriesError,
                    {
                        organization: organization,
                        reposIgnored: reposIgnored
                    });
            }
        } else {
            console.log('No oauth token or organization');

            notLoggedInIcon();
        }
    });
}

function getUserData(randomId, authToken, params, response, currentPage, lastPage) {
    // console.log(response);

    userData = {
        id: response['id'],
        username: response['login'],
        name: response['name'],
        avatar_url: response['avatar_url']
    };

    updateIcon();

    asyncGetWithTimeout('Repositories',
        randomId,
        authToken,
        'https://api.github.com/orgs/' + params.organization + '/repos',
        1,
        getRepositories,
        getRepositoriesError,
        params);
}

function getUserDataError(randomId, params) {
    if (randomId === currentRandomId) {
        globalError = true;

        updateIcon();
    }
}

function getRepositories(randomId, authToken, params, response, currentPage, lastPage) {
    // console.log(response);

    for (var i = 0, repository; repository = response[i]; i++) {
        if (params.reposIgnored.indexOf(repository.name) > -1) {
            // console.debug('Repo ' + repository.name + ' was ignored.');
            continue;
        }

        var fullName = repository.full_name;

        var repoData = null;

        if (repositoriesData[fullName] === undefined ||
            repositoriesData[fullName] === null ||
            repositoriesData[fullName] === {}) {

            repoData = {
                id: repository.id,
                name: repository.name,
                full_name: fullName,
                url: repository.html_url,
                updated_at: repository.updated_at,
                pull_requests: {},
                status: LOADING
            };

            repositoriesData[fullName] = repoData;
        } else {
            repoData = repositoriesData[fullName];
        }

        updateIcon();

        asyncGetWithTimeout('Pull Requests ' + fullName,
            randomId,
            authToken,
            'https://api.github.com/repos/' + fullName + '/pulls?state=open&sort=created&direction=asc',
            1,
            getRepositoryPullRequests,
            getRepositoryPullRequestsError,
            {repoData: repoData});
    }
}

function getRepositoriesError(randomId, params) {
    if (randomId === currentRandomId) {
        globalError = true;

        dataTS = Date.now();

        updateIcon();
    }
}

function getRepositoryPullRequests(randomId, authToken, params, response, currentPage, lastPage) {
    var repoData = params.repoData;
    var repositoryFullName = params.repoData.full_name;

    // if (response.length > 0) {
    //     console.log(repositoryFullName + ':');
    //     console.log(pullRequestArray);
    // }

    for (var i = 0, pullRequest; pullRequest = response[i]; i++) {
        var pullRequestKey = '' + pullRequest.number;
        var existingPullRequest = repoData.pull_requests[pullRequestKey];

        if (existingPullRequest === undefined ||
            existingPullRequest === null ||
            existingPullRequest.pr_status === LOADING ||
            existingPullRequest.reviews_status === LOADING ||
            existingPullRequest.labels_status === LOADING ||
            existingPullRequest.updated_at !== pullRequest.updated_at) {

            var assigneesArray = [];
            for (var j = 0, assignee; assignee = pullRequest.assignees[j]; j++) {
                var assigneeData = {
                    id: assignee.id,
                    username: assignee.login,
                    avatar_url: assignee.avatar_url,
                    url: assignee.html_url
                };
                assigneesArray.push(assigneeData);
            }

            var pendingReviewers = [];
            for (var k = 0, reviewer; reviewer = pullRequest.requested_reviewers[k]; k++) {
                var pendingReviewerData = {
                    id: reviewer.id,
                    username: reviewer.login,
                    avatar_url: reviewer.avatar_url,
                    url: reviewer.html_url
                };
                pendingReviewers.push(pendingReviewerData);
            }

            var pullRequestNumber = pullRequest.number;

            var pullRequestData = {
                id: pullRequest.id,
                number: pullRequestNumber,
                title: pullRequest.title,
                url: pullRequest.html_url,
                assignees: assigneesArray,
                head_name: pullRequest.head.ref,
                base_name: pullRequest.base.ref,
                labels: [],
                pending_reviewers: pendingReviewers,
                rejected_reviewers: [],
                approved_reviewers: [],
                comment_reviewers: [],
                dismissed_reviewers: [],
                unanswered_comments: -1,
                comments: -1,
                commits: -1,
                additions: -1,
                deletions: -1,
                changed_files: -1,
                mergeable: null,
                mergeable_state: 'UNKNOWN',
                created_by: pullRequest.user.login,
                created_at: pullRequest.created_at,
                updated_at: pullRequest.updated_at,
                pr_status: LOADING,
                reviews_status: LOADING,
                labels_status: LOADING
            };

            repoData.pull_requests[pullRequestKey] = pullRequestData;

            dataTS = Date.now();

            updateIcon();

            asyncGetWithTimeout('Pull Request ' + repositoryFullName,
                randomId,
                authToken,
                'https://api.github.com/repos/' + repositoryFullName + '/pulls/' + pullRequestNumber,
                null,
                getPullRequest,
                getPullRequestError,
                {
                    pullRequestData: pullRequestData,
                    repositoryFullName: repositoryFullName,
                    pullRequestNumber: pullRequestNumber
                });

            // TODO: Count how many comments are left unanswered by the assignee
        } else {
            // console.debug(repositoryFullName + ': ' + pullRequest.number + ' UNCHANGED');

            dataTS = Date.now();

            existingPullRequest.pr_status = UNCHANGED;
        }
    }

    if (currentPage === lastPage) {
        params.repoData.status = LOADED;
    }

    return;
}

function getRepositoryPullRequestsError(randomId, params) {
    if (randomId === currentRandomId) {
        globalError = true;

        dataTS = Date.now();

        updateIcon();
    }
}

function getPullRequest(randomId, authToken, params, response, currentPage, lastPage) {
    var repositoryFullName = params.repositoryFullName;
    var pullRequestData = params.pullRequestData;
    var pullRequestNumber = params.pullRequestNumber;

    // if (repositoryFullName === 'x') {
    //     console.log(repositoryFullName + '/' + pullRequestNumber + ':');
    //     console.log(response);
    // }

    pullRequestData.comments = response.comments;
    pullRequestData.commits = response.commits;
    pullRequestData.additions = response.additions;
    pullRequestData.deletions = response.deletions;
    pullRequestData.changed_files = response.changed_files;
    pullRequestData.mergeable = response.mergeable; // true or false
    pullRequestData.mergeable_state = response.mergeable_state; // clean, dirty, or unstable
    pullRequestData.pr_status = LOADED;

    dataTS = Date.now();

    updateIcon();

    asyncGetWithTimeout('Reviews ' + repositoryFullName,
        randomId,
        authToken,
        'https://api.github.com/repos/' + repositoryFullName + '/pulls/' + pullRequestNumber + '/reviews',
        1,
        getPullRequestReviews,
        getPullRequestReviewsError,
        {
            repositoryFullName: repositoryFullName,
            pullRequestNumber: pullRequestNumber,
            pullRequestData: pullRequestData
        });
}

function getPullRequestError(randomId, params) {
    if (randomId === currentRandomId) {
        var pullRequestData = params.pullRequestData;
        pullRequestData.pr_status = ERROR;

        dataTS = Date.now();

        updateIcon();
    }
}

function getPullRequestReviews(randomId, authToken, params, response, currentPage, lastPage) {
    var repositoryFullName = params.repositoryFullName;
    var pullRequestNumber = params.pullRequestNumber;
    var pullRequestData = params.pullRequestData;

    // if (repositoryFullName === 'x') {
    //     console.log(repositoryFullName + '/' + pullRequestNumber + '/reviewers: page ' + currentPage);
    //     console.log(response);
    // }

    var latestUniqueReviewers = {};
    for(var i = 0, reviewer; reviewer = pullRequestData.approved_reviewers[i]; i++){
        latestUniqueReviewers[reviewer.userId] = reviewer;
    }
    for(var i = 0, reviewer; reviewer = pullRequestData.rejected_reviewers[i]; i++){
        latestUniqueReviewers[reviewer.userId] = reviewer;
    }
    for(var i = 0, reviewer; reviewer = pullRequestData.comment_reviewers[i]; i++){
        latestUniqueReviewers[reviewer.userId] = reviewer;
    }
    for(var i = 0, reviewer; reviewer = pullRequestData.dismissed_reviewers[i]; i++){
        latestUniqueReviewers[reviewer.userId] = reviewer;
    }

    for (var j = 0, reviewer; reviewer = response[j]; j++) {
        var userId = reviewer.user.id;

        var status = reviewer.state;
        if (latestUniqueReviewers[userId] !== undefined &&
            statusPrecedence(latestUniqueReviewers[userId].status, reviewer.state) === false) {
            status = latestUniqueReviewers[userId].status;
        }

        latestUniqueReviewers[userId] = {
            id: reviewer.id,
            status: status,
            userId: userId,
            username: reviewer.user.login,
            avatar_url: reviewer.user.avatar_url,
            url: reviewer.user.html_url,
            commit_id: reviewer.commit_id,
            updated_at: reviewer.submitted_at
        };
    }

    var approvedReviewers = [];
    var rejectedReviewers = [];
    var commentReviewers = [];
    var dismissedReviewers = [];
    Object.keys(latestUniqueReviewers).forEach(function (key) {
        var reviewerData = latestUniqueReviewers[key];

        if (reviewerData.status === 'APPROVED') {
            approvedReviewers.push(reviewerData);
        } else {
            if (reviewerData.status === 'CHANGES_REQUESTED') {
                rejectedReviewers.push(reviewerData);
            } else {
                if (reviewerData.status === 'COMMENTED') {
                    commentReviewers.push(reviewerData);
                } else {
                    if (reviewerData.status === 'DISMISSED') {
                        dismissedReviewers.push(reviewerData);
                    } else {
                        console.error('Unknown Reviewer status: ' + reviewerData.status)
                    }
                }
            }
        }
    });

    pullRequestData.approved_reviewers = approvedReviewers;
    pullRequestData.rejected_reviewers = rejectedReviewers;
    pullRequestData.comment_reviewers = commentReviewers;
    pullRequestData.dismissed_reviewers = dismissedReviewers;

    if (currentPage === lastPage) {
        pullRequestData.reviews_status = LOADED;
    }

    dataTS = Date.now();

    updateIcon();

    if (currentPage === lastPage) {
        asyncGetWithTimeout('Labels ' + repositoryFullName,
            randomId,
            authToken,
            'https://api.github.com/repos/' + repositoryFullName + '/issues/' + pullRequestNumber,
            null,
            getPullRequestLabels,
            getPullRequestLabelsError,
            {
                repositoryFullName: repositoryFullName,
                pullRequestNumber: pullRequestNumber,
                pullRequestData: pullRequestData
            });
    }
}

function getPullRequestReviewsError(randomId, params) {
    if (randomId === currentRandomId) {
        var pullRequestData = params.pullRequestData;
        pullRequestData.reviews_status = ERROR;

        dataTS = Date.now();

        updateIcon();
    }
}

function getPullRequestLabels(randomId, authToken, params, response, currentPage, lastPage) {
    // var repositoryFullName = params.repositoryFullName;
    // var pullRequestNumber = params.pullRequestNumber;
    var pullRequestData = params.pullRequestData;


    // console.log(repositoryFullName + '/' + pullRequestNumber + '/labels:');
    // console.log(response.labels);

    var labels = [];
    for (var j = 0, label; label = response.labels[j]; j++) {
        var labelData = {
            id: label.id,
            name: label.name,
            color: label.color
        };

        labels.push(labelData);
    }

    pullRequestData.labels = pullRequestData.labels.concat(labels);

    if (currentPage === lastPage) {
        pullRequestData.labels_status = LOADED;
    }

    dataTS = Date.now();

    updateIcon();
}

function getPullRequestLabelsError(randomId, params) {
    if (randomId === currentRandomId) {
        var pullRequestData = params.pullRequestData;
        pullRequestData.labels_status = ERROR;

        dataTS = Date.now();

        updateIcon();
    }
}


function statusPrecedence(before, after) {
    if (before === 'COMMENTED') {
        return true;
    } else {
        if (after !== 'COMMENTED') {
            return true;
        }
    }

    return false;
}


function removeOldRepositories() {
    for (var repositoryKey in repositoriesData) {
        var repository = repositoriesData[repositoryKey];
        if (repository.status === OLD) {
            delete repositoriesData[repositoryKey];
        } else {
            for (var pullRequestKey in repository.pull_requests) {
                if (repository.pull_requests[pullRequestKey].pr_status === OLD) {
                    delete repository.pull_requests[pullRequestKey];
                }
            }
        }
    }
}

function setRepositoryDataAsOld() {
    for (var repositoryKey in repositoriesData) {
        var repository = repositoriesData[repositoryKey];
        repository.status = OLD;

        for (var pullRequestKey in repository.pull_requests) {
            repository.pull_requests[pullRequestKey].pr_status = OLD;
        }
    }

    setTimeout(function () {
        removeOldRepositories();
    }, removeOldRepositoriesSeconds * 1000);
}


init();