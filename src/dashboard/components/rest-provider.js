/**
 * Copyright (c) Ajay Sreedhar. All rights reserved.
 *
 * Licensed under the MIT License.
 * Please see LICENSE file located in the project root for more information.
 */

'use strict';

/**
 * Provides a REST wrapper over Angular $http service.
 *
 * The REST service provides customisation options as per Kong admin API specifications.
 *
 * @typedef {Object} K_RESTFactory
 * @property {(function(options: Object): Promise)} request - Makes an HTTP request of specified method.
 * @property {(function(endpoint: string): Promise)} get - Makes an HTTP GET request.
 * @property {(function(endpoint: string, payload: Object): Promise)} post - Makes an HTTP POST request.
 * @property {(function(endpoint: string, payload: Object): Promise)} put - Makes an HTTP PUT request.
 * @property {(function(endpoint: string, payload: Object): Promise)} patch - Makes an HTTP PATCH request.
 * @property {(function(endpoint: string): Promise)} delete - Makes an HTTP DELETE request.
 * @property {(function(host: string): void)} setHost - Sets the host name.
 */

/**
 * Implements the provider for {@link K_RESTFactory REST factory}.
 *
 * @typedef {Object} K_RESTProvider
 * @property {(function(options: Object): void)} initialize - Initializes with the provided options.
 * @property {(function(username: string,
 *      password: string): void)} setBasicAuth - Sets basic authorization header.
 * @property {(function(type: string): void)} setAcceptType - Sets accept header.
 * @property {(function(type: string): void)} setContentType - Sets contentType header.
 */

import _ from '../../lib/utility.js';

/**
 * Stores system-wide HTTP configuration.
 *
 * @type {Object}
 * @property {string} host - The server host
 * @property {authorization} -
 */
const REST_CONFIG = {
    host: '',
    authorization: null,
    accept: 'application/json',
    contentType: 'application/json'
};

function configure(options) {
    const request = {
        method: options.method,
        url: options.url || REST_CONFIG.host + options.resource,
        headers: {},
        withCredentials: false
    };

    if (typeof options.url === 'string') {
        request.url = options.url;
    } else {
        request.url = REST_CONFIG.host + (typeof options.endpoint === 'string' ? options.endpoint : options.resource);
    }

    if (typeof options.data === 'object') request.data = options.data;

    if (typeof REST_CONFIG.authorization === 'string') {
        request.withCredentials = true;
        request.headers['Authorization'] = REST_CONFIG.authorization;
    }

    if (typeof REST_CONFIG.accept === 'string') request.headers['Accept'] = REST_CONFIG.accept;

    if (typeof REST_CONFIG.contentType === 'string') request.headers['Content-Type'] = REST_CONFIG.contentType;

    if (typeof options.headers === 'object') {
        Object.keys(options.headers).forEach(function (item) {
            request.headers[item] = options.headers[item];
        });
    }

    if (typeof options.query === 'object') {
        const query = new URLSearchParams();

        for (let param in options.query) {
            if (options.query[param] !== null) {
                query.append(param, options.query[param]);
            }
        }

        request.url = `${request.url}?` + query.toString();
    }

    if (Object.keys(request.headers).length <= 0) delete request.headers;

    return request;
}

/**
 * Builds and returns the REST factory singleton.
 *
 * @param {(function(Object): Promise)} http - The Angular $http service.
 * @returns {K_RESTFactory} REST factory.
 */
function buildRESTFactory(http) {
    return {
        request(options) {
            return http(configure(options));
        },

        get(endpoint) {
            return http(configure({method: 'GET', endpoint}));
        },

        post(endpoint, payload) {
            return http(configure({method: 'POST', data: payload, endpoint}));
        },

        put(endpoint, payload) {
            return http(configure({method: 'PUT', data: payload, endpoint}));
        },

        patch(endpoint, payload) {
            return http(configure({method: 'PATCH', data: payload, endpoint}));
        },

        delete(endpoint) {
            return http(configure({method: 'DELETE', endpoint}));
        },

        setHost(host) {
            REST_CONFIG.host = host;
        }
    };
}

/**
 * Implements the provider for {@link K_RESTFactory REST factory service}.
 *
 * @constructor
 * @type {K_RESTProvider}
 */
export default function RestProvider() {
    this.initialize = (options) => {
        for (let name in options) {
            if (!_.isDefined(REST_CONFIG[name])) {
                continue;
            }

            switch (name) {
                case 'authorization':
                    REST_CONFIG[name] = 'Basic ' + btoa(options[name]);
                    break;

                default:
                    REST_CONFIG[name] = options[name];
                    break;
            }
        }
    };

    this.setHost = (host) => {
        REST_CONFIG.host = host;
    };

    this.setBasicAuth = (username, password) => {
        REST_CONFIG.authorization = 'Basic ' + btoa(username + ':' + (password || ''));
    };

    this.setAcceptType = (type) => {
        REST_CONFIG.accept = type;
    };

    this.setContentType = (type) => {
        REST_CONFIG.contentType = type;
    };

    this.$get = ['$http', buildRESTFactory];
}