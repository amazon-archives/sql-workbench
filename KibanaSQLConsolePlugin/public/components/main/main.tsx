import React from 'react';
import Header from '../header/Header';
import QueryEditor from '../query-editor/QueryEditor';
import QueryResults from '../query-results/QueryResults';
import { EuiSpacer } from '@elastic/eui';
import { getQueries, getQueryIndex } from '../utils/utils';
import { ResponseObject } from 'hapi-latest';
//import { getQueryResultsForTable } from '../query-results/QueryResults';

// FIXME How to manage error messages when running multiple queries?
// FIXME How complex are the ES queries? How queries that return results from multiple indicies be displayed

export type QueryResultCsv = string;

export type QueryResultRaw = {
  fulfilled: boolean,
  errorMessage: string,
  data: {}
};

interface ResponseData {
  data: {
    ok: boolean;
    resp: any;
  };
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
  text: string;
  className: string;
}

export interface QueryResult {
  fields: string[];
  records: {[key: string]: string}[];
}

interface MainProps {
  httpClient: any;
}

interface MainState {
  queries: string[];
  queryTranslations: ResponseDetail<TranslateResult>[];
  queryResultsCsv: ResponseDetail<QueryResultCsv>[];
  selectedTabName: string;
  selectedTabId: string;
}

export function getQueryResultsForTable(queryResultsRaw: ResponseDetail<QueryResultRaw>[]): ResponseDetail<QueryResult>[] {
    return queryResultsRaw.map((queryResultResponseDetail: ResponseDetail<QueryResultRaw>): ResponseDetail<QueryResult> => {
      if (!queryResultResponseDetail.fulfilled) {
        return {
          fulfilled: queryResultResponseDetail.fulfilled,
          errorMessage: queryResultResponseDetail.errorMessage,
        };
      } else {
        //const queryResultRows: string[][] = queryResultResponseDetail.data.split('\n').map((row: string) => row.split(','));
        //const databaseFields: string[] = queryResultRows[0]; // Assumed that there must be at least 2 rows in the result
        const databaseRecords: {[key: string]: string}[] = [];
        const databaseFields: string[]
        const hits = [];
        
        const obj = JSON.parse(queryResultResponseDetail.data);
        
        if (obj.hasOwnProperty('hits')){
           hits = obj["hits"]["hits"];
           databaseFields = ( hits != null && hits.length > 0 ) ? Object.keys(hits[0]["_source"]) : [];
        } 
        
        for (let i = 0 ; i < hits.length; i +=1) {
           const values = hits[i] != null ? Object.values(hits[i]["_source"]) : "";
           const databaseRecord: {[key: string]: string} = {};
           
           //Add row id
           databaseRecord['id'] = i;
           for( let j = 0; j < values.length; j +=1){	 
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
            message: 'Successfull' 
          }
        }
      }
    });
  }

export class Main extends React.Component<MainProps, MainState> {
  private httpClient: any;

  constructor(props: MainProps) {
    super(props);
    
    this.state = {
      queries: [],
      queryTranslations: [],
      queryResultsCsv: [],
      selectedTabName: 'messages',
      selectedTabId: 'messages',
      searchQuery:' ',
      itemIdToExpandedRowMap:{},
    }; 
         
    this.httpClient = this.props.httpClient;
  }

  processTranslateResponse(response: ResponseData): ResponseDetail<TranslateResult> {
  
    if (!response.data.ok) {
      return {
        fulfilled: false,
        errorMessage: response.data.resp,
        data: null
      };
    }
    return {
      fulfilled: true,
      data: JSON.parse(response.data.resp),
    };
  }

  processQueryResponse(response: ResponseData): ResponseDetail<QueryResultCsv> {
    if (!response.data.ok) {
      return {
        fulfilled: false,
        errorMessage: response.data.resp,
        data: null
      };
    }
    
    return {
      fulfilled: true,
      data: response.data.resp
    };
  }

 onSelectedTabIdChange = (tab: object): void => {
    this.setState({
      selectedTabId: tab.id,
      selectedTabName: tab.name,
      searchQuery: ' ',
      itemIdToExpandedRowMap:{},
    })
  }
  
  onQueryChange = ({ query }) => {
    // Reset pagination state.
    this.setState({
      searchQuery: query,
      itemIdToExpandedRowMap:{},
    });
  }
    
  updateExpandedMap = (map) => {
    this.setState({itemIdToExpandedRowMap: map});
  }	  
  
