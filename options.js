var requestTimeoutSeconds = 1000 * 2;
var loadingRepositories = [];
var repoIgnoredCheckbox = 'repoIgnoredCheckbox';

function save_options() {
    var authToken = document.getElementById('authToken').value;
    var organization = document.getElementById('organization').value;

    var reposIgnored = [];
    var reposIgnoredElements = document.getElementsByClassName(repoIgnoredCheckbox);
    for (var i = 0; i < reposIgnoredElements.length; i++) {
        if (reposIgnoredElements[i].checked === true) {
            reposIgnored.push(reposIgnoredElements[i].repositoryName);
        }
    }

    chrome.storage.sync.set({
        authToken: authToken,
        organization: organization,
        reposIgnored: reposIgnored.join()
    }, function () {
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        var backgroundPage = chrome.extension.getBackgroundPage();
        backgroundPage.loadData();
        setTimeout(function () {
            status.textContent = '';
        }, 1500);
    });
}

function check_all(){
    var reposIgnoredElements = document.getElementsByClassName(repoIgnoredCheckbox);
    for (var i = 0; i < reposIgnoredElements.length; i++) {
        reposIgnoredElements[i].checked = true;
    }
}

function uncheck_all(){
    var reposIgnoredElements = document.getElementsByClassName(repoIgnoredCheckbox);
    for (var i = 0; i < reposIgnoredElements.length; i++) {
        reposIgnoredElements[i].checked = false;
    }
}

function restore_options() {
    chrome.storage.sync.get({
        authToken: '',
        organization: '',
        reposIgnored: ''
    }, function (items) {
        document.getElementById('authToken').value = items.authToken;
        document.getElementById('organization').value = items.organization;

        var repositoriesElement = document.getElementById('repositories');
        repositoriesElement.innerHTML = 'Loading, Please Wait...';

        asyncGet(
            items.authToken,
            'https://api.github.com/orgs/' + items.organization + '/repos',
            items.reposIgnored,
            1,
            render_repositories);
    });
}

function doTimeout(authToken, url, reposIgnored, page, callback) {
    setTimeout(function () {
        asyncGet(authToken, url, reposIgnored, page, callback);
    }, 1000);
}

function asyncGet(authToken, url, reposIgnored, page, callback) {
    var xhr = new XMLHttpRequest();

    if (url === undefined) {
        console.debug('No url');
        return;
    }

    var buildUrl = url;
    if (page) {
        buildUrl = buildUrl + '?per_page=50&page=' + page
    }
    // console.log(buildUrl);

    var abortTimerId = window.setTimeout(function () {
        console.error('aborting');
        xhr.abort();
    }, requestTimeoutSeconds);

    function handleError(url) {
        console.error('exception  - ' + url);
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            window.clearTimeout(abortTimerId);

            if (this.status === 0) {
                console.error('API Call Limit Exceeded (or no connection) - will retry');
                doTimeout(authToken, url, reposIgnored, page, callback);
                return;
            }

            if (this.status !== 304 && (this.status < 200 || this.status >= 300)) {
                console.error('Failed: ' + this.status + ' - ' + url);
                handleError(url);
                return;
            }

            var zeroIndexCurrentPage = page - 1;
            var lastPage = zeroIndexCurrentPage;

            var link = xhr.getResponseHeader('link');
            if (link) {
                // The link header paging starts from 0, but the query paging starts from 1...
                var linkRegex = (/(\d+)>; rel="last"/).exec(link);

                if (linkRegex) {
                    lastPage = parseInt(linkRegex[1]);
                }

                if (lastPage > zeroIndexCurrentPage) {
                    asyncGet(authToken, url, reposIgnored, page + 1, callback);
                }
            }

            if (xhr.responseText) {
                var response = JSON.parse(xhr.responseText);

                // console.log(methodName + ': ');
                // console.log(response);

                if (callback) {
                    callback(response, reposIgnored, zeroIndexCurrentPage, lastPage);
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

function render_repositories(response, reposIgnored, currentPage, lastPage) {
    if (loadingRepositories.length === 0) {
        for (var i = 0; i < lastPage; i++) {
            loadingRepositories.push(null);
        }
    }

    loadingRepositories[currentPage] = response;

    var all_loaded = true;
    for (var i = 0; i < lastPage; i++) {
        if (loadingRepositories[i] === null) {
            all_loaded = false;
            break;
        }
    }

    if (all_loaded) {
        var repositories = [].concat.apply([], loadingRepositories);
        loadingRepositories = [];
        var repositoryNames = [];

        for (var i = 0, repository; repository = repositories[i]; i++) {
            repositoryNames.push(repository.name);
        }

        repositoryNames = repositoryNames.sort();

        var repositoriesElement = document.getElementById('repositories');
        repositoriesElement.innerHTML = null;

        for (var i = 0, name; name = repositoryNames[i]; i++) {
            var repositoryLabelElement = document.createElement('label');
            repositoryLabelElement.htmlFor = 'checkbox-' + name;

            var repositoryCheckboxElement = document.createElement('input');
            repositoryCheckboxElement.id = 'checkbox-' + name;
            repositoryCheckboxElement.type = 'checkbox';
            repositoryCheckboxElement.className = repoIgnoredCheckbox;
            repositoryCheckboxElement.repositoryName = name;
            if (reposIgnored.indexOf(name) > -1) {
                repositoryCheckboxElement.checked = true;
            }

            var repositoryTextElement = document.createElement('span');
            repositoryTextElement.innerHTML = name;

            repositoryLabelElement.appendChild(repositoryCheckboxElement);
            repositoryLabelElement.appendChild(repositoryTextElement);

            repositoriesElement.appendChild(repositoryLabelElement);
        }
    }
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('uncheckAllRepositories').addEventListener('click', uncheck_all);
document.getElementById('checkAllRepositories').addEventListener('click', check_all);