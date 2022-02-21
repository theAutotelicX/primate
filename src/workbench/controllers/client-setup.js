/**
 * Copyright (c) Ajay Sreedhar. All rights reserved.
 *
 * Licensed under the MIT License.
 * Please see LICENSE file located in the project root for more information.
 */

'use strict';

import * as _ from '../../lib/core-toolkit.js';
import setupModel from '../models/setup-model.js';
import {isNil, isNone} from '../../lib/core-toolkit.js';

const {/** @type {IPCBridge} */ ipcBridge} = window;

let unloadTimeout = null;

/**
 *
 * @param {{
 *     configuration: {kong_env: string},
 *     version: string
 * }} response
 */
function validateServerResponse(response) {
    if (!_.isObject(response.configuration) || !_.isText(response.configuration.kong_env)) {
        throw new Error('Unable to detect Kong Admin API running on the provided address.');
    }

    return response;
}

function ipcWriteClientSetup(payload) {
    ipcBridge.sendRequest('Write-Connection', payload);
}

function createWorkbenchSession(connectionId) {
    if (!isNil(unloadTimeout)) {
        clearTimeout(unloadTimeout);
        ipcBridge.sendRequest('Create-Workbench-Session', {connectionId});
    }
}

/**
 * Provides controller constructor for setting up the application.
 *
 * @constructor
 * @param {Object} scope - Injected scope object.
 * @param {RESTClientFactory} restClient - Customised HTTP REST client factory.
 * @param {ViewFrameFactory} viewFrame - Factory for sharing UI attributes.
 * @param {ToastFactory} toast - Factory for displaying notifications.
 */
export default function ClientSetupController(scope, restClient, viewFrame, toast) {
    scope.setupModel = _.deepClone(setupModel);
    scope.connectionList = {};

    scope.queryConnectionList = function () {
        const connectionList = ipcBridge.sendQuery('Read-Connection-List');

        if (typeof connectionList.error === 'string') {
            return false;
        }

        scope.connectionList = connectionList;
    };

    scope.pickConnection = function (event) {
        const {target} = event;
        let tableRow = target;

        if (target.nodeName === 'TBODY') return false;
        else if (target.nodeName !== 'TR') tableRow = target.closest('tr');

        const {connectionId} = tableRow.dataset;

        if (target.nodeName === 'SPAN' && target.classList.contains('delete')) {
            const proceed = confirm('Delete this connection?');

            if (proceed === true) {
                delete scope.connectionList[connectionId];
                /* TODO : Implement delete request handler in main process. */
                ipcBridge.sendRequest('Delete-Connection', {id: connectionId});
            }

            return proceed;
        }

        const fields = Object.keys(scope.connectionList[connectionId]);

        for (let field of fields) {
            scope.setupModel[field] = scope.connectionList[connectionId][field];
            scope.setupModel.id = connectionId;
        }

        if (target.nodeName === 'SPAN' && target.classList.contains('edit')) {
            return true;
        }

        return scope.attemptConnection();
    };

    /**
     * Attempts to connect to the specified server.
     *
     * @param {{target: Object, preventDefault: function}|null} event
     * @returns {boolean}
     */
    scope.attemptConnection = function (event = null) {
        const {nodeName} = _.isObject(event) && _.isObject(event.target) ? event.target : {nodeName: '__none__'};

        if (_.isObject(event) && typeof event.preventDefault === 'function') event.preventDefault();

        for (let property in scope.setupModel) {
            if (_.isText(scope.setupModel[property])) {
                scope.setupModel[property] = scope.setupModel[property].trim();
            }
        }

        if (scope.setupModel.adminHost.length === 0) {
            toast.error('Please provide a valid host address.');
            return false;
        }
        if (nodeName === 'FORM' && scope.setupModel.name.length === 0) {
            toast.error('Please set a name for this connection.');
            return false;
        }

        const options = {
            url: `${scope.setupModel.protocol}://${scope.setupModel.adminHost}:${scope.setupModel.adminPort}`,
            method: 'GET',
            headers: {}
        };

        if (scope.setupModel.basicAuth.username.length >= 1) {
            const {basicAuth} = scope.setupModel;
            options.headers['Authorization'] = `${basicAuth.username}:${basicAuth.password}`;
        }

        const request = restClient.request(options);

        request.then(({data: response}) => {
            try {
                validateServerResponse(response);

                if (nodeName === 'BUTTON') {
                    toast.success('Test OK');
                    return true;
                }

                if (isNone(nodeName)) ipcWriteClientSetup(scope.setupModel);
            } catch (error) {
                toast.error(error.message);
            }
        });

        request.catch(({data: error, xhrStatus, status}) => {
            if (xhrStatus === 'error') toast.error('Unable to connect to the host.');
            else if (status === 401) toast.error('User is unauthorized.');
            else toast.error(error.message);
        });

        return true;
    };

    if (restClient.isConfigured() === true) {
        const request = restClient.get('/');

        request.then(({data: response}) => {
            try {
                validateServerResponse(response);
            } catch (error) {
                toast.error(`${error}`);
                return false;
            }

            unloadTimeout = setTimeout(createWorkbenchSession, 2000, viewFrame.getConfig('sessionId'));
        });

        request.catch(() => {
            scope.queryConnectionList();
            document.body.removeChild(document.getElementById('loaderWrapper'));
        });

        //for (let property in defaultHost) {
        //    scope.setupModel[property] = defaultHost[property];
        //}
    } else {
        scope.queryConnectionList();
        document.body.removeChild(document.getElementById('loaderWrapper'));
    }
}
