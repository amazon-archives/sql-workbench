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

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import Header from '../Header/Header';
import QueryEditor from '../QueryEditor/QueryEditor';
import QueryResults from '../QueryResults/QueryResults';
import { getQueries, getQueryIndex } from '../../utils/utils';

export type QueryResultCSV = string;
export type QueryResultJDBC = string;
export type QueryResultRaw = string;

interface ResponseData {
  data: {
    ok: boolean;
    resp: any;
  };
}

export interface Tab {
  id: string;
  name: string;
  disabled: boolean;
}

export interface ResponseDetail<T> {
  fulfilled: boolean;
  errorMessage?: string;
  data?: T;
}

export interface TranslateResult {
  translation: string;
}

export interface QueryMessage {
  text: any;
  className: string;
}

export interface QueryResult {
  fields: string[];
  records: { [key: string]: any }[];
  message: string;
}

interface MainProps {
  httpClient: any;
}

interface MainState {
  queries: string[];
  queryTranslations: Array<ResponseDetail<TranslateResult>>;
  queryResultsCSV: Array<ResponseDetail<string>>;
  queryResultsTable: Array<ResponseDetail<QueryResult>>;
  queryResultsJDBC: Array<ResponseDetail<string>>;
  queryResults: Array<ResponseDetail<string>>;
  selectedTabName: string;
  selectedTabId: string;
  searchQuery: string;
  itemIdToExpandedRowMap: object;
  message: Array<QueryMessage>;
}

export function getQueryResultsForTable(
  queryResultsRaw: ResponseDetail<QueryResultRaw>[]
): ResponseDetail<QueryResult>[] {
  return queryResultsRaw.map(
    (queryResultResponseDetail: ResponseDetail<QueryResultRaw>): ResponseDetail<QueryResult> => {
      if (!queryResultResponseDetail.fulfilled) {
        return {
          fulfilled: queryResultResponseDetail.fulfilled,
          errorMessage: queryResultResponseDetail.errorMessage,
        };
      } else {
        let databaseRecords: { [key: string]: any }[] = [];
        let databaseFields: string[];
        let hits = [];
        const obj = JSON.parse(queryResultResponseDetail.data);

        if (obj.hasOwnProperty('hits')) {
          hits = obj['hits']['hits'];
          databaseFields = hits != null && hits.length > 0 ? Object.keys(hits[0]['_source']) : [];
        }

        for (let i = 0; i < hits.length; i += 1) {
          const values = hits[i] != null ? Object.values(hits[i]['_source']) : '';
          const databaseRecord: { [key: string]: any } = {};

          //Add row id
          databaseRecord['id'] = i.toString();
          for (let j = 0; j < values.length; j += 1) {
            const field: string = databaseFields[j];
            databaseRecord[field] = values[j];
          }
          databaseRecords.push(databaseRecord);
        }

        return {
          fulfilled: queryResultResponseDetail.fulfilled,
          data: {
            fields: databaseFields,
            records: databaseRecords,
            message: 'Successfull',
          },
        };
      }
    }
  );
}

export class Main extends React.Component<MainProps, MainState> {
  private httpClient: any;

  constructor(props: MainProps) {
    super(props);

    this.state = {
      queries: [],
      queryTranslations: [],
      queryResultsCSV: [],
      selectedTabName: 'messages',
      selectedTabId: 'messages',
      searchQuery: ' ',
      itemIdToExpandedRowMap: { id: { nodes: {}, expandedRow: {}, selectedNodes: {} } },
      queryResultsTable: [],
      queryResultsJDBC: [],
      queryResults: [],
      message: [],
    };

    this.httpClient = this.props.httpClient;
  }

  processTranslateResponse(response: ResponseData): ResponseDetail<TranslateResult> {
    if (!response.data.ok) {
      return {
        fulfilled: false,
        errorMessage: response.data.resp,
        data: null,
      };
    }
    return {
      fulfilled: true,
      data: response.data.resp,
    };
  }

  processQueryResponse(response: ResponseData): ResponseDetail<QueryResultRaw> {
    if (!response.data.ok) {
      return {
        fulfilled: false,
        errorMessage: response.data.resp,
        data: null,
      };
    }

    return {
      fulfilled: true,
      data: response.data.resp,
    };
  }

  onSelectedTabIdChange = (tab: Tab): void => {
    this.setState({
      selectedTabId: tab.id,
      selectedTabName: tab.name,
      searchQuery: ' ',
      itemIdToExpandedRowMap: {},
    });
  };

  onQueryChange = ({ query }) => {
    // Reset pagination state.
    this.setState({
      searchQuery: query,
      itemIdToExpandedRowMap: {},
    });
  };

  updateExpandedMap = map => {
    this.setState({ itemIdToExpandedRowMap: map });
  };

