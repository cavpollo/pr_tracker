$(document).foundation();

var animationTimeInMilliseconds = 1500;
var redrawInSeconds = 5;
var redrawTimeoutId;

var lastDataRenderTS;
var forceUIRedraw = false;
var gettingRepositoryData = false;

function getValue(name, callout, params) {
    var defaults = {};
    defaults[name] = true;

    chrome.storage.sync.get(defaults,
        function (items) {
            if (callout) {
                callout(items[name], params);
            }
        });
}

function storeValues(values) {
    chrome.storage.sync.set(values,
        function () {
            console.debug('config saved');

            clearTimeout(redrawTimeoutId);
            renderLoop();
        });
}

function renderLoop() {
    if (gettingRepositoryData === false) {
        gettingRepositoryData = true;
        getRepositoryData(renderRepositories);
    }
}

function renderRepositories(repositoryDivElement, dataTS, doneLoading, anyError) {
    if (forceUIRedraw || lastDataRenderTS === undefined || lastDataRenderTS !== dataTS) {
        lastDataRenderTS = dataTS;
        forceUIRedraw = false;

        $('#repositories').addClass('repository-refreshing');

        var button = $('#refresh-button');
        button.addClass('button-refreshing');
        if (doneLoading) {
            button.css('backgroundColor', '#3ab400');
        } else {
            if (anyError) {
                button.css('backgroundColor', '#b40004');
            } else {
                button.css('backgroundColor', '#b2b400');
            }
        }

        setTimeout(function () {
            var repositoriesElement = document.getElementById('repositories');

            while (repositoriesElement.firstChild) {
                repositoriesElement.removeChild(repositoriesElement.firstChild);
            }

            while (repositoryDivElement.hasChildNodes()) {
                repositoriesElement.appendChild(repositoryDivElement.removeChild(repositoryDivElement.firstChild))
            }

            $('#repositories i').addClass('button-refreshing');
        }, animationTimeInMilliseconds / 4);

        setTimeout(function () {
            $('#repositories').removeClass('repository-refreshing');
            $('#repositories i').removeClass('button-refreshing');
        }, animationTimeInMilliseconds);
    }

    gettingRepositoryData = false;

    redrawTimeoutId = setTimeout(function () {
        renderLoop();
    }, redrawInSeconds * 1000);
}

$(document).ready(function () {
    $('#refresh-button').click(function () {
        forceUIRedraw = true;
        clearTimeout(redrawTimeoutId);
        renderLoop();
    });

    $('#switch-all').click(function () {
        $('#panel input[data-toggled-all][type="checkbox"]').prop('checked', this.checked);
    });

    $('input.switch-input').click(function () {
        if ($(this).prop('checked') === false && $(this).attr('data-toggled-all') === true) {
            $('#switch-all').prop('checked', false)
        }

        var nameValues = {};
        $('input.switch-input').each(function () {
            nameValues[$(this).attr('id')] = $(this).prop('checked');
        });

        storeValues(nameValues);
    });

    $('#repositories').on('click', '.toggle-pull-requests', function () {
        console.log('ASDF')
        var toggle_id = $(this).attr('data-toggle-id');
        var repositoryContentElement = $('#' + toggle_id);
        if (repositoryContentElement.hasClass('hide-repository-content')) {
            $(this).removeClass('fi-arrows-expand');
            $(this).addClass('fi-arrows-compress');

            repositoryContentElement.removeClass('hide-repository-content');
        } else {
            $(this).removeClass('fi-arrows-compress');
            $(this).addClass('fi-arrows-expand');

            repositoryContentElement.addClass('hide-repository-content');
        }
    });


    $('input.switch-input').each(function () {
        var switchInput = $(this);
        getValue(switchInput.attr('id'),
            function (value) {
                switchInput.prop('checked', value);
            });
    });

    renderLoop();
});