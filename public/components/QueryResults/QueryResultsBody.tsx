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
 
import React, { Fragment, Component } from 'react';
import DoubleScrollbar from 'react-double-scrollbar';
import _ from 'lodash';
import {
  EuiCodeEditor,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  Pager,
  EuiTablePagination,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSearchBar,
  EuiButtonIcon,
  EuiText,
  EuiSideNav,
  EuiLink,
  EuiHorizontalRule
} from '@elastic/eui/lib';

import { SortableProperties } from '@elastic/eui/lib/services';
import { isEmpty, capitalizeFirstLetter, getMessageString, scrollToNode } from '../../utils/utils';
import { PAGE_OPTIONS, COLUMN_WIDTH } from '../../utils/constants';
import 'brace/mode/mysql';
import 'brace/mode/json';
import '../../ace-themes/sql_console';
import { QueryResult, ResponseDetail, QueryMessage } from '../Main/main';

interface QueryResultsBodyProps {
  queryResult: QueryResult;
  tabNames: string[];
  selectedTabName: string;
  selectedTabId: string;
  searchQuery: string;
  sortableProperties: SortableProperties;
  message: QueryMessage[];
  pager: Pager;
  itemsPerPage: number;
  firstItemIndex: number;
  lastItemIndex: number;
  itemIdToExpandedRowMap: object;
  sortedColumn: string;
  onChangeItemsPerPage: (itemsPerPage:number) => void;
  onChangePage: (pageIndex: number) => void;
  onSort: (prop: string) => void;
  onQueryChange : (query: object) => void;
  updateExpandedMap: (map:object) => void;
}

interface QueryResultsBodyState {
     itemIdToSelectedMap: object;
     itemIdToOpenActionsPopoverMap: object;
     incremental: boolean;
     filters: boolean;
     itemIdToExpandedRowMap: object;
     searchQuery: string;
     selectedItemMap: object;
     selectedItemName: string;
     selectedItemData: object;
     navView: boolean;
}

export function Node(data, parentId, name='', parent={} ) {
    this.data = data;
    this.name = name;
    this.children = [];
    this.parent = parent;
    this.nodeId = name === '' ? parentId : parentId + '_' + name;
}

export function Tree(data, parentId) {
    const node = new Node(data, parentId);
    this._root = node;
}

class QueryResultsBody extends Component<QueryResultsBodyProps, QueryResultsBodyState> {
  public items: any[];
  public columns: any[];
  public expandedRowColSpan: number;
  
  constructor(props: QueryResultsBodyProps) {
    super(props);
        
    this.state = {
      itemIdToSelectedMap: {},
      itemIdToOpenActionsPopoverMap: {},
      incremental: true,
      filters: false,
      itemIdToExpandedRowMap: this.props.itemIdToExpandedRowMap,
      searchQuery: this.props.searchQuery,
      selectedItemMap: {},
      selectedItemName: '',
      selectedItemData: {},
      navView: false,
    };    
    
    this.expandedRowColSpan = 0;
    this.items = [];
    this.columns = [];
  }
  
  // It creates a tree of nested objects or arrays for the row
  createRowTree( item, rootId ) {
     const tree = new Tree( item, rootId );
     const root = tree._root;
     
     if( typeof item === 'object') {  
        for( let j = 0; j < Object.keys(item).length; j++ ) {
          let data = Object.values(item)[j];
          let name = Object.keys(item)[j];
          
          // If value of field is an array or an object it gets added to the tree
          if( data !== null && (Array.isArray(data) || typeof data === 'object')) {
             const firstNode = new Node(data, rootId, name, root );
             root.children.push(firstNode);  
          }   
        } 
      }     
     return tree;
  }
  
  getRowTree(nodeId, item, expandedRowMap) {
    return expandedRowMap[nodeId] && expandedRowMap[nodeId].nodes ? expandedRowMap[nodeId].nodes : this.createRowTree( item, nodeId);    
  }	      
  
