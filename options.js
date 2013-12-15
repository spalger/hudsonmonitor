/* jshint eqeqeq:false, -W041: false, undef: true, browser:true */
/* global REFRESH_DEFAULT, REQUEST_TIMEOUT, STATUSES, chrome, webkitNotifications */
/*
   Copyright 2010 Henning Hoefer

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var saveButton;
var cancelButton;
var urlInput;
var errorImage;
var refreshDropdown;
var authCheckbox;
var usernameInput;
var passwordInput;
var filterCheckbox;
var filterText;
var filterCaseSensitive;
var sortByName;
var sortByStatus;
var sortDesc;
var greenBalls;
var notificationCheckbox;
var notificationTimeout;


function init() {
    var inputs;
    var i;

    // All text inputs onKeyup = makeDirty
    inputs = document.querySelectorAll('input[type=text]');
    for (i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('keyup', markDirty);
    }

    // All other inputs onChange = makeDirty
    inputs = document.querySelectorAll('input[type=password], input[type=checkbox], input[type=radio], select');
    for (i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('change', markDirty);
    }

    // Set up save and cancel buttons
    saveButton = document.getElementById('save');
    cancelButton = document.getElementById('cancel');

    saveButton.addEventListener('click', save);
    cancelButton.addEventListener('click', init);

    urlInput = document.getElementById('url');
    errorImage = document.getElementById('error');
    urlInput.value = localStorage.url || 'http://';
    if (!urlInput.value.match(/https?:\/\/\S+/i)) {
        errorImage.style.visibility = 'visible';
    } else {
        errorImage.style.visibility = 'hidden';
    }

    refreshDropdown = document.getElementById('refresh');
    var refreshTime = localStorage.refreshTime || REFRESH_DEFAULT;
    for (i = 0; i < refreshDropdown.options.length; i++) {
        if (refreshDropdown.options[i].value == refreshTime) {
            refreshDropdown.selectedIndex = i;
            break;
        }
    }

    notificationCheckbox = document.getElementById('showNotifications');
    notificationTimeout = document.getElementById('notificationTimeout');
    if (localStorage.showNotification == 'true') {
        notificationCheckbox.checked = true;
        notificationTimeout.disabled = false;
    } else {
        notificationCheckbox.checked = false;
        notificationTimeout.disabled = true;
    }
    if (localStorage.notificationTimeout) {
        notificationTimeout.options.forEach(function (option, i) {
            if (option.value == localStorage.notificationTimeout) {
                notificationTimeout.selectedIndex = i;
            }
        });
    }

    authCheckbox = document.getElementById('auth');
    usernameInput = document.getElementById('username');
    passwordInput = document.getElementById('password');
    if (typeof localStorage.username == 'string') {
        authCheckbox.checked = true;
        usernameInput.value = localStorage.username || '';
        passwordInput.value = localStorage.password || '';
    } else {
        authCheckbox.checked = false;
        usernameInput.value = '';
        passwordInput.value = '';
        usernameInput.disabled = true;
        passwordInput.disabled = true;
    }

    filterCheckbox = document.getElementById('enableFilter');
    filterText = document.getElementById('filterText');
    filterCaseSensitive = document.getElementById('filterCaseSensitive');
    if (typeof localStorage.filterText == 'string') {
        filterCheckbox.checked = true;
        filterText.value = localStorage.filterText || '';
        filterCaseSensitive.checked = !!localStorage.filterCaseSensitive;
    } else {
        filterCheckbox.checked = false;
        filterText.value = '';
        filterCaseSensitive.checked = false;
        filterText.disabled = true;
        filterCaseSensitive.disabled = true;
    }

    sortByName = document.getElementById('sortByName');
    sortByStatus = document.getElementById('sortByStatus');
    sortDesc = document.getElementById('sortDesc');
    if (localStorage.sorting == 'status') {
        sortByStatus.checked = true;
    } else {
        sortByName.checked = true;
    }
    if (typeof localStorage.desc == 'string')
        sortDesc.checked = true;

    greenBalls = document.getElementById('greenBalls');
    if (typeof localStorage.green == 'string')
        greenBalls.checked = true;

    markClean();
}

function save() {
    if (urlInput.value != '' && urlInput.value != 'http://') {
        localStorage.url = urlInput.value.charAt(urlInput.value.length - 1) == '/' ? urlInput.value : urlInput.value + '/';
    } else {
        delete localStorage.url;
    }

    if (notificationTimeout.value != "0") {
      localStorage.notificationTimeout = notificationTimeout.value;
    } else {
      delete localStorage.notificationTimeout;
    }

    if (refreshDropdown.value != REFRESH_DEFAULT) {
        localStorage.refreshTime = refreshDropdown.value;
    } else {
        delete localStorage.refreshTime;
    }

    if (authCheckbox.checked) {
        localStorage.username = usernameInput.value;
        localStorage.password = passwordInput.value;
    } else {
        delete localStorage.username;
        delete localStorage.password;
    }

    if (filterCheckbox.checked) {
        localStorage.filterText = filterText.value;
        localStorage.filterCaseSensitive = filterCaseSensitive.value ? 'true' : '';
    } else {
        delete localStorage.filterText;
        delete localStorage.filterCaseSensitive;
    }

    if (sortByStatus.checked == true) {
        localStorage.sorting = 'status';
    } else {
        delete localStorage.sorting;
    }
    if (sortDesc.checked == true) {
        localStorage.desc = 'true';
    } else {
        delete localStorage.desc;
    }

    if (greenBalls.checked == true) {
        localStorage.green = 'true';
    } else {
        delete localStorage.green;
    }

    if (notificationCheckbox.checked == true) {
      localStorage.showNotification = 'true';
    } else {
      delete localStorage.showNotification;
    }

    init();
    chrome.extension.getBackgroundPage()["init"]();
}

function markDirty() {
    if (!urlInput.value.match(/https?:\/\/\S+/i)) {
        errorImage.style.visibility = 'visible';
    } else {
        errorImage.style.visibility = 'hidden';
    }

    if (authCheckbox.checked == true) {
        usernameInput.disabled = false;
        passwordInput.disabled = false;
    } else {
        usernameInput.disabled = true;
        passwordInput.disabled = true;
    }

    if (notificationCheckbox.checked == true) {
        requestUserPermission();
        notificationTimeout.disabled = false;
    } else {
        notificationTimeout.disabled = true;
    }

    if (filterCheckbox.checked == true) {
        filterText.disabled = false;
        filterCaseSensitive.disabled = false;
    } else {
        filterText.disabled = true;
        filterCaseSensitive.disabled = true;
    }

    saveButton.disabled = false;
}

function markClean() {
    saveButton.disabled = true;
}

function requestUserPermission() {
    try {
        if (notificationCheckbox.checked) {
            if (checkUserPermission())
                return;

            if (typeof webkitNotifications != "undefined") {
                webkitNotifications.requestPermission(function () {
                    notificationCheckbox.checked = checkUserPermission();
                });
            }
        }
    } catch (e) {
        notificationCheckbox.checked = false;
    }
}

function checkUserPermission() {
    try {
        return (webkitNotifications.checkPermission() === 0);
    } catch (e) {
        return false;
    }
}

document.addEventListener('DOMContentLoaded', init);
