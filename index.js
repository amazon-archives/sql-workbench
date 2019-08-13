/*
 *   Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License").
 *   You may not use this file except in compliance with the License.
 *   A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   or in the "license" file accompanying this file. This file is distributed
 *   on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *   express or implied. See the License for the specific language governing
 *   permissions and limitations under the License.
 */

import query from './server/routes/query';
import translate from './server/routes/translate';
import QueryService from './server/services/query-service';
import TranslateService from './server/services/translate-service';
import { createSqlCluster } from './server/clusters';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'sql-kibana',
    uiExports: {
      app: {
        title: 'Sql Console',
        description: 'ES SQL Console',
        main: 'plugins/sql-kibana/app',
      },
      hacks: [
        'plugins/sql-kibana/hack'
      ],
      styleSheetPaths: require('path').resolve(__dirname, 'public/app.scss'),
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) { // eslint-disable-line no-unused-vars
      // Create Clusters
      createSqlCluster(server);
      const client = server.plugins.elasticsearch;
      
      // Add server routes and initialize the plugin here
      query(server, new QueryService(client));
      translate(server, new TranslateService(client));
    }
  });
}