  getItems(records) {
    const matchingItems = this.props.searchQuery ? EuiSearchBar.Query.execute(this.props.searchQuery, records) : records;
    return this.props.sortableProperties.sortItems(matchingItems);
  }
   
  getFieldValue( fieldValue, field ) {
    let hasExpandingRow = false;
    let hasExpandingArray = false;
    let value = '';
    let link: string = '';
    
      if (fieldValue === null) {
        return {
	       hasExpandingRow: hasExpandingRow,
	       value: ''
	    }
      }
	  
	  // No Object
	  if (typeof fieldValue !== 'object') {
	    return {
	       hasExpandingRow: hasExpandingRow,
	       value: fieldValue
	    }
	  }
      
      // Array
	  if (Array.isArray( fieldValue )) {
	     if (typeof fieldValue[0] !== 'object') {
	        hasExpandingArray = true;
	        link = field.concat(': [', fieldValue.length, ']');
	     } else {
	        hasExpandingRow = true;
	        link = field.concat(': {', fieldValue.length, '}');
	     }
	  } 
	  // Single Object
	  else {
	     hasExpandingRow = true;
	     link = field.concat(': {1}');
	     value = value;
	  } 
	  
	  return {
        hasExpandingRow: hasExpandingRow,
        hasExpandingArray : hasExpandingArray,
        value: value,
        link: link,
	  }	  
	}

  addExpandingNodeIcon(node, expandedRowMap) {      
     return <EuiButtonIcon
        onClick={() => this.toggleNodeData(node, expandedRowMap)}
        aria-label={expandedRowMap[node.nodeId] && expandedRowMap[node.nodeId].expandedRow ? 'Collapse' : 'Expand'}
        iconType={expandedRowMap[node.nodeId] && expandedRowMap[node.nodeId].expandedRow ? 'minusInCircle' : 'plusInCircle'}    
      />
  }
	 
  addExpandingSideNavIcon(node, expandedRowMap) {      
	  return <EuiButtonIcon
        onClick={() => this.updateExpandedRowMap(node, expandedRowMap)}
         aria-label={expandedRowMap[node.parent.nodeId] && expandedRowMap[node.parent.nodeId].selectedNodes && expandedRowMap[node.parent.nodeId].selectedNodes.hasOwnProperty(node.nodeId) ? 'Collapse' : 'Expand'}
         iconType={expandedRowMap[node.parent.nodeId] && expandedRowMap[node.parent.nodeId].selectedNodes && expandedRowMap[node.parent.nodeId].selectedNodes.hasOwnProperty(node.nodeId) ? 'minusInCircle' : 'plusInCircle'}    
       />
  }
	 
  addExpandingIconColumn(columns) {
	 const expandIconColumn = [{
		        id: 'expandIcon',
		        label: '',
		        isSortable: false,
		        width: '30px',
		    }];
	    
     columns = expandIconColumn.concat(columns); 
	 return columns;
  }
  
  updateSelectedNodes( parentNode, selectedNode, expandedRowMap, keepOpen = false ) {
    const parentNodeId = parentNode.nodeId;
        
    if(expandedRowMap[parentNodeId] &&
       expandedRowMap[parentNodeId].selectedNodes &&
	   expandedRowMap[parentNodeId].selectedNodes.hasOwnProperty(selectedNode.nodeId) &&
	   !keepOpen){
        
        delete expandedRowMap[parentNodeId].selectedNodes[selectedNode.nodeId];
	
	} else {
      
      if (!expandedRowMap[parentNodeId].selectedNodes) {
        expandedRowMap[parentNodeId].selectedNodes = {};
       }
       expandedRowMap[parentNodeId].selectedNodes[selectedNode.nodeId] = selectedNode.data;
    }   
    return expandedRowMap;
  }
  
