# Open Distro for Elasticsearch SQL Kibana

The Open Distro for Elasticsearch SQL Kibana plugin lets you query your Elasticsearch data using SQL syntax from a dedicated Kibana UI. You can then download data in JSON, JDBC, or CSV format.


## Documentation

Please see our [documentation](https://opendistro.github.io/for-elasticsearch-docs/).


## Setup

1. Download Elasticsearch for the version that matches the [Kibana version specified in package.json](./package.json#L8).
1. Download and install the appropriate [Open Distro for Elasticsearch Sql plugin](https://github.com/opendistro-for-elasticsearch/sql).
1. Download the Kibana source code for the [version specified in package.json](./package.json#L8) you want to set up.

   See the [Kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#setting-up-your-development-environment) for more instructions on setting up your development environment.
   
1. Change your node version to the version specified in `.node-version` inside the Kibana root directory.
1. Create a `kibana-extra` directory as a sibling directory to the Kibana source code directory.
1. Check out this package from version control into the `kibana-extra` directory.
1. Run `yarn kbn bootstrap` inside `kibana-extra/opendistro-elasticsearch-sql-kibana`.

Ultimately, your directory structure should look like this:

```md
.
├── kibana
├── kibana-extra
│   └── opendistro-elasticsearch-sql-kibana
```


## Build

To build the plugin's distributable zip simply run `yarn build`.

Example output: `./build/opendistro-kibana-sql-1.0.0.0.zip`


## Run

- `yarn start`

  Starts Kibana and includes this plugin. Kibana will be available on `localhost:5601`.

- `NODE_PATH=../../kibana/node_modules yarn test:jest`

  Runs the plugin tests.


## Contributing to Open Distro for Elasticsearch SQL Kibana

- Refer to [CONTRIBUTING.md](./CONTRIBUTING.md).
- Since this is a Kibana plugin, it can be useful to review the [Kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) alongside the documentation around [Kibana plugins](https://www.elastic.co/guide/en/kibana/master/kibana-plugins.html) and [plugin development](https://www.elastic.co/guide/en/kibana/master/plugin-development.html).



## License

This code is licensed under the Apache 2.0 License. 

## Copyright

Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.