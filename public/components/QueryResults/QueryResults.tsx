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

import React, { Component } from 'react';
import { SortableProperties, SortableProperty } from '@elastic/eui/lib/services';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTab,
  EuiTabs,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiSearchBar,
  Pager,
  EuiIcon,
} from '@elastic/eui/lib';
import 'brace/mode/mysql';
import 'brace/mode/json';
import '../../ace-themes/sql_console';
import { QueryResult, QueryMessage, Tab, ResponseDetail } from '../Main/main';
import QueryResultsBody from './QueryResultsBody';
import { getQueryIndex } from '../../utils/utils';
import { DEFAULT_NUM_RECORDS_PER_PAGE, MAX_NUM_TABS } from '../../utils/constants';


interface QueryResultsProps {
  queries: string[];
  queryResults: ResponseDetail<QueryResult>[];
  message: QueryMessage[];
  selectedTabName: string;
  selectedTabId: string;
  searchQuery: string;
  onSelectedTabIdChange: (tab: Tab) => void;
  onQueryChange: (query: object) => void;
  updateExpandedMap: (map: object) => void;
  itemIdToExpandedRowMap: object;
  queryResultsRaw: ResponseDetail<string>[];
  queryResultsJDBC: ResponseDetail<string>[];
  queryResultsCSV: ResponseDetail<string>[];
}

interface QueryResultsState {
  isPopoverOpen: boolean;
  itemsPerPage: number;
}

class QueryResults extends Component<QueryResultsProps, QueryResultsState> {
  public sortableColumns: Array<SortableProperty<string>>;
  public sortableProperties: SortableProperties;
  public sortedColumn: string;
  public tabNames: string[];
  public pager: Pager;
  public panels: string[];

  constructor(props: QueryResultsProps) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      itemsPerPage: DEFAULT_NUM_RECORDS_PER_PAGE,
    };

    this.sortableColumns = [];
    this.sortedColumn = '';
    this.sortableProperties = new SortableProperties(
      [
        {
          name: '',
          getValue: item => '',
          isAscending: true,
        },
      ],
      ''
    );

    this.tabNames = [];
    this.pager = new Pager(0, this.state.itemsPerPage);
  }

  // Actions for Tabs Button
  onButtonClick = (): void => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = (): void => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  onChangeItemsPerPage = itemsPerPage => {
    this.pager.setItemsPerPage(itemsPerPage);
    this.setState({
      itemsPerPage,
    });
  };

  onChangePage = pageIndex => {
    this.pager.goToPageIndex(pageIndex);
    this.setState({});
  };

  updatePagination(totalItemsCount) {
    this.pager.setTotalItems(totalItemsCount);
  }

  // Update SORTABLE COLUMNS - All columns
  updateSortableColumns(queryResultsSelected) {
    if (this.sortableColumns.length === 0) {
      queryResultsSelected.fields.map((field: string) => {
        this.sortableColumns.push({
          name: field,
          getValue: item => item[field],
          isAscending: true,
        });
      });
      this.sortedColumn = this.sortableColumns.length > 0 ? this.sortableColumns[0].name : '';
      this.sortableProperties = new SortableProperties(this.sortableColumns, this.sortedColumn);
    }
  }

  onSort = prop => {
    this.sortableProperties.sortOn(prop);
    this.sortedColumn = prop;
    this.setState({});
  };

  getQueryResult = (queryResults, selectedTabId): QueryResult => {
    const selectedIndex: number = parseInt(selectedTabId);
    if (!Number.isNaN(selectedIndex)) {
      const queryResultResponseDetail: ResponseDetail<QueryResult> = queryResults[selectedIndex];
      return queryResultResponseDetail && queryResultResponseDetail.fulfilled
        ? queryResultResponseDetail.data
        : null;
    }
    return null;
  };

  renderTabs(): Tab[] {
    const tabs = [
      {
        id: 'messages',
        name: 'Messages',
        disabled: false,
      },
    ];

    this.tabNames = [];
    if (this.props.queryResults) {
      for (let i = 0; i < this.props.queryResults.length; i += 1) {
        const tabName = getQueryIndex(this.props.queries[i]);
        this.tabNames.push(tabName);
        if (this.props.queryResults[i].fulfilled) {
          tabs.push({
            id: i.toString(),
            name: tabName,
            disabled: false,
          });
        }
      }
    }
    return tabs;
  }

  render() {
    // Update PAGINATION  and SORTABLE columns
    const queryResultSelected = this.props.queryResults
      ? this.getQueryResult(this.props.queryResults, this.props.selectedTabId)
      : undefined;

    if (queryResultSelected) {
      const matchingItems = this.props.searchQuery
        ? EuiSearchBar.Query.execute(this.props.searchQuery, queryResultSelected.records)
        : queryResultSelected.records;
      this.updatePagination(matchingItems.length);
      this.updateSortableColumns(queryResultSelected);
    }

    // Action button with list of tabs
    const tabIcon = <EuiIcon onClick={this.onButtonClick} type={'arrowDown'} disabled={false} />;
    const tabs: Tab[] = this.renderTabs();
    const showArrows: boolean = tabs.length > MAX_NUM_TABS;

    const tabsItems = tabs.map((tab, index) => (
      <EuiContextMenuItem
        key="10 rows"
        icon="empty"
        onClick={() => {
          this.closePopover();
          this.pager.goToPageIndex(0);
          this.sortableColumns = [];
          this.props.onSelectedTabIdChange(tab);
        }}
      >
        {tab.name}
      </EuiContextMenuItem>
    ));

    const tabsButtons = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => {
          this.pager.goToPageIndex(0);
          this.sortableColumns = [];
          this.props.onSelectedTabIdChange(tab);
        }}
        isSelected={tab.id === this.props.selectedTabId}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));

    return (
      <EuiPanel className="query-result-container" paddingSize="none">
        <EuiFlexGroup
          style={{
            padding: '10px',
            'border-top-color': '#69707d',
            'border-left-color': '#69707d',
            'border-right-color': '#69707d',
          }}
        >
          <EuiFlexGroup className="tabs-container" alignItems="center" gutterSize="s">
            <EuiFlexItem style={{ marginTop: '8px', marginBottom: '18px' }} grow={false}>
              <EuiTabs>{tabsButtons}</EuiTabs>
            </EuiFlexItem>
          </EuiFlexGroup>

          {showArrows && (
            <div className="tab-arrow-down-container">
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id="singlePanel"
                  button={tabIcon}
                  isOpen={this.state.isPopoverOpen}
                  closePopover={this.closePopover}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenuPanel items={tabsItems} />
                </EuiPopover>
              </EuiFlexItem>
            </div>
          )}
        </EuiFlexGroup>

        <EuiHorizontalRule margin="none" />
        <QueryResultsBody
          selectedTabId={this.props.selectedTabId}
          selectedTabName={this.props.selectedTabName}
          tabNames={this.tabNames}
          queryResults={queryResultSelected}
          queryResultsRaw={this.props.queryResultsRaw}
          queryResultsJDBC={this.props.queryResultsJDBC}
          queryResultsCSV={this.props.queryResultsCSV}
          message={this.props.message}
          searchQuery={this.props.searchQuery}
          onQueryChange={this.props.onQueryChange}
          pager={this.pager}
          itemsPerPage={this.state.itemsPerPage}
          firstItemIndex={this.pager.getFirstItemIndex()}
          lastItemIndex={this.pager.getLastItemIndex()}
          onChangeItemsPerPage={this.onChangeItemsPerPage}
          onChangePage={this.onChangePage}
          onSort={this.onSort}
          sortedColumn={this.sortedColumn}
          sortableProperties={this.sortableProperties}
          itemIdToExpandedRowMap={this.props.itemIdToExpandedRowMap}
          updateExpandedMap={this.props.updateExpandedMap}
        />
      </EuiPanel>
    );
  }
}

export default QueryResults;
