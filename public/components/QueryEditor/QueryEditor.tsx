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
import _ from "lodash";
// @ts-ignore
import { EuiPanel, EuiTitle, EuiButton, EuiText, EuiFlexGroup, EuiFlexItem, EuiCodeEditor, EuiHeaderLink} from "@elastic/eui/lib";
import "brace/mode/mysql";
import "brace/mode/json";
import "../../ace-themes/sql_console";
import {ResponseDetail, TranslateResult} from "../Main/main";

interface QueryEditorProps {
  onRun: (queriesString: string) => void;
  onTranslate: (queriesString: string) => void;
  onClear: () => void;
  queryTranslations: ResponseDetail<TranslateResult>[];
  sqlQueriesString: string;
}

interface QueryEditorState {
  sqlQueriesString: string;
}

class QueryEditor extends React.Component<QueryEditorProps, QueryEditorState> {
  constructor(props: QueryEditorProps) {
    super(props);
    this.state = {
      sqlQueriesString: this.props.sqlQueriesString ? this.props.sqlQueriesString : ""
    };

    this.updateSQLQueries = _.debounce(this.updateSQLQueries, 250).bind(this);
  }

  updateSQLQueries(newQueriesString: string): void {
    this.setState({ sqlQueriesString: newQueriesString });
  }

  render() {
    return (
      <EuiPanel className="sql-console-query-editor container-panel"
        paddingSize="none"
      >
        <EuiTitle className="container-panel-header" size="l">
          <h1>SQL console</h1>
        </EuiTitle>

        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={1} className="sql-query-panel" paddingSize="none">
            <EuiText className="sql-query-panel-header">SQL Query</EuiText>
            <EuiCodeEditor
              mode="mysql"
              theme="sql_console"
              width="100%"
              height="18.5rem"
              value={this.state.sqlQueriesString}
              onChange={this.updateSQLQueries}
              showPrintMargin={false}
              setOptions={{
                fontSize: "12px",
                enableBasicAutocompletion: true,
                enableSnippets: true,
                enableLiveAutocompletion: true
              }}
              aria-label="Code Editor"
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={1}
            className="result-panel"
            paddingSize="none"
          >
            <EuiText className="translated-query-panel-header">
              Translation
            </EuiText>
            <EuiCodeEditor
              mode="json"
              theme="sql_console"
              width="100%"
              height="18.5rem"
              value={this.props.queryTranslations
                .map((queryResults: any) =>
                  JSON.stringify(queryResults.data, null, 2)
                )
                .join("\n")}
              showPrintMargin={false}
              readOnly={true}
              setOptions={{
                fontSize: "12px",
                readOnly: true,
                highlightActiveLine: false,
                highlightGutterLine: false
              }}
              aria-label="Code Editor"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <div>
          <EuiFlexGroup className="action-container" gutterSize="m">
            <EuiFlexItem
              grow={false}
              onClick={() => this.props.onRun(this.state.sqlQueriesString)}
            >
              <EuiButton fill={true} className="sql-editor-button" >
                Run
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              onClick={() =>
                this.props.onTranslate(this.state.sqlQueriesString)
              }
            >
              <EuiButton className="sql-editor-button">
                Translate
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              onClick={() => {
                this.updateSQLQueries("");
                this.props.onClear();
              }}
            >
              <EuiHeaderLink className="sql-editor-link" href="#" isActive>
                Clear
              </EuiHeaderLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPanel>
    );
  }
}

export default QueryEditor;
