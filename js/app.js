$(document).foundation();

function getValue(name, callout, params) {
    var defaults = {};
    defaults[name] = false;

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
        });
}

$(document).ready(function () {
    $('#panel [data-toggle-all]').click(function () {
        $('#panel input[type="checkbox"]').prop('checked', this.checked);
    });

    $('input.switch-input').click(function () {
        var nameValues = {};

        $('input.switch-input').each(function () {
            nameValues[$(this).attr('id')] = $(this).prop('checked');
        });

        storeValues(nameValues);
    });

    $('input.switch-input').each(function () {
        var switchInput = $(this);
        getValue(switchInput.attr('id'),
            function (value) {
                switchInput.prop('checked', value);
            });
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
});