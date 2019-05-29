import React, { Fragment } from 'react';
import _ from 'lodash';
import {
  EuiButton,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiLink,
  EuiPopover,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiCodeEditor,
  EuiSearchBar,
  Pager,
} from '@elastic/eui';
import 'brace/mode/mysql';
import 'brace/mode/json';
import '../../ace-themes/sql_console';
import { QueryResult, QueryMessage, ESDocument, ResponseDetail, QueryResultCsv, QueryResultRaw } from '../main/main';
import QueryResultsBody from './QueryResultsBody';
import { getQueryIndex } from '../utils/utils';
import { SortableProperties } from '@elastic/eui/lib/services';

interface QueryResultsProps {
  queries: string[];
  queryResults: ResponseDetail<QueryResult>[];
  message: QueryMessage[];
  selectedTabName: string;
  selectedTabId: string; 
  searchQuery: string;
  onSelectedTabIdChange: (tab: object) => void;
  onQueryChange: (query: object) => void;
  updateExpandedMap: (map:object) => void;
  itemIdToExpandedRowMap :  object;
}

interface QueryResultsState {
  isPopoverOpen: boolean;
}

export const MAX_NUM_RECORDS_PER_PAGE = 10;

class QueryResults extends React.Component<QueryResultsProps, QueryResultsState> {
  constructor(props: QueryResultsProps) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      itemsPerPage: MAX_NUM_RECORDS_PER_PAGE      
    };

   this.sortableColumns = [], 
   this.sortedColumn = '',
   this.sortableProperties = new SortableProperties(
         [{
          name: '',
          getValue: item => '',
          isAscending: true
         }], '');   
   
   this.tabNames = []; 
   this.pager = new Pager(0, this.state.itemsPerPage); 
  }
  
 /* componentWillReceiveProps(nextProps) {
   this.setState
  }*/

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
  }

  onChangePage = pageIndex => {
    this.pager.goToPageIndex(pageIndex);
    this.setState({});
  };
  
  updatePagination (totalItemsCount) {
     this.pager.setTotalItems(totalItemsCount);  
  }
  
  // Update SORTABLE COLUMNS - All columns  
  updateSortableColumns(queryResultsSelected) {
      if(this.sortableColumns.length === 0){
	      queryResultsSelected.fields.map((field: []) =>{ 
	         this.sortableColumns.push({
	          name: field,
	          getValue: item => item[field],
	          isAscending: true
	         });
	        }); 
	      this.sortedColumn =  this.sortableColumns.length > 0 ? this.sortableColumns[0].name : '';
	      this.sortableProperties = new SortableProperties(this.sortableColumns, this.sortedColumn);
	   }   
   } 
      
  onSort = prop => {
    this.sortableProperties.sortOn(prop);
    this.sortedColumn = prop;
    this.setState({});
  }
  
  onDownloadJDBC = (): void => {
    if (!Number.isNaN(this.selectedTabId)) {
      const jsonObject = JSON.parse(this.props.queryResultsJDBC[this.props.selectedTabId].data);
      const csvContent = 'data:text/json;charset=utf-8,' + JSON.stringify(jsonObject, undefined, 4);
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', this.props.selectedTabName + "JDBC.json");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  
  onDownloadJSON = (): void => {   
    if (!Number.isNaN(this.selectedTabId)) {
      const jsonObject = JSON.parse(this.props.queryResultsRaw[this.props.selectedTabId].data);
      const csvContent = 'data:text/json;charset=utf-8,' + JSON.stringify(jsonObject, undefined, 4);
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', this.props.selectedTabName + ".json");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } 
  }  
  
  onDownloadCSV = (): void => {
    if (!Number.isNaN(this.selectedTabId)) {
      const csvContent: string = 'data:text/csv;charset=utf-8,' + this.props.queryResultsCSV[this.props.selectedTabId].data ;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', this.props.selectedTabName + ".csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
  /*  this.setState({ dataToDownload: csvContent }, () => {
        // click the CSVLink component to trigger the CSV download
        this.csvLink.link.click()
    })*/
  }
  
  formatCSVFile ( data ) {
    const queryResultRows: string[][] = data.split('\\n').map((row: string) => row.split(','));
    const databaseFields: string[] = queryResultRows[0]; 
  }
  
  getQueryResult = (queryResults, selectedTabId): QueryResult => {
    const selectedIndex: number = parseInt(selectedTabId);
    if (!Number.isNaN(selectedIndex)) {
      const queryResultResponseDetail: ResponseDetail<QueryResult> = queryResults[selectedIndex];
      return queryResultResponseDetail && queryResultResponseDetail.fulfilled ? queryResultResponseDetail.data : queryResultResponseDetail.errorMessage;
    }
    return null;
  }
  
  renderTabs() {
    const tabs = [{
        id: 'messages',
        name: 'Messages',
        disabled: false,
    }];
    
    this.tabNames = [];
    if(this.props.queryResults) {
	    for (let i = 0; i < this.props.queryResults.length; i += 1) {
	      const tabName = getQueryIndex(this.props.queries[i]);
	      this.tabNames.push(tabName);
	      if (this.props.queryResults[i].fulfilled) {  
	        tabs.push({
	          id: i.toString(),
	          name: tabName,
	          disabled: false,
	        })
	      }
	    }
	}
    return tabs;
  }

  render() {
      
    const enableDownload: boolean = !Number.isNaN(parseInt(this.props.selectedTabId));
    
    // Update PAGINATION  and SORTABLE columns
    const queryResultSelected = this.props.queryResults ? this.getQueryResult(this.props.queryResults, this.props.selectedTabId) : '';
    
    if( queryResultSelected ) {
      const matchingItems = this.props.searchQuery ? EuiSearchBar.Query.execute(this.props.searchQuery, queryResultSelected.records) : queryResultSelected.records;
      this.updatePagination(matchingItems.length);
      this.updateSortableColumns(queryResultSelected);
    }
    
    const button = (
      <EuiButton    
        onClick={this.onButtonClick}
        iconType="arrowDown"
        iconSide="right"
        iconSize="l"
        disabled={false}
      > Tabs
      </EuiButton>
    );
    
    const tabs = this.renderTabs();
    const showArrows: boolean = tabs.length > 2 ;
  
    const tabsItems = tabs.map((tab, index) => (  
      <EuiContextMenuItem
          key="10 rows"
          icon="empty"
          onClick={() => { this.closePopover(); 
                           this.pager.goToPageIndex(0);
                           this.sortableColumns = []; 
                           this.props.onSelectedTabIdChange(tab) }}
        >
        {tab.name}
      </EuiContextMenuItem>   
    ));
    
    const tabsButtons = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => { this.pager.goToPageIndex(0);
                         this.sortableColumns = []; 
                         this.props.onSelectedTabIdChange(tab) }}
        isSelected={tab.id === this.props.selectedTabId}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>     
    ));
    
    return <EuiPanel className="query-result-container" paddingSize="none">
      <EuiFlexGroup style={{ padding: '10px', 'border-top-color': '#69707d', 'border-left-color': '#69707d', 'border-right-color': '#69707d'}}>
        <EuiFlexGroup className= "tabs-container" lignItems="center" gutterSize="s">
                   
          { false && 
            <EuiFlexItem grow={false}>
	            <EuiButtonIcon
	              color="text"
	              onClick={() => window.scrollBy(-100, 0)}
	              iconType="arrowLeft"
	              iconSize="l"
	              aria-label="Previous"
	              disabled={false}
	            />
            </EuiFlexItem>
          }
          
	          <EuiFlexItem style={{ marginTop: '8px', marginBottom: '18px' }} grow={false}>
	            <EuiTabs>
	              {tabsButtons}
	            </EuiTabs>
	          </EuiFlexItem>
          
                   
          { false && 
            <EuiFlexItem grow={false}>
	            <EuiButtonIcon
	              color="text"
	              onClick={() => window.scrollBy(100, 0)}
	              iconType="arrowRight"
	              iconSize="l"
	              aria-label="Next"
	              disabled={false}
	            />
            </EuiFlexItem>
          }
          
        </EuiFlexGroup>
        
        { showArrows &&
            <div className="download-container"> 
	          <EuiFlexItem grow={false}>
	            <EuiPopover
	              id="singlePanel"
	              button={button}
	              isOpen={this.state.isPopoverOpen}
	              closePopover={this.closePopover}
	              panelPaddingSize="none"
	              anchorPosition="downLeft"
	            >
	              <EuiContextMenuPanel
	                items={tabsItems}
	              />
	            </EuiPopover>
	          </EuiFlexItem></div>
          }
         { enableDownload &&
         <div className="download-container">    
           <EuiFlexGroup>
	        <EuiFlexItem grow={false}>
	          <EuiButton fill={true} onClick={this.onDownloadJSON}>Download JSON</EuiButton>
	        </EuiFlexItem>
	        <EuiFlexItem grow={false}>
	          <EuiButton fill={true} onClick={this.onDownloadJDBC}>Download JDBC</EuiButton>
	        </EuiFlexItem>
	        <EuiFlexItem grow={false}>
	          <EuiButton fill={true} onClick={this.onDownloadCSV}>Download CSV</EuiButton>
	         
	        </EuiFlexItem>
	       </EuiFlexGroup> </div>
	     }   
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />
      <QueryResultsBody selectedTabId={this.props.selectedTabId} 
                        selectedTabName={this.props.selectedTabName} 
                        tabNames={this.tabNames} 
                        queryResults={this.props.queryResults} 
                        message={this.props.message} 
                        searchQuery={this.props.searchQuery}
                        onQueryChange={this.props.onQueryChange} 
                        pager={this.pager} 
                        itemsPerPage={this.state.itemsPerPage}
                        firstItemIndex = {this.pager.getFirstItemIndex()}
                        lastItemIndex = {this.pager.getLastItemIndex()}
                        onChangeItemsPerPage={this.onChangeItemsPerPage}
                        onChangePage={this.onChangePage}
                        onSort={this.onSort}
                        sortedColumn={this.sortedColumn}
                        sortableProperties={this.sortableProperties}
                        itemIdToExpandedRowMap= {this.props.itemIdToExpandedRowMap} 
	                    updateExpandedMap={this.props.updateExpandedMap}
      />
    </EuiPanel>;
  }
}

interface QueryResultsContainerProps {
  queries: string[];
  queryResultsTable: ResponseDetail<QueryResultCsv>[];
  queryResultsJDBC: ResponseDetail<QueryResultCsv>[];
  tabs: string[];
  selectedTabName: string;
  selectedTabId: string;
  onSelectedTabIdChange: (tab: object) => void;
  searchQuery: string;
  onQueryChange: (query: object) => void;
  updateExpandedMap: (map:object) => void;
}

interface QueryResultsContainerState {
}
  
class QueryResultsContainer extends React.Component<QueryResultsContainerProps, QueryResultsContainerState> {
  constructor(props: QueryResultsContainerProps) {
    super(props);
  }

  render() {
    return <QueryResults
      queries={this.props.queries}
      queryResultsRaw={this.props.queryResultsRaw}
      queryResults={this.props.queryResultsTable}
      queryResultsJDBC={this.props.queryResultsJDBC}
      queryResultsCSV={this.props.queryResultsCSV}
      message={this.props.message}
      searchQuery={this.props.searchQuery}
      itemIdToExpandedRowMap={this.props.itemIdToExpandedRowMap}
      onSelectedTabIdChange={this.props.onSelectedTabIdChange}
      onQueryChange={this.props.onQueryChange}
      selectedTabId={this.props.selectedTabId}
      selectedTabName={this.props.selectedTabName}
      itemIdToExpandedRowMap={this.props.itemIdToExpandedRowMap}
      updateExpandedMap={this.props.updateExpandedMap}
    />
  }
}


export default QueryResultsContainer;
