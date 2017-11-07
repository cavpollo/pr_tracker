$(document).foundation();

var renderTimeoutInSeconds = 30;

var renderLoopTimeoutId;

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

            clearTimeout(renderLoopTimeoutId);
            renderLoop();
        });
}

function renderLoop() {
    var button = $('#refresh-button');
    var repositories = $('#repositories');

    button.addClass('button-refreshing');
    repositories.addClass('repository-refreshing');

    renderRepositoryData();

    setTimeout(function() {
        button.removeClass('button-refreshing');
        repositories.removeClass('repository-refreshing');
    }, 1500);

    renderLoopTimeoutId = setTimeout(function () {
        renderLoop();
    }, renderTimeoutInSeconds * 1000);
}

$(document).ready(function () {
    $('#refresh-button').click(function () {
        clearTimeout(renderLoopTimeoutId);
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

    $('.toggle-pull-requests').click(function () {
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