  onRun = (queriesString: string): void => {
    const queries: string[] = getQueries(queriesString);
    
    if (queries.length > 0) {
      const queryTranslationsPromise = Promise.all(queries.map(
        (query: string) =>
          this.httpClient.post('../api/sql_console/translate', { query })
            .catch((error: any) => {
               this.setState({message: {
                               text: error.message,
                               className: "error-message",
                               }
                             })
               }
            )
      ));
      
      const queryResultsPromise = Promise.all(queries.map(
        (query: string) =>
          this.httpClient.post('../api/sql_console/query', { query })
            .catch((error: any) => {
               this.setState({message: error.message})
               }
            )
      ));
      
      const queryResultsJDBCPromise = Promise.all(queries.map(
        (query: string) =>
          this.httpClient.post('../api/sql_console/queryjdbc', { query })
            .catch((error: any) => {
               this.setState({message: error.message})
               }
            )
      ));
      
      const queryResultsCSVPromise = Promise.all(queries.map(
        (query: string) =>
          this.httpClient.post('../api/sql_console/querycsv', { query })
            .catch((error: any) => {
               this.setState({message: error.message})
               }
            )
      ));

      Promise.all([queryTranslationsPromise,queryResultsPromise, queryResultsJDBCPromise, queryResultsCSVPromise])
        .then(([queryTranslationsResponse, queryResultsResponse, queryResultsJDBCResponse, queryResultsCSVResponse]) => {
          const queryResults = queryResultsResponse.map(queryResultResponse => this.processQueryResponse(queryResultResponse));
          const queryResultsForTable = getQueryResultsForTable(queryResults);
          const queryResultsJDBC = queryResultsJDBCResponse.map(queryJDBCResultResponse => this.processQueryResponse(queryJDBCResultResponse));
          const queryResultsCSV = queryResultsCSVResponse.map(queryCSVResultResponse => this.processQueryResponse(queryCSVResultResponse));
          
          this.setState({
            queries,
            queryTranslations: queryTranslationsResponse.map((translatedQueryResponse) => this.processTranslateResponse(translatedQueryResponse)),
            queryResultsTable: queryResultsForTable,
            queryResults: queryResults,
            queryResultsJDBC: queryResultsJDBC,
            queryResultsCSV: queryResultsCSV,
            selectedTabId: queryResults && queryResults.length > 0 && queryResults[0].fulfilled ? '0' : 'messages',
            selectedTabName: queryResults && queryResults.length > 0 && queryResults[0].fulfilled && queries.length > 0 ? getQueryIndex(queries[0]) : 'messages',
            message: this.getMessage(queryResultsForTable),
            itemIdToExpandedRowMap:{},
            searchQuery:' '
          });
        });
    }
  }
  
  getMessage(queryResultsForTable){
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
      Promise.all(queries.map(
        (query: string) =>
          this.httpClient.post('../api/sql_console/translate', { query })
            .catch((error: any) => ({ ok: false, resp: error.message }))
      )).then((queryTranslationsResponse) => {
        
        this.setState({
          queries,
          queryResultsCSV: [],
	      queryResultsJSBC: [],
	      queryResults:[],
	      queryResultsTable: [],
	      message:'',
	      selectedTabId:'messages',
	      selectedTabName: 'messages',
	      itemIdToExpandedRowMap: {},
          queryTranslations: queryTranslationsResponse.map((translatedQueryResponse) => this.processTranslateResponse(translatedQueryResponse))
        });
      });
    }
  }

  onClear = (): void => {
    this.setState({
      queryTranslations: [],
      queryResultsCSV: [],
      queryResultsJSBC: [],
      queryResults:[],
      queryResultsTable: [],
      message:'',
      selectedTabId:'messages',
      selectedTabName: 'messages',
      itemIdToExpandedRowMap: {}
    })
  }

  render() {   
    return <div>
      <Header />
      <div className="sql-console-query-container">
       <div className="sql-console-query-editor">
        <QueryEditor
          onRun={this.onRun}
          onTranslate={this.onTranslate}
          onClear={this.onClear}
          queryTranslations={this.state.queryTranslations}
          sqlQueriesString={this.state.queries}
        />
        </div>
        <EuiSpacer size="l" />
        <div className="sql-console-query-result">
	        <QueryResults
	          queries={this.state.queries}
	          queryResultsTable={this.state.queryResultsTable}
	          queryResultsJDBC={this.state.queryResultsJDBC}
	          queryResultsRaw={this.state.queryResults}
	          queryResultsCSV={this.state.queryResultsCSV}
	          message={this.state.message}
	          selectedTabId={this.state.selectedTabId}
	          selectedTabName={this.state.selectedTabName}
	          onSelectedTabIdChange={this.onSelectedTabIdChange}
              itemIdToExpandedRowMap= {this.state.itemIdToExpandedRowMap}
	          onQueryChange={this.onQueryChange}
	          updateExpandedMap={this.updateExpandedMap}
	          searchQuery={this.state.searchQuery}
	        />
	     </div>    
      </div>
    </div>;
  }
}
