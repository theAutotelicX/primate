/**
 * Copyright (c) Ajay Sreedhar. All rights reserved.
 *
 * Licensed under the MIT License.
 * Please see LICENSE file located in the project root for more information.
 */

'use strict';

import _ from '../../lib/core-utils.js';
import {urlQuery, urlOffset} from '../../lib/rest-utils.js';
import {deleteMethodInitiator} from '../helpers/rest-toolkit.js';

/**
 * Provides controller constructor for editing consumer objects.
 *
 * @constructor
 *
 * @param {Object} scope - Injected scope object.
 * @param {RESTClientFactory} restClient - Customised HTTP REST client factory.
 * @param {ViewFrameFactory} viewFrame - Factory for sharing UI details.
 * @param {ToastFactory} toast - Factory for displaying notifications.
 */
export default function ConsumerListController(scope, restClient, viewFrame, toast) {
    scope.consumerList = [];
    scope.consumerNext = {offset: ''};

    /**
     * Retrieves the list of consumers.
     *
     * @param {string|object|null} filters - Filters to the Admin API.
     * @return {boolean} True if request could be made, false otherwise.
     */
    scope.fetchConsumerList = function (filters = null) {
        const request = restClient.get('/consumers' + urlQuery(filters));

        viewFrame.setLoaderSteps(2);
        viewFrame.incrementLoader();

        request.then(({data: response}) => {
            scope.consumerNext.offset = urlOffset(response.next);

            for (let consumer of response.data) {
                let createdAt = new Date(consumer.created_at);

                if (consumer.custom_id === null) {
                    consumer.custom_id = 'Not Provided';
                }

                consumer.created_at = createdAt.toLocaleString();

                scope.consumerList.push(consumer);
            }
        });

        request.catch(() => {
            toast.error('Unable to fetch consumers.');
        });

        request.finally(() => {
            viewFrame.incrementLoader();
        });

        return true;
    };

    /**
     * Deletes the table row entry upon clicking the bin icon.
     *
     * @type {function(Event): boolean}
     */
    scope.deleteTableRow = deleteMethodInitiator(restClient, (err) => {
        if (_.isText(err)) toast.error(err);
        else toast.success('Deleted consumer and credentials.');
    });

    viewFrame.clearBreadcrumbs();
    viewFrame.addBreadcrumb('#!/consumers', 'Consumers');
    viewFrame.setTitle('Consumers');
    viewFrame.addAction('New Consumer', '#!/consumers/__create__');

    scope.fetchConsumerList();
}