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

import React from "react";
import {EuiSpacer} from "@elastic/eui";
import {IHttpResponse, IHttpService} from "angular";
import _ from "lodash";
import Header from "../Header/Header";
import QueryEditor from "../QueryEditor/QueryEditor";
import QueryResults from "../QueryResults/QueryResults";
import {getDefaultTabId, getDefaultTabLabel, getQueries, getSelectedResults, Tree} from "../../utils/utils";
import {MESSAGE_TAB_LABEL} from "../../utils/constants";

interface ResponseData {
  ok: boolean;
  resp: any;
}

export interface ResponseDetail<T> {
  fulfilled: boolean;
  errorMessage?: string;
  data?: T;
}

export type TranslateResult = { [key: string]: any };

export interface QueryMessage {
  text: any;
  className: string;
}

export type QueryResult = {
  fields: string[];
  records: { [key: string]: any }[];
  message: string;
};

export interface Tab {
  id: string;
  name: string;
  disabled: boolean;
}

export type ItemIdToExpandedRowMap = {[key: string]:{
  nodes: Tree;
  expandedRow?: {};
  selectedNodes?: {[key: string]: any};
}};

interface MainProps {
  httpClient: IHttpService;
  sqlQueriesString?: string;
}

interface MainState {
  queries: string[];
  queryTranslations: Array<ResponseDetail<TranslateResult>>;
  queryResultsTable: Array<ResponseDetail<QueryResult>>;
  queryResults: Array<ResponseDetail<string>>;
  queryResultsJDBC: Array<ResponseDetail<string>>;
  queryResultsCSV: Array<ResponseDetail<string>>;
  queryResultsTEXT: Array<ResponseDetail<string>>;
  selectedTabName: string;
  selectedTabId: string;
  searchQuery: string;
  itemIdToExpandedRowMap: ItemIdToExpandedRowMap;
  messages: Array<QueryMessage>;
}

const SUCCESS_MESSAGE = "Success";

// It gets column names and row values to display in a Table from the json API response
export function getQueryResultsForTable(queryResultsRaw: ResponseDetail<string>[]): ResponseDetail<QueryResult>[] {
  return queryResultsRaw.map(
    ( queryResultResponseDetail: ResponseDetail<string> ): ResponseDetail<QueryResult> => {
      if (!queryResultResponseDetail.fulfilled) {
        return {
          fulfilled: queryResultResponseDetail.fulfilled,
          errorMessage: queryResultResponseDetail.errorMessage
        };
      } else {
        let databaseRecords: { [key: string]: any }[] = [];
        const responseObj = queryResultResponseDetail.data ? JSON.parse(queryResultResponseDetail.data) : '';
        let databaseFields: string[] = [];
        let fields: string[] = [];

        // the following block is to deal with describe/show/delete query from jdbc results
        if (_.has(responseObj, 'schema')) {
          const schema: object[] = _.get(responseObj, 'schema');
          const datarows: any[][] = _.get(responseObj, 'datarows');
          let queryType: string = 'show';

          for (const column of schema.values()) {
            if (_.isEqual(_.get(column, 'name'), 'deleted_rows')) {
              queryType = 'delete';
            } else if (_.isEqual(_.get(column, 'name'), 'DATA_TYPE')) {
              queryType = 'describe'
            }
          }
          switch (queryType) {
            case 'delete':
            case 'describe':
              for (const [id, field] of schema.entries()) {
                fields[id] = _.get(field, 'name');
              }
              databaseFields = fields;
              databaseFields.unshift("id");
              for (const [id, datarow] of datarows.entries()) {
                let databaseRecord: { [key: string]: any } = {};
                databaseRecord['id'] = id;
                for (const index of schema.keys()) {
                  const fieldname = databaseFields[index+1];
                  databaseRecord[fieldname] = datarow[index];
                }
                databaseRecords.push(databaseRecord);
              }
              break;
            case 'show':
              databaseFields[0] = 'TABLE_NAME';
              databaseFields.unshift('id');
              let index: number = -1;
              for (const [id, field] of schema.entries()) {
                if (_.eq(_.get(field, 'name'), 'TABLE_NAME')) {
                  index = id;
                  break;
                }
              }
              for (const [id, datarow] of datarows.entries()) {
                let databaseRecord: { [key: string]: any } = {};
                databaseRecord['id'] = id;
                databaseRecord['TABLE_NAME'] = datarow[index];
                databaseRecords.push(databaseRecord);
              }
              break;
            default:
              let databaseRecord: { [key: string]: any } = {};
              databaseRecord['id'] = 'null';
              databaseRecords.push(databaseRecord);
          }
          return {
            fulfilled: queryResultResponseDetail.fulfilled,
            data: {
              fields: databaseFields,
              records: databaseRecords,
              message: SUCCESS_MESSAGE
            }
          }
        }

        // the following block is to deal with aggregation result
        if (_.has(responseObj, "aggregations")) {
          const aggregations = _.get(responseObj, "aggregations", {});
          let databaseRecord: { [key: string]: any } = {};
          databaseFields = Object.keys(aggregations);
          databaseFields.unshift("id");

          databaseRecord["id"] = "value";
          for (let i = 1; i < databaseFields.length; i++) {
            const field: string = databaseFields[i];
            databaseRecord[field] = _.get(responseObj, "aggregations[" + field + "][value]");
          }
          databaseRecords.push(databaseRecord);
          return {
            fulfilled: queryResultResponseDetail.fulfilled,
            data: {
              fields: databaseFields,
              records: databaseRecords,
              message: SUCCESS_MESSAGE
            }
          }
        }

        const hits = _.get(responseObj, "hits[hits]", []);
        if (hits.length > 0) {
          databaseFields=(Object.keys(hits[0]["_source"]));
          databaseFields.unshift("id");
        }

        for (let i = 0; i < hits.length; i += 1) {
          const values = hits[i] != null ? Object.values(hits[i]["_source"]) : "";
          const databaseRecord: { [key: string]: any } = {};

          //Add row id
          databaseRecord["id"] = i;
          for (let j = 0; j < values.length; j += 1) {
            const field: string = databaseFields[j+1]; // databaseFields has an extra value for "id"
            databaseRecord[field] = values[j];
          }
          databaseRecords.push(databaseRecord);
        }

        return {
          fulfilled: queryResultResponseDetail.fulfilled,
          data: {
            fields: databaseFields,
            records: databaseRecords,
            message: SUCCESS_MESSAGE
          }
        };
      }
    }
  );
}

export class Main extends React.Component<MainProps, MainState> {
  httpClient: IHttpService;
  // httpClient: any;

  constructor(props: MainProps) {
    super(props);

    this.state = {
      queries: [],
      queryTranslations: [],
      queryResultsTable: [],
      queryResults: [],
      queryResultsJDBC: [],
      queryResultsCSV: [],
      queryResultsTEXT: [],
      selectedTabName: MESSAGE_TAB_LABEL,
      selectedTabId: MESSAGE_TAB_LABEL,
      searchQuery: "",
      itemIdToExpandedRowMap: {},
      messages: []
    };

    this.httpClient = this.props.httpClient;
  }

  processTranslateResponse(response: IHttpResponse<ResponseData>): ResponseDetail<TranslateResult> {
      if(!response){
        return{
          fulfilled: false,
          errorMessage: "no response",
          data: undefined
        }
      }
    if (!response.data.ok) {
      return {
        fulfilled: false,
        errorMessage: response.data.resp,
        data: undefined
      };
    }
    return {
      fulfilled: true,
      data: response.data.resp
    };
  }

  processQueryResponse(response: IHttpResponse<ResponseData>): ResponseDetail<string> {
    if(!response){
      return{
        fulfilled: false,
        errorMessage: "no response",
        data: ''
      }
    }
    if (!response.data.ok) {
      return {
        fulfilled: false,
        errorMessage: response.data.resp,
        data: ''
      };
    }

    return {
      fulfilled: true,
      data: response.data.resp
    };
  }

  onSelectedTabIdChange = (tab: Tab): void => {
    this.setState({
      selectedTabId: tab.id,
      selectedTabName: tab.name,
      searchQuery: " ",
      itemIdToExpandedRowMap: {}
    });
  };

  onQueryChange = ({query}: {query : any}) => {
    // Reset pagination state.
    this.setState({
      searchQuery: query,
      itemIdToExpandedRowMap: {},
    });
  };

  updateExpandedMap = (map: ItemIdToExpandedRowMap): void => {
    this.setState({ itemIdToExpandedRowMap: map });
  };

  // It returns the error or successful message to display in the Message Tab
  getMessage( queryResultsForTable: ResponseDetail<QueryResult>[] ): Array<QueryMessage> {
    return queryResultsForTable.map(queryResult => {
      return {

        text: queryResult.fulfilled && queryResult.data ? queryResult.data.message : queryResult.errorMessage,
        className: queryResult.fulfilled ? "successful-message" : "error-message"
      };
    });
  }

  getTranslateMessage( translationResult: ResponseDetail<TranslateResult>[] ): Array<QueryMessage> {
    return translationResult.map(translation => {
      return {
        text: translation.data ? SUCCESS_MESSAGE : translation.errorMessage,
        className: translation.fulfilled ? "successful-message" : "error-message"
      }
    });
  }

  isSelectQuery(query: string): boolean {
    return _.startsWith(_.trim(query).toLowerCase(), "select");
  }

  requestedFormat(query: string): string {
    if (this.isSelectQuery(query)) return "";
    return "jdbc";
  }

  onRun = (queriesString: string): void => {
    const queries: string[] = getQueries(queriesString);

    if (queries.length > 0) {

      const esRawResponsePromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/query".concat(this.requestedFormat(query)), {query})
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      );

      const translationPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/translate", {query})
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      );

      Promise.all([esRawResponsePromise, translationPromise]).then(([esRawResponse, translationResponse]) => {
        const esRawResult: ResponseDetail<string>[] = esRawResponse.map(esRawResponse =>
          this.processQueryResponse(esRawResponse as IHttpResponse<ResponseData>));
        const resultTable: ResponseDetail<QueryResult>[] = getQueryResultsForTable(esRawResult);
        const translationResult: ResponseDetail<TranslateResult>[] = translationResponse.map(translationResponse =>
          this.processTranslateResponse(translationResponse as IHttpResponse<ResponseData>));

        this.setState({
          queries: queries,
          queryResults: esRawResult,
          queryTranslations: translationResult,
          queryResultsTable: resultTable,
          selectedTabId: getDefaultTabId(esRawResult),
          selectedTabName: getDefaultTabLabel(esRawResult, queries[0]),
          messages: this.getMessage(resultTable),
          itemIdToExpandedRowMap: {},
          queryResultsJDBC: [],
          queryResultsCSV: [],
          queryResultsTEXT: [],
          searchQuery: ""
        }, () => console.log("Successfully updated the states")); // added callback function to handle async issues
      })

    }
  };

  onTranslate = (queriesString: string): void => {
    const queries: string[] = getQueries(queriesString);

    if (queries.length > 0) {

      const translationPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/translate", {query})
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      );

      Promise.all([translationPromise]).then(([translationResponse]) => {
        const translationResult: ResponseDetail<TranslateResult>[] = translationResponse.map(translationResponse =>
          this.processTranslateResponse(translationResponse as IHttpResponse<ResponseData>));
        const shouldCleanResults = queries == this.state.queries;
        if (shouldCleanResults) {
          this.setState({
            queries,
            queryTranslations: translationResult,
            messages: this.getTranslateMessage(translationResult)
          })
        } else {
          this.setState({
            queries,
            queryTranslations: translationResult,
            messages: this.getTranslateMessage(translationResult),

            // clean all the results generated from the last cached query
            queryResults: [],
            queryResultsTable: [],
            selectedTabName: MESSAGE_TAB_LABEL,
            selectedTabId: MESSAGE_TAB_LABEL,
            itemIdToExpandedRowMap: {},
            queryResultsJDBC: [],
            queryResultsCSV: [],
            queryResultsTEXT: [],
            searchQuery: ""
          }, () => console.log("Successfully updated the states"))
        }
      });
    }
  };

  getRawResponse = (queries: string[]): void => {
    if (queries.length > 0) {
      Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/query", {query})
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      ).then(
        rawResponse => {
          const rawResponseResult: ResponseDetail<string>[] = rawResponse.map(rawResponse =>
            this.processQueryResponse(rawResponse as IHttpResponse<ResponseData>));
          this.setState({
            queries,
            queryResults: rawResponseResult
          }, () => console.log("Successfully updated the states"));
        }
      )
    }
  };

  getJdbc = (queries: string[]): void => {
    if (queries.length > 0) {
      Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/queryjdbc", {query})
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      ).then(
        jdbcResponse => {
          const jdbcResult: ResponseDetail<string>[] = jdbcResponse.map(jdbcResponse =>
            this.processQueryResponse(jdbcResponse as IHttpResponse<ResponseData>));
          this.setState({
            queries,
            queryResultsJDBC: jdbcResult
          }, () => console.log("Successfully updated the states"));
        }
      )
    }
  };

  getCsv = (queries: string[]): void => {
    if (queries.length > 0) {
      Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/querycsv", {query})
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      ).then(
        csvResponse => {
          const csvResult: ResponseDetail<string>[] = csvResponse.map(csvResponse =>
            this.processQueryResponse(csvResponse as IHttpResponse<ResponseData>));
          this.setState({
            queries,
            queryResultsCSV: csvResult
          }, () => console.log("Successfully updated the states"));
        }
      )
    }
  };

  getText = (queries: string[]): void => {
    if (queries.length > 0) {
      Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/querytext", {query})
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      ).then(
        textResponse => {
          const textResult: ResponseDetail<string>[] = textResponse.map(textResponse =>
            this.processQueryResponse(textResponse as IHttpResponse<ResponseData>));
          this.setState({
            queries,
            queryResultsTEXT: textResult
          }, () => console.log("Successfully updated the states"));
        }
      )
    }
  };

  onClear = (): void => {
    this.setState({
      queries: [],
      queryTranslations: [],
      queryResultsTable: [],
      queryResults: [],
      queryResultsCSV: [],
      queryResultsJDBC: [],
      queryResultsTEXT: [],
      messages: [],
      selectedTabId: MESSAGE_TAB_LABEL,
      selectedTabName: MESSAGE_TAB_LABEL,
      itemIdToExpandedRowMap: {}
    });
  };

  render() {
    return (
      <div>
        <Header />
        <div className="sql-console-query-container">
          <div className="sql-console-query-editor">
            <QueryEditor
              onRun={this.onRun}
              onTranslate={this.onTranslate}
              onClear={this.onClear}
              sqlQueriesString={this.props.sqlQueriesString ? this.props.sqlQueriesString : '' }
              queryTranslations={this.state.queryTranslations}
            />
          </div>

          <EuiSpacer size="l" />
          <div className="sql-console-query-result">
            <QueryResults
              queries={this.state.queries}
              queryResults={this.state.queryResultsTable}
              queryRawResponse={getSelectedResults(this.state.queryResults, this.state.selectedTabId)}
              queryResultsJDBC={getSelectedResults(this.state.queryResultsJDBC, this.state.selectedTabId)}
              queryResultsCSV={getSelectedResults(this.state.queryResultsCSV, this.state.selectedTabId)}
              queryResultsTEXT={getSelectedResults(this.state.queryResultsTEXT, this.state.selectedTabId)}
              messages={this.state.messages}
              selectedTabId={this.state.selectedTabId}
              selectedTabName={this.state.selectedTabName}
              onSelectedTabIdChange={this.onSelectedTabIdChange}
              itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
              onQueryChange={this.onQueryChange}
              updateExpandedMap={this.updateExpandedMap}
              searchQuery={this.state.searchQuery}
              tabsOverflow={false}
              getRawResponse={this.getRawResponse}
              getJdbc={this.getJdbc}
              getCsv={this.getCsv}
              getText={this.getText}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default Main;
