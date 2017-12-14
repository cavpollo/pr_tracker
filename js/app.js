$(document).foundation();

var animationTimeInMilliseconds = 1500;
var redrawInSeconds = 5;
var redrawTimeoutId;

var lastDataRenderTS;
var forceUIRedraw = false;
var gettingRepositoryData = false;

var prSortOrder = 'pr-group-by';

function getValue(name, callout, defaultValue) {
    var defaults = {};
    defaults[name] = defaultValue === undefined ? true : defaultValue;

    chrome.storage.sync.get(defaults,
        function (items) {
            if (callout) {
                callout(items[name]);
            }
        });
}

function storeValues(values) {
    chrome.storage.sync.set(values,
        function () {
            console.debug('config saved');

            clearTimeout(redrawTimeoutId);
            forceUIRedraw = true;
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

            // console.debug('UI Refresh: ' + dataTS + ' - ' + doneLoading + ' - ' + anyError);

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
        if ($(this).prop('checked') === false && $('#switch-all').prop('checked') === true) {
            $('#switch-all').prop('checked', false);
        }

        var nameValues = {};
        $('input.switch-input').each(function () {
            nameValues[$(this).attr('id')] = $(this).prop('checked');
        });

        storeValues(nameValues);
    });

    $('input.pr-group-by').click(function () {
        var nameValues = {};
        nameValues[prSortOrder] = $(this).val();

        storeValues(nameValues);
    });

    $('#repositories').on('click', '.toggle-pull-requests', function () {
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

    getValue(prSortOrder,
        function (value) {
            var prSortRadioButton;

            if (value === '') {
                prSortRadioButton = $('input.pr-group-by').first();
            } else {
                prSortRadioButton = $('#pr-group-by-' + value);

                if(prSortRadioButton.length === 0) {
                    prSortRadioButton = $('input.pr-group-by').first();
                }
            }

            prSortRadioButton.prop('checked', true);
        },
        '');

    renderLoop();
});