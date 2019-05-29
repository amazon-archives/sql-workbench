import query from './server/routes/query';
import translate from './server/routes/translate';
import QueryService from './server/services/query-service';
import TranslateService from './server/services/translate-service';
import { createSqlCluster } from './server/clusters';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'sql_console',
    uiExports: {
      app: {
        title: 'Sql Console',
        description: 'ES SQL Console',
        main: 'plugins/sql_console/app',
      },
      hacks: [
        'plugins/sql_console/hack'
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

      // const config = server.config();
      // const [
      //   schemeExtensionsSymbol,
      //   configValuesSymbol,
      //   joiSchemaSymbol,
      // ] = Object.getOwnPropertySymbols(config);
      // const configValues = config[configValuesSymbol];
      // const { elasticsearch: elasticsearchConfig } = configValues;

      const client = server.plugins.elasticsearch;
      // Add server routes and initialize the plugin here
      query(server, new QueryService(client));
      translate(server, new TranslateService(client));
    }
  });
}