  onRun = (queriesString: string): void => {
    const queries: string[] = getQueries(queriesString);

    if (queries.length > 0) {
      const queryTranslationsPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient.post('../api/sql_console/translate', { query }).catch((error: any) => {
            this.setState({
              message: [
                {
                  text: error.message,
                  className: 'error-message',
                },
              ],
            });
          })
        )
      );

      const queryResultsPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient.post('../api/sql_console/query', { query }).catch((error: any) => {
            this.setState({
              message: [
                {
                  text: error.message,
                  className: 'error-message',
                },
              ],
            });
          })
        )
      );

      const queryResultsJDBCPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient.post('../api/sql_console/queryjdbc', { query }).catch((error: any) => {
            this.setState({ message: error.message });
          })
        )
      );

      const queryResultsCSVPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient.post('../api/sql_console/querycsv', { query }).catch((error: any) => {
            this.setState({ message: error.message });
          })
        )
      );

      Promise.all([
        queryTranslationsPromise,
        queryResultsPromise,
        queryResultsJDBCPromise,
        queryResultsCSVPromise,
      ]).then(
        ([
          queryTranslationsResponse,
          queryResultsResponse,
          queryResultsJDBCResponse,
          queryResultsCSVResponse,
        ]) => {
          const queryResults = queryResultsResponse.map(queryResultResponse =>
            this.processQueryResponse(queryResultResponse)
          );
          const queryResultsForTable = getQueryResultsForTable(queryResults);
          const queryResultsJDBC = queryResultsJDBCResponse.map(queryJDBCResultResponse =>
            this.processQueryResponse(queryJDBCResultResponse)
          );
          const queryResultsCSV = queryResultsCSVResponse.map(queryCSVResultResponse =>
            this.processQueryResponse(queryCSVResultResponse)
          );

          this.setState({
            queries,
            queryTranslations: queryTranslationsResponse.map(translatedQueryResponse =>
              this.processTranslateResponse(translatedQueryResponse)
            ),
            queryResultsTable: queryResultsForTable,
            queryResults: queryResults,
            queryResultsJDBC: queryResultsJDBC,
            queryResultsCSV: queryResultsCSV,
            selectedTabId:
              queryResults && queryResults.length > 0 && queryResults[0].fulfilled
                ? '0'
                : 'messages',
            selectedTabName:
              queryResults &&
              queryResults.length > 0 &&
              queryResults[0].fulfilled &&
              queries.length > 0
                ? getQueryIndex(queries[0])
                : 'messages',
            message: this.getMessage(queryResultsForTable),
            itemIdToExpandedRowMap: {},
            searchQuery: ' ',
          });
        }
      );
    }
  };

  getMessage(queryResultsForTable) {
    const messages = queryResultsForTable.map(queryResult => {
      return {
        text: !queryResult.fulfilled ? queryResult.errorMessage : queryResult.data.message,
        className: !queryResult.fulfilled ? 'error-message' : 'successful-message',
      };
    });
    return messages;
  }

  onTranslate = (queriesString: string): void => {
    const queries: string[] = getQueries(queriesString);
    if (queries.length > 0) {
      Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post('../api/sql_console/translate', { query })
            .catch((error: any) => ({ ok: false, resp: error.message }))
        )
      ).then(queryTranslationsResponse => {
        this.setState({
          queries,
          queryResultsCSV: [],
          queryResultsJDBC: [],
          queryResults: [],
          queryResultsTable: [],
          message: [{ text: '', className: '' }],
          selectedTabId: 'messages',
          selectedTabName: 'messages',
          itemIdToExpandedRowMap: {},
          queryTranslations: queryTranslationsResponse.map(translatedQueryResponse =>
            this.processTranslateResponse(translatedQueryResponse)
          ),
        });
      });
    }
  };

  onClear = (): void => {
    this.setState({
      queryTranslations: [],
      queryResultsCSV: [],
      queryResultsJDBC: [],
      queryResults: [],
      queryResultsTable: [],
      message: [{ text: '', className: '' }],
      selectedTabId: 'messages',
      selectedTabName: 'messages',
      itemIdToExpandedRowMap: {},
    });
  };

  // TODO
  resize() {}

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
              queryTranslations={this.state.queryTranslations}
            />
          </div>

          <EuiSpacer size="l" />
          <div className="sql-console-query-result">
            <QueryResults
              queries={this.state.queries}
              queryResults={this.state.queryResultsTable}
              queryResultsJDBC={this.state.queryResultsJDBC}
              queryResultsRaw={this.state.queryResults}
              queryResultsCSV={this.state.queryResultsCSV}
              message={this.state.message}
              selectedTabId={this.state.selectedTabId}
              selectedTabName={this.state.selectedTabName}
              onSelectedTabIdChange={this.onSelectedTabIdChange}
              itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
              onQueryChange={this.onQueryChange}
              updateExpandedMap={this.updateExpandedMap}
              searchQuery={this.state.searchQuery}
            />
          </div>
        </div>
      </div>
    );
  }
}
