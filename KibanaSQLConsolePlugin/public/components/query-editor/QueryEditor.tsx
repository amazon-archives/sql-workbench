import * as ace from 'brace';
import 'brace/mode/mysql';
import 'brace/mode/json';
import '../../ace-themes/sql_console';
import React from 'react';
import _ from 'lodash';
import { EuiPanel, EuiTitle, EuiButton, EuiText, EuiFlexGroup, EuiFlexItem, EuiCodeEditor } from '@elastic/eui';
import { ResponseDetail, TranslateResult } from '../main/main';

interface QueryEditorProps {
  onRun: (queriesString: string) => void;
  onTranslate: (queriesString: string) => void;
  onClear: () => void;
  queryTranslations: ResponseDetail<TranslateResult>[];
}

interface QueryEditorState {
  sqlQueriesString: string;
}

class QueryEditor extends React.Component<QueryEditorProps, QueryEditorState> {
  constructor(props: QueryEditorProps) {
    super(props);
    this.state = {
      sqlQueriesString: 'SELECT * FROM kibana_sample_data_ecommerce',
     // sqlQueriesString: this.props.sqlQueriesString,
    };

    this.updateSQLQueries = _.debounce(this.updateSQLQueries, 250).bind(this);
  }

  updateSQLQueries(newQueriesString: string) {
    this.setState({ sqlQueriesString: newQueriesString });
  }

  render() {
    return <EuiPanel className="sql-console-query-editor container-panel" paddingSize="none">
      <EuiTitle className="container-panel-header" size="l">
        <h1>SQL console</h1>
      </EuiTitle>
      <EuiFlexGroup gutterSize="none" className="resize-panel">
        <EuiFlexItem grow={1}>
          <EuiPanel className="sql-query-panel" paddingSize="none">
            <EuiText className="sql-query-panel-header">SQL</EuiText>
            <EuiCodeEditor
              mode="mysql"
              theme="sql_console"
              width="100%"
              value={this.state.sqlQueriesString}
              onChange={this.updateSQLQueries}
              showPrintMargin={false}
              setOptions={{
                fontSize: '12px',
                enableBasicAutocompletion: true,
                enableSnippets: true,
                enableLiveAutocompletion: true,
              }}
              onBlur={() => { console.log('blur'); }} // eslint-disable-line no-console
              aria-label="Code Editor"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel className="translated-query-panel" paddingSize="none">
            <EuiText className="translated-query-panel-header">Elasticsearch query string</EuiText>
            <EuiCodeEditor
              mode="json"
              theme="sql_console"
              width="100%"
              value={this.props.queryTranslations.map((queryTranslation: any) =>
		                JSON.stringify(queryTranslation.data, null, 2)
		              ).join('\n')}
              onChange={() => {}}
              showPrintMargin={false}
              readOnly={true}
              setOptions={{
                fontSize: '12px',
                readOnly: true,
                highlightActiveLine: false,
                highlightGutterLine: false,
              }}
              onBlur={() => { console.log('blur'); }} // eslint-disable-line no-console
              aria-label="Code Editor"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div className="action-container">
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false} onClick={() => this.props.onRun(this.state.sqlQueriesString)}><EuiButton fill={true}>Run</EuiButton></EuiFlexItem>
          <EuiFlexItem grow={false} onClick={() => this.props.onTranslate(this.state.sqlQueriesString)}><EuiButton>Translate</EuiButton></EuiFlexItem>
          <EuiFlexItem grow={false} onClick={() => this.props.onClear()}><EuiButton>Clear</EuiButton></EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPanel>;
  }
}

export default QueryEditor;