  updateExpandedRow ( node, expandedRowMap ) {
     let newItemIdToExpandedRowMap = expandedRowMap;
      
	 if (expandedRowMap[node.nodeId]) {
	           
         newItemIdToExpandedRowMap[node.nodeId].expandedRow =   
	       <div id={node.nodeId} style={{ padding: '0 0 20px 19px' }}>
	          { this.renderNav(node, node.name, expandedRowMap) }   
	       </div>                  
	  }  
     return newItemIdToExpandedRowMap;
  }
  
  updateExpandedRowMap (node, expandedRowMap, keepOpen = false) {
     let newItemIdToExpandedRowMap = this.updateSelectedNodes( node.parent, node, expandedRowMap, keepOpen );
	 const rootNode = this.findRootNode(node, expandedRowMap);
	 	  
	 if ( expandedRowMap[rootNode.nodeId]) {
        newItemIdToExpandedRowMap = this.updateExpandedRow ( node.parent, newItemIdToExpandedRowMap );
        newItemIdToExpandedRowMap = this.updateExpandedRow ( rootNode, newItemIdToExpandedRowMap );      
	 }   
	 this.props.updateExpandedMap(newItemIdToExpandedRowMap);  	  
  }
   
  findRootNode = (node, expandedRowMap) => {	
      const rootNodeId = node.nodeId.split('_')[0];
      const rootNode = expandedRowMap[rootNodeId].nodes._root;
      return rootNode;
    };
	
  toggleNodeData = (node, expandedRowMap) => {
     let newItemIdToExpandedRowMap = expandedRowMap;
     const rootNode = this.findRootNode(node, expandedRowMap);
   
     if (expandedRowMap[node.nodeId] && expandedRowMap[node.nodeId].expandedRow) {
       delete newItemIdToExpandedRowMap[node.nodeId].expandedRow;
     
     } else if (node.children && node.children.length > 0){
       newItemIdToExpandedRowMap = this.updateExpandedRow ( node, expandedRowMap );        
     } 
   
     if(rootNode !== node){	 
       newItemIdToExpandedRowMap = this.updateExpandedRow ( rootNode, expandedRowMap ); 
     }
	  
	  this.props.updateExpandedMap(newItemIdToExpandedRowMap); 
  };	   	 
	  	  
  getChildrenItems( nodes, parentNode, expandedRowMap ) {
    const itemList = [];
    
    if( nodes.length === 0 && parentNode.data) { 
       const renderedData = this.renderNodeData( parentNode, expandedRowMap );
       itemList.push(this.createItem(expandedRowMap, parentNode, renderedData, { items: nodes.children ? this.getChildrenItems(nodes.children, nodes, expandedRowMap) : []}));
    }
 
    for(let i = 0; i < nodes.length; i++) {     
       itemList.push(this.createItem(expandedRowMap, nodes[i], nodes[i].name, { icon: this.addExpandingSideNavIcon(nodes[i], expandedRowMap),  items: this.getChildrenItems(nodes[i].children, nodes[i], expandedRowMap)} )); 
    } 
    return itemList;
  }
  
  createItem = (expandedRowMap, node, name, items={}) => {    
     const nodeId = node.nodeId;
     const parentId = node.parent.nodeId;
    
     const isSelected = expandedRowMap[parentId] 
                    && expandedRowMap[parentId].selectedNodes 
                    && expandedRowMap[parentId].selectedNodes.hasOwnProperty(nodeId) ;
    
     return {
	      ...items,
	      id: nodeId,
	      name,
	      isSelected: isSelected,
	      onClick: () => console.log("open side nav"),
      };
  };
 
 
  /************* Render Functions *************/ 
  
  renderMessagesTab(): JSX.Element {
    return <EuiCodeEditor
      className = { this.props.message && this.props.message.length > 0 ? this.props.message[0].className : "successful-message"}
      mode="text"
      theme="sql_console"
      width="100%"
      value={getMessageString(this.props.message, this.props.tabNames)}
      showPrintMargin={false}
      readOnly={true}
      setOptions={{
        fontSize: '14px',
        readOnly: true,
        highlightActiveLine: false,
        highlightGutterLine: false,
      }}
      onBlur={() => { console.log('blur'); }} // eslint-disable-line no-console
      aria-label="Code Editor"
    />  
  }
  
