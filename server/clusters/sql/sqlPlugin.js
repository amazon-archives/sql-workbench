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

import { TRANSLATE_ROUTE, QUERY_ROUTE, FORMAT_JDBC, FORMAT_CSV } from '../../services/utils/constants';

export default function sqlPlugin(Client, config, components) {
  const ca = components.clientAction.factory;

  Client.prototype.sql = components.clientAction.namespaceFactory();
  const sql = Client.prototype.sql.prototype;

  sql.getTranslation = ca({
    url: {
      fmt: `${TRANSLATE_ROUTE}`,
    },
    needBody: true,
    method: 'POST',
  });

  sql.query = ca({
    url: {
      fmt: `${QUERY_ROUTE}`,
    },
    needBody: true,
    method: 'POST',
  });
  
  sql.getCsv = ca({
	    url: {
	      fmt: `${QUERY_ROUTE}?${FORMAT_CSV}`,
	    },
	    needBody: true,
	    method: 'POST',
	  });
  
  sql.getJdbc = ca({
	    url: {
	      fmt: `${QUERY_ROUTE}?${FORMAT_JDBC}`,
	    },
	    needBody: true,
	    method: 'POST',
	  });

}