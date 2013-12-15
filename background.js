// Prefs
var refreshTime;
var requestUrl;
var filterPattern;
var auth;
var desc;
var green;

// Globals (eww!)
var abortTimer;
var refreshTimer;
var jobs;
var previousJobsByName;
var xhr;
var showNotification;

function init() {
    desc = localStorage.desc == 'true';
    green = localStorage.green == 'true';
    showNotification = localStorage.showNotification == 'true';

    if (!localStorage.url) {
        updateStatus(-1);
        jobs = null;
        return;
    } else
        requestUrl = localStorage.url;

    refreshTime = localStorage.refreshTime || REFRESH_DEFAULT;
    refreshTime *= 60 * 1000; // minutes in ms

    if (typeof localStorage.username == 'string') {
        auth = window.btoa((localStorage.username || '') + ':' + (localStorage.password || ''));
    } else {
        auth = null;
    }

    if (typeof localStorage.filterText === 'string') {
        filterPattern = new RegExp(localStorage.filterText, localStorage.filterCaseSensitive ? '' : 'i');
    }

    doRequest();
}

function doRequest() {
    if (xhr) {
        xhr.abort();
    }
    xhr = new XMLHttpRequest();
    window.clearTimeout(abortTimer);
    abortTimer = window.setTimeout(xhr.abort, REQUEST_TIMEOUT);

    try {
        xhr.onreadystatechange = checkResponse;
        xhr.onerror = handleError;
        xhr.open('GET', requestUrl + 'api/json', true);
        if (typeof auth == 'string') {
            xhr.setRequestHeader('Authorization', 'Basic ' + auth);
        }
        xhr.send();
    } catch (e) {
        handleError(e);
    }
}


// Displays a notification popup
function notify(message) {
    try {
        var notification = webkitNotifications.createNotification("./images/icon48.png", "Hudson", message);
        var timeout = 15;

        notification.show();
        if( localStorage.showNotificationTime ) {
            setTimeout(function () { notification.cancel(); }, localStorage.showNotificationTime * 1000);
        }

    } catch (e) {
        alert("error displaying notification");
    }
}


function checkResponse() {
    if (xhr.readyState != 4) return;

    if (xhr.status == 200 && xhr.responseText) {
        var response = JSON.parse(xhr.responseText);
        var topStatus = -1;
        if (response.jobs) {
            jobs = response.jobs.filter(function (job) {
                if (filterPattern) {
                    return !!filterPattern.test(job.name);
                } else {
                    return true;
                }
            });

            if (previousJobsByName) {
                var jobsByName = {};
                var msgs = jobs
                    // find the jobs with status changes and reindex the jobs
                    .map(function (job) {
                        var previousJob = previousJobsByName[job.name];
                        jobsByName[job.name] = job;
                        if (!previousJob) {
                            return job.name + ' was added';
                        } else if (job.color !== previousJob.color) {
                            switch(job.color) {
                                case 'green_anime':
                                case 'blue_anime':
                                case 'green':
                                case 'blue':
                                    return job.name + ' is now passing!';
                                case 'red_anime':
                                case 'red':
                                    return job.name + ' is now failing!';
                            }
                        }
                    })
                    // filter out empty messages
                    .filter(Boolean);

                if(msgs.length) {
                    notify(msgs.join('\n'));
                }
                previousJobsByName = jobsByName;
            } else {
                previousJobsByName = {};
                jobs.forEach(function (job) {
                    previousJobsByName[job.name] = job;
                });
            }

            if (localStorage.sorting == 'status') {
                jobs.sort(sortByStatus);
            } else {
                jobs.sort(sortByName);
            }
            jobs.forEach(function (job) {
                topStatus = Math.max(topStatus, STATUSES[job.color]);
            });
        }
        handleSuccess(topStatus);
        return;
    } else {
        handleError(xhr.status != 200 ? 'HTTP ' + xhr.status : 'No responseText found');
    }
}

function handleSuccess(status) {
    xhr = null;
    window.clearTimeout(abortTimer);
    updateStatus(status);
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(doRequest, refreshTime);
}

function handleError(error) {
    xhr = null;
    window.clearTimeout(abortTimer);
    jobs = null;
    updateStatus('ERROR');
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(doRequest, refreshTime);
}

function sortByName(a, b) {
    var o1 = a.name.toLowerCase();
    var o2 = b.name.toLowerCase();

    if (o1 < o2) return desc ? 1 : -1;
    else if (o2 < o1) return desc ? -1 : 1;
    else return 0;
}

function sortByStatus(a, b) {
    if (STATUSES[a.color] == STATUSES[b.color]) return sortByName(a, b);
    return desc ? STATUSES[a.color] - STATUSES[b.color] : STATUSES[b.color] - STATUSES[a.color];
}

function updateStatus(status) {
    if (status == 0) {
        chrome.browserAction.setIcon({path:'images/grey19.png'});
        chrome.browserAction.setBadgeText({text:''});
    } else if (status == 1) {
        if (green) {
            chrome.browserAction.setIcon({path:'images/green19.png'});
        } else {
            chrome.browserAction.setIcon({path:'images/blue19.png'});
        }
        chrome.browserAction.setBadgeText({text:''});
    } else if (status == 2) {
        chrome.browserAction.setIcon({path:'images/yellow19.png'});
        chrome.browserAction.setBadgeText({text:''});
    } else if (status == 3) {
        chrome.browserAction.setIcon({path:'images/red19.png'});
        chrome.browserAction.setBadgeText({text:''});
    } else {
        chrome.browserAction.setIcon({path:'images/icon19.png'});
        chrome.browserAction.setBadgeText({text:'?'});
    }
}

function openTab() {
    chrome.tabs.getAllInWindow(undefined, function(tabs) {
        for (var i = 0, tab; tab = tabs[i]; i++) {
            if (tab.url && tab.url.indexOf(localStorage.url) == 0) {
                chrome.tabs.update(tab.id, {selected: true});
                return;
            }
        }
        chrome.tabs.create({url: localStorage.url});
    });
}

window.onload = function() {
    window.setTimeout(init, 10);
}