  renderHeaderCells(columns) {
    return columns.map((field: any) => {
      const label = field.id === 'expandIcon' ? field.label : field;
      const colwidth = field.id === 'expandIcon' ? field.width : COLUMN_WIDTH;
      return <EuiTableHeaderCell
        key={label}
        width={colwidth}
        onSort={this.props.onSort.bind(this, field)}
        isSorted={this.props.sortedColumn === field}
        isSortAscending={this.props.sortableProperties.isAscendingByName(field)}
        >{ label }
       </EuiTableHeaderCell>
    });
  }
  
  renderHeaderCellsWithNoSorting(columns) {
    return columns.map((field: any) => {
      const label = field.id === 'expandIcon' ? field.label : field;
      const colwidth = field.id === 'expandIcon' ? field.width : COLUMN_WIDTH;
      return <EuiTableHeaderCell
        key={label}
        width={colwidth}
        >{ label }
       </EuiTableHeaderCell>
    });
  }
  
  renderRow(item, columns, rowId, expandedRowMap) {
     let rows = [];   
     if (item && ((typeof item === 'object' && !isEmpty(item)) || (Array.isArray(item) && item.length > 0))){
        let rowItems = []; 
             
        if(Array.isArray( item )) {
           rowItems = item;
        } else {
           rowItems.push(item);
        }
        
        for(let i = 0; i < rowItems.length; i++) {
           let rowItem = rowItems[i];
	       let tableCells = [];
	       const tree = this.getRowTree(rowId, rowItem, expandedRowMap); 
	       
	       // Add nodes to expandedRowMap
           if (!expandedRowMap[rowId] || !expandedRowMap[rowId].nodes) {  
              expandedRowMap[rowId] = { nodes: tree }; 
           }
	     
	       const expandingNode = tree && tree._root.children.length > 0 ? this.addExpandingNodeIcon(tree._root, expandedRowMap) : '';
	     
	       if(columns.length > 0){  
		      columns.map((field:any, index) => {
		          
		          // Table cell
			      if(field.id !== 'expandIcon') {
				     const fieldObj = this.getFieldValue(rowItem[field], field); 
				     let fieldValue = fieldObj.value;
				     
				     // If field is expandable 
				     if(fieldObj.hasExpandingRow || fieldObj.hasExpandingArray) {
				        const fieldNode = expandedRowMap[tree._root.nodeId].nodes._root.children.find(node => node.name === field);
		                fieldValue = (
		                  <span> {fieldObj.value}
                              	 <EuiLink
			                        color="primary"
			                        onClick={() => { this.updateExpandedRowMap (fieldNode, expandedRowMap, true); scrollToNode(tree._root.nodeId);}}>
			                        {fieldObj.link}
			                     </EuiLink> 
			              </span>);										
				     } 
			         tableCells.push(<EuiTableRowCell key={field} truncateText={false} textOnly={true}>{ fieldValue }</EuiTableRowCell>);
			      }
			      
			      // Expanding icon cell
			      else { 
				      tableCells.push( <EuiTableRowCell id={tree._root.nodeId}>{ expandingNode }</EuiTableRowCell>);
			      }    
		      });
		  } 
		  
		  else {
			 const fieldObj = this.getFieldValue(rowItem, ''); 
			 tableCells.push(<EuiTableRowCell truncateText={false} textOnly={true}>{ fieldObj.value }</EuiTableRowCell>);	 
		  }
		  
		  const tableRow = ( <EuiTableRow key={rowId}>{tableCells} </EuiTableRow>);
		  let row = (
					  <Fragment>
					     {tableRow} 
		      		  </Fragment>);
		      			
		  if (expandedRowMap[rowId] && expandedRowMap[rowId].expandedRow){ 
		      const tableRow = ( <EuiTableRow className="expanded-row" key={rowId}>{tableCells} </EuiTableRow>);
			  const expandedRow =  <EuiTableRow>{expandedRowMap[rowId].expandedRow}</EuiTableRow>;
			  row = (
				    <Fragment>
				        {tableRow}
				        {expandedRow}
	      			</Fragment>);	     
		   }    		     
		   rows.push(row);	      
	    }   
     }
   return rows;
  }
  
  
  renderRows(items, columns, expandedRowMap) {
    let rows = []; 
    if (items){
	    for ( let itemIndex = this.props.firstItemIndex; itemIndex <= this.props.lastItemIndex; itemIndex++ ) {
	      const item = items[itemIndex];
	      if(item){ 
		     const rowId = item['id'];
		     const rowsForItem = this.renderRow(item, columns, rowId, expandedRowMap);
		     rows.push(rowsForItem);
	     }
     } 
   }
   return rows;
  }
 
  renderSearchBar() {
   const search = {
      box: {
        incremental: this.state.incremental,
        placeholder: 'Search',
        schema: true
      }
    };     
    return (
      <div className="search-bar">
        <EuiSearchBar 
          onChange={this.props.onQueryChange}
          query={this.props.searchQuery}
          {...search}
        />
      </div>  
      );   
  }
  	 
  renderNodeData = (node, expandedRowMap) => {
	 let items = [];
	 let columns = [];
	 let records = [];
	 const data = node.data;
	   
	 if(Array.isArray(data)) {
	    items = data;
	    columns = typeof items[0] === 'object' ? Object.keys(items[0]) : [];
	 } else if (typeof data === 'object') {
	    records.push(data);
	    items = records;
	    columns = this.addExpandingIconColumn(Object.keys(data));
	 }
	          
	 const dataTable=
	      <div> 
	       
	        <EuiTable className ="sideNav-table" >
		        <EuiTableHeader className="table-header">
		          {this.renderHeaderCellsWithNoSorting(columns)}
		        </EuiTableHeader>
		
		        <EuiTableBody>
		          {this.renderRow(items, columns, node.nodeId, expandedRowMap)}
		        </EuiTableBody>
		      </EuiTable>
		    </div> 
		    
	   return dataTable;     
	};
	  
  renderNav(node, table_name, expandedRowMap){    
    const sideNav = [
      this.createItem( expandedRowMap, node, table_name,  {
        items: this.getChildrenItems(node.children, node, expandedRowMap),
      }),
    ];
   
    return (
      <EuiSideNav
        mobileTitle="Navigate within $APP_NAME"
        items={sideNav}
        className="sideNavItem__items"
        style={{ width: '300px', padding: '0 0 20px 9px', }}
      />
    );
  }	  
    
  render() {
    
    if (this.props.selectedTabId === 'messages') {
      return this.renderMessagesTab();
    } else if (this.props.queryResult == null) {
      return null;
    } else {
        
	    if (this.props.queryResult) {
	      this.items = this.getItems(this.props.queryResult.records);
	      //Adding an extra empty column for the tree
	      this.columns = this.addExpandingIconColumn(this.props.queryResult.fields);
	      this.expandedRowColSpan = this.columns.length;
	    } 
	    
	    return <div> 
	           <EuiSpacer size="m" /> 
	           <EuiText className="table-name">{capitalizeFirstLetter(this.props.selectedTabName)}</EuiText>
	           <EuiHorizontalRule margin="none" />  
	               
		       <div className="search-panel">   
		       	  {this.renderSearchBar()}
		      
			      <EuiTablePagination
			          activePage={this.props.pager.getCurrentPageIndex()}
			          itemsPerPage={this.props.itemsPerPage}
			          itemsPerPageOptions={PAGE_OPTIONS}
			          pageCount={this.props.pager.getTotalPages()}
			          onChangeItemsPerPage={this.props.onChangeItemsPerPage}
			          onChangePage={this.props.onChangePage}
				   />
			   </div>
		       
		       <EuiSpacer size="m" />
		       
		       <div className="sql-console-results-container"> 
		         <EuiFlexGroup gutterSize="none" >
			         <EuiFlexItem>
			  <DoubleScrollbar> 
				      <EuiTable>
				        <EuiTableHeader className="table-header">
				          {this.renderHeaderCells(this.columns)}
				        </EuiTableHeader>
				
				        <EuiTableBody>
				          {this.renderRows(this.items, this.columns, this.props.itemIdToExpandedRowMap)}
				        </EuiTableBody>
				
				      </EuiTable>
				</DoubleScrollbar>      
				     </EuiFlexItem>
				 </EuiFlexGroup>    
		      </div>
		      
		      <div className="pagination-container">
		        <EuiTablePagination
		          activePage={this.props.pager.getCurrentPageIndex()}
		          itemsPerPage={this.props.itemsPerPage}
		          itemsPerPageOptions={PAGE_OPTIONS}
		          pageCount={this.props.pager.getTotalPages()}
		          onChangeItemsPerPage={this.props.onChangeItemsPerPage}
		          onChangePage={this.props.onChangePage}
		        />
		      </div> 
		   </div>   
	  }	      
   }
}

interface QueryResultsBodyContainerProps {
  queryResults: ResponseDetail<QueryResult>[];
  message: QueryMessage[];
  tabNames: string[];
  selectedTabId: string;
  selectedTabName: string;
  itemsPerPage: number;
  firstItemIndex: number;
  lastItemIndex: number;
  searchQuery: string;
  pager: Pager;
  sortableProperties: SortableProperties;
  sortedColumn: string;
  itemIdToExpandedRowMap: object;
  onSort: (prop: string) => void;
  onQueryChange: (query:object) => void;
  onChangePage: (pageIndex: number) => void;
  onChangeItemsPerPage: (itemsPerPage:number) => void;
  updateExpandedMap: (map:object) => void;
}


interface QueryResultsBodyContainerState {
}

class QueryResultsBodyContainer extends React.Component<QueryResultsBodyContainerProps, QueryResultsBodyContainerState> {

  constructor(props: QueryResultsBodyContainerProps) {
    super(props);
  }

  getQueryResult(): QueryResult {
    const selectedIndex: number = parseInt(this.props.selectedTabId);
    if (!Number.isNaN(selectedIndex)) {
      const queryResultResponseDetail: ResponseDetail<QueryResult> = this.props.queryResults[selectedIndex];
      return queryResultResponseDetail && queryResultResponseDetail.fulfilled ? queryResultResponseDetail.data : null;
    }
    return null;
  }

  render() {
    return <QueryResultsBody selectedTabId={this.props.selectedTabId}  
                             selectedTabName={this.props.selectedTabName} 
                             tabNames={this.props.tabNames} 
                             queryResult={this.getQueryResult()} 
                             message={this.props.message} 
                             onQueryChange={this.props.onQueryChange} 
                             updateExpandedMap={this.props.updateExpandedMap}
                             searchQuery={this.props.searchQuery} 
                             pager={this.props.pager} 
                             itemsPerPage={this.props.itemsPerPage}
                             firstItemIndex = {this.props.firstItemIndex}
                             lastItemIndex = {this.props.lastItemIndex}
                             itemIdToExpandedRowMap = {this.props.itemIdToExpandedRowMap}
                             onChangeItemsPerPage={this.props.onChangeItemsPerPage}
                             onChangePage={this.props.onChangePage}
                             onSort={this.props.onSort}
                             sortedColumn={this.props.sortedColumn}
                             sortableProperties={this.props.sortableProperties}
                             />
  }
}

export default QueryResultsBodyContainer;
