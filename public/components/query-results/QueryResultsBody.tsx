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
import _ from 'lodash';
import {
  EuiPanel,
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
  EuiSwitch
} from '@elastic/eui/lib';

import { SortableProperties } from '@elastic/eui/lib/services';
import { isEmpty } from '../utils/utils';
import 'brace/mode/mysql';
import 'brace/mode/json';
import '../../ace-themes/sql_console';
import { QueryResult, ResponseDetail, QueryMessage } from '../main/main';

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
     selectedItemName: string;
     selectedItemData: object;
     navView: boolean;
}

export const MAX_NUM_VALUES_IN_FIELD = 2;
export const PAGE_OPTIONS = [10, 20, 50, 100];
export const COLUMN_WIDTH = '155px';

export function Node(data, name, parent={}, parentId) {
    this.data = data;
    this.name = name;
    this.children = [];
    this.parent = parent;
    this.nodeId = name + '_' + parentId;
}

export function Tree(data, name) {
    const node = new Node(data, name, {}, '');
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
      selectedItemName: '',
      selectedItemData: {},
      navView: false,
    };    
    
    this.expandedRowColSpan = 0;
    this.items = [];
    this.columns = [];
  }
  
  createRecordsTree( items, table_name ) {
     const tree = new Tree( items, 'Row' );
     tree._root;
     this.addNodesToTree( items, tree._root );  
     return tree;
  }
  
  addNodesToTree (items, parentNode) {
     let currentNode = parentNode;
     let currentParentNode = parentNode;
     
     if(items === null){
        return;
     }
     
     if (Array.isArray( items )) {  
       for( let i = 0; i < items.length; i++ ) {
	      let data =  items[i];
	      let name = currentParentNode.name ? currentParentNode.name + ' ' + i : 'Record ' + i;  
	      
	      if( data !== null && ( Array.isArray(data) || typeof data === 'object')) {
	          currentNode = new Node(data, name, currentParentNode, currentParentNode.nodeId);
		      currentParentNode.children.push(currentNode); 
		      this.addNodesToTree(data, currentNode);
		  }
	   }
     }
     // If Node is an object
     else if( typeof items === 'object') {
        
        for( let j = 0; j < Object.keys(items).length; j++ ) {
          let data = Object.values(items)[j];
          let name = Object.keys(items)[j];
          
          if( data !== null && (Array.isArray(data) || typeof data === 'object')) {
             currentNode = new Node(data, name, parentNode, parentNode.nodeId);
             parentNode.children.push(currentNode); 
             this.addNodesToTree(data, currentNode); 
          }   
        }
     } 
  }
  
  capitalizeFirstLetter(name) {  
	 return name && name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name;
  }
  
  getMessage(name) {
   return this.capitalizeFirstLetter(name);
  }
  
  getMessageString(messages) {
   return messages && messages.length > 0 && this.props.tabNames ? messages.reduce( (finalMessage, message, currentIndex) => finalMessage.concat(this.getMessage(this.props.tabNames[currentIndex]), ': ', message.text, '\n\n'), '' ) : '';
  }
   
  renderMessagesTab(): JSX.Element {
    return <EuiCodeEditor
      className = { this.props.message && this.props.message.length > 0 ? this.props.message[0].className : "successful-message"}
      mode="text"
      theme="sql_console"
      width="100%"
      value={this.getMessageString(this.props.message)}
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
    return columns.map((field: string) => {
      return <EuiTableHeaderCell
        key={field}
        width={COLUMN_WIDTH}
        onSort={this.props.onSort.bind(this, field)}
        isSorted={this.props.sortedColumn === field}
        isSortAscending={this.props.sortableProperties.isAscendingByName(field)}
        >{ this.capitalizeFirstLetter(field) }
       </EuiTableHeaderCell>
    });
  }
  
  renderHeaderCellsWithNoSorting(columns) {
    return columns.map((field: string) => {
      return <EuiTableHeaderCell
        key={field}
        width={COLUMN_WIDTH}
        >{ this.capitalizeFirstLetter(field) }
       </EuiTableHeaderCell>
    });
  }
  
  renderArrayList(items) {
     let rows = [];
     let tableCells = [];
     
	 for (let i = 0 ; i < items.length; i++) {
	   tableCells.push( <EuiTableRowCell textOnly={true}>{items[i]} </EuiTableRowCell> );
	   if( i > 0 && i % this.expandedRowColSpan == 0 ){
	      rows.push(<EuiTableRow>{tableCells}</EuiTableRow>);
	      tableCells = [];
	   }
	 }
	 rows.push(<EuiTableRow>{tableCells}</EuiTableRow>);
	 return rows;
  }
  
  renderNavRows(items, columns, tableName) {
    let rows = [];
    if ( items && ( ( typeof items === 'object' && !isEmpty(items) ) || (Array.isArray(items) && items.length > 0))){
      let records = []; 
      
      if(Array.isArray( items )) {
          records = items;
        } else {
          records.push(items);
        }
        
      for( let i = 0; i < records.length; i++ ) {
         let record = records[i];
	     let tableCells = [];
	      
	     if(columns.length > 0){  
		     columns.map((field:string) => {
			      // Row
			      const fieldObj = this.getFieldValue(record[field], field); 
		          tableCells.push(<EuiTableRowCell  key={field} textOnly={true}>
		                               { fieldObj.value }
		                           </EuiTableRowCell>);
		     });
		  } else {
			   const fieldObj = this.getFieldValue(record, ''); 
			   tableCells.push(<EuiTableRowCell textOnly={true}>
			                               { fieldObj.value }
		                        </EuiTableRowCell>);	 
		  }
	     const row = ( <EuiTableRow>{tableCells} </EuiTableRow> );
	     const rowWithExpandable = (
			    <Fragment>
			        {row}
      			</Fragment>);
	     rows.push(rowWithExpandable);
	  }   
   }
   return rows;
  }
  
  
  renderRows(items, columns, tableName, parentKey, expandedRowMap) {
    let rows = [];
    
    if (items){
	    for (let itemIndex = this.props.firstItemIndex; itemIndex <= this.props.lastItemIndex; itemIndex++) {
	      const item = items[itemIndex];
	        
	      if(item){ 
			  const rowId = item['id'];
	          
		      // NESTED TABLE	   
		      let expandedTableCells = []; 
		      let tableCells = [];
		      
			  columns.map((field:string, index) => {
			      let itemKey = index.toString();
			      
			      // Create key for nested object 
			      if( parentKey.length > 0 ) {
			        itemKey = parentKey.concat(',', rowId.toString(),'-', index.toString());
			      } else {
			        itemKey = rowId.toString().concat('-', index.toString());
			      }
			      
			      // Row
			      const record = this.getFieldValue(item[field], field); 
		          const expandandingRowIcon = record.hasExpandingRow ?  this.addExpandingRowIcon(item[field], itemKey, field, tableName, items, columns, parentKey, expandedRowMap) : '';
		          const expandingRowIconForArray = record.hasExpandingArray ? this.addExpandingRowIconForArray(item[field], itemKey, field, expandedRowMap) : '';
		         
		          
		          if(record.hasExpandingArray) {
		              tableCells.push( <EuiTableRowCell key={field} textOnly={true}>
		                               { record.value }{ expandingRowIconForArray }
		                           </EuiTableRowCell>);
		          } else {
		             tableCells.push(<EuiTableRowCell  key={field} textOnly={true}>
		                               { record.value }{ expandandingRowIcon }
		                           </EuiTableRowCell>);
		          }
		          
			     // Expanded Row      
                 if(expandedRowMap && expandedRowMap.hasOwnProperty(itemKey)) {
                 
                    let records = [];
        
			        if(Array.isArray( item[field] )) {
			          records = item[field];
			        } else {
			          records.push(item[field]);
			        }
			        
			        // expandedRowColSpan represents the number of columns for the parent table
			        // numNestedTableColumns represents the number of columns for the child table
			        
	                const numNestedTableColumns = typeof records[0] === 'object' ? Object.keys(records[0]).length : records.length;
	                const halfNestedTable = numNestedTableColumns/2 ;
	                let colSpanLeft =  0;
	                let colSpanRight = 0;
	                
	                // No colSpanLeft 
	                if( numNestedTableColumns >= this.expandedRowColSpan || halfNestedTable >= index ) {
	                  colSpanRight = this.expandedRowColSpan -  numNestedTableColumns;
	                } 
	                // If half nested table is greater than the father right side
	                else if( halfNestedTable >=  this.expandedRowColSpan - index + 1 ){  
	                  colSpanLeft = this.expandedRowColSpan - numNestedTableColumns
	              
	                } else if( halfNestedTable < index ) {
             
                       colSpanLeft = index - halfNestedTable;
                       colSpanRight = this.expandedRowColSpan -  numNestedTableColumns - colSpanLeft;  
	                }
	                
	                if( colSpanLeft > 0 ) {
	                     expandedTableCells.push(<EuiTableRowCell colSpan={ colSpanLeft }></EuiTableRowCell>)
				    }
				    
                    expandedTableCells.push( <EuiTableRowCell className="nested-table" colSpan={ Math.min(this.expandedRowColSpan, numNestedTableColumns) }>   
				                                   {expandedRowMap[itemKey]}
				                             </EuiTableRowCell> );  
				                             
				    expandedTableCells.push(<EuiTableRowCell colSpan={ colSpanRight }></EuiTableRowCell>)                                                 
				  } 
				  
			 });
			 
			 const row = ( <EuiTableRow key={itemIndex}>{tableCells} </EuiTableRow>);
		     let rowWithExpandable = (
				    <Fragment key={rowId}>
				        {row}
	      			</Fragment>);
			      			   
		     if( expandedTableCells.length > 0 ) {
		         const expandedRow =  <EuiTableRow>{expandedTableCells}</EuiTableRow>;
		         const row = ( <EuiTableRow className="expanded-row" key={itemIndex}>{tableCells} </EuiTableRow>);
		         rowWithExpandable = (
				    <Fragment key={rowId}>
				        {row}
				        {expandedRow}
	      			</Fragment>);
		     
		     } 		     
		     rows.push(rowWithExpandable);
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
  
  getItems(records) {
    const matchingItems = this.props.searchQuery ? EuiSearchBar.Query.execute(this.props.searchQuery, records) : records;
    return this.props.sortableProperties.sortItems(matchingItems);
  }
   
  getFieldValue( fieldValue, field ) {
    let hasExpandingRow = false;
    let hasExpandingArray = false;
    let value = '';
    
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
	    const maxNumOfValues = Math.min(fieldValue.length, MAX_NUM_VALUES_IN_FIELD);
	    let formattedFieldValue: string='';
	    
	    for (let i = 0; i < maxNumOfValues; i += 1) {
	      const child = fieldValue[i];
	      
	      if (typeof child !== 'object') {
	            formattedFieldValue = formattedFieldValue.concat( child );
		        
		        // It is not the last element
		        if( i !== maxNumOfValues - 1 ){
		          formattedFieldValue = formattedFieldValue.concat(',\n ');
		        }  
		        // It is the last element and there are more values 
		        if( i === maxNumOfValues - 1 && fieldValue.length > maxNumOfValues ){
		            formattedFieldValue = formattedFieldValue.concat(' ... ', (fieldValue.length - maxNumOfValues).toString(), ' more');
		            hasExpandingArray = true;
		         }
	       
	       } else {
	           return {
			        hasExpandingRow: true,
			        hasExpandingArray : hasExpandingArray,
			        value: field.concat(': ', fieldValue.length)
			   }	
	            
	       }
	    }
	       value = formattedFieldValue; 
	  } 
	  // Object
	  else {
	     hasExpandingRow = true;
	     value = field.concat(': 1');
	  } 
	  
	  return {
        hasExpandingRow: hasExpandingRow,
        hasExpandingArray : hasExpandingArray,
        value: value
	  }	  
	}
	
	addExpandingRowIcon(item, itemKey, tableName, parentTableName, parentItems, parentColumns, parentKey, expandedRowMap) {
	   
	   return <EuiButtonIcon
          onClick={() => this.toggleDetails(item, itemKey, tableName, parentItems, parentColumns, parentTableName, parentKey, expandedRowMap)}
          aria-label={expandedRowMap[itemKey]? 'Collapse' : 'Expand'}
          iconType={expandedRowMap[itemKey] ? 'arrowUp' : 'arrowDown'}
          
        />
	 }
	 
    addExpandingRowIconForArray(items, itemKey, tableName, expandedRowMap) {
	   return <EuiButtonIcon
          onClick={() => this.toggleArrayList(items, itemKey, tableName, expandedRowMap)}
          aria-label={expandedRowMap[itemKey]? 'Collapse' : 'Expand'}
          iconType={expandedRowMap[itemKey] ? 'arrowUp' : 'arrowDown'}
        />
	 } 
	  
	toggleArrayList = (items, itemKey, tableName, expandedRowMap) => {
        
        let newItemIdToExpandedRowMap = {};
        	   	    
	    if( items.length > 0 ) {
		    
	       if (expandedRowMap[itemKey]) {
	           delete expandedRowMap[itemKey];
	           newItemIdToExpandedRowMap = expandedRowMap;
	       } else {  
			      newItemIdToExpandedRowMap[itemKey] = 
				      <div>
					     <div className="table">
					      <EuiText className="table-name">{this.capitalizeFirstLetter(tableName)}</EuiText>
						      <EuiTable className="no-background">
						        <EuiTableBody>
						          {this.renderArrayList(items)}
						        </EuiTableBody>
						      </EuiTable>
					      </div>
				      </div>
		    }
		    this.props.updateExpandedMap(newItemIdToExpandedRowMap);      
		 }
	  };  
	 	 
	 toggleDetails = (item, itemKey, tableName, parentItems, parentColumns, parentTableName, parentKey, expandedRowMap) => {
        let records = [];
        
        if(Array.isArray( item )) {
          records = item;
        } else {
          records.push(item);
        }
	    
	    const nestedTableColumns = Object.keys(records[0]);
	    
	    let databaseRecords = [];
	    let newItemIdToExpandedRowMap = {};
	         
	    for (let i = 0 ; i < records.length; i +=1) {
           
           let databaseRecord: {[key: string]: any} = {};
           const rowValues = Object.values(records[i]);
           
           //Add row id
           databaseRecord['id'] = i.toString();
           for( let j = 0; j < rowValues.length; j += 1 ) {	 
           	 const field: string = nestedTableColumns[j];
           	 databaseRecord[field] = rowValues[j];
           } 
           databaseRecords.push(databaseRecord);
	    }
		   	    
	    if( databaseRecords.length > 0 ) {

	        if (expandedRowMap[itemKey]) {
	           delete expandedRowMap[itemKey];
	           newItemIdToExpandedRowMap = expandedRowMap;
	        } else {
	            
			    // Delete all keys except parents key
			      const keys = itemKey.split(',');
			        
			      for( let k = 1; k < keys.length; k += 1 ){
			         const parentKey = itemKey.split(',', k);
			         newItemIdToExpandedRowMap[parentKey] = expandedRowMap[parentKey];
			      }
			      
			      newItemIdToExpandedRowMap[itemKey] = 
				      <div>
					     <div className="table">
					      <EuiText className="table-name">{this.capitalizeFirstLetter(tableName)}</EuiText>
						      <EuiTable className="no-background">
						        <EuiTableHeader className="table-header">
						          {this.renderHeaderCellsWithNoSorting(nestedTableColumns)}
						        </EuiTableHeader>
						
						        <EuiTableBody>
						          {this.renderRows(databaseRecords, nestedTableColumns, tableName, itemKey, newItemIdToExpandedRowMap)}
						        </EuiTableBody>
						      </EuiTable>
					      </div>
				      </div>
		      }
		      
		      if( parentKey.length > 0 ){
		          
			      newItemIdToExpandedRowMap[parentKey]=
				      <div>
					    
					    <div className="table" >
					    <EuiText className="table-name">{this.capitalizeFirstLetter(parentTableName)}</EuiText>
					      <EuiTable className="no-background">
					        <EuiTableHeader  className="table-header">
					          {this.renderHeaderCellsWithNoSorting(parentColumns)}
					        </EuiTableHeader>
					
					        <EuiTableBody>
					          {this.renderRows(parentItems, parentColumns, parentTableName, parentKey, newItemIdToExpandedRowMap)}
					        </EuiTableBody>
					      </EuiTable>
					    </div>  
				      </div>
		      } 
		      this.props.updateExpandedMap(newItemIdToExpandedRowMap);   
		 }
	  };
	  
  toggleNavView = () => {
    this.setState(prevState => ({ navView: !prevState.navView }));
  };	  
	  
	  
  getChildrenItems( nodes ) {
    if( nodes.length == 0 ){
       return;
    }
    const itemList = [];
    for(let i = 0; i < nodes.length; i++) {  
       itemList.push(this.createItem(nodes[i].nodeId, nodes[i].name, nodes[i].data, { items: this.getChildrenItems(nodes[i].children)} )); 
    } 
    return itemList;
  }	  
	  
  renderNav(nodes, table_name){ 
    const sideNav = [
      this.createItem( table_name, table_name, nodes, {
        items: 
            this.getChildrenItems(nodes._root.children),
      }),
   ];
   
   return (
      <EuiSideNav
        mobileTitle="Navigate within $APP_NAME"
        items={sideNav}
        style={{ width: 192 }}
      />
    );
}	  
  
  selectItem = (name, data) => {
    this.setState({
      selectedItemName: name,
      selectedItemData: data,
    });
  };

  createItem = (nodeId, name, value, data = {}) => {
    return {
      ...data,
      id: nodeId,
      name,
      isSelected: this.state.selectedItemName === nodeId,
      onClick: () => this.selectItem(nodeId, value),
    };
  };
  
  isRootNode (node) {
    return typeof node === 'object' && node.hasOwnProperty("_root");
  }
  
  render() {
    
    if (this.props.selectedTabId === 'messages') {
      return this.renderMessagesTab();
    } else if (this.props.queryResult == null) {
      return null;
    } else {
        
	    const navView = this.state.navView;
	    // NAVIGATION VIEW
	    if(navView) {
	      const table_name = this.capitalizeFirstLetter(this.props.selectedTabName);
	      const nodes = this.createRecordsTree( this.getItems(this.props.queryResult.records), table_name );
	      let records : any[] = [];
	      if ( this.state.selectedItemData && !isEmpty(this.state.selectedItemData) && !this.isRootNode(this.state.selectedItemData)) {
		      if(Array.isArray(this.state.selectedItemData)) {
		         this.items = this.state.selectedItemData;
		         this.columns = typeof this.state.selectedItemData[0] === 'object' ? Object.keys(this.state.selectedItemData[0]) : [];
		      } else if (typeof this.state.selectedItemData === 'object') {
		        records.push(this.state.selectedItemData);
		        this.items = records;
		        this.columns = Object.keys(this.state.selectedItemData);
		      }
		  } else {
		     this.items = this.getItems(this.props.queryResult.records);
		     this.columns = this.props.queryResult.fields;
		  }
		 
		   return <div>
		           <EuiSpacer size="m" />
		            <EuiFlexGroup gutterSize="none" className="toggleContainer">
					   <EuiFlexItem grow={false}>
				            <EuiSwitch
				              label="Navigation View"
				              checked={this.state.navView}
				              onChange={this.toggleNavView}
				            />
				       </EuiFlexItem>
				   </EuiFlexGroup>
		                 
				   <EuiText className="table-name">{this.capitalizeFirstLetter(this.props.selectedTabName)}</EuiText>
				   
			       <div className="sql-console-results-container"> 
			         <EuiFlexGroup gutterSize="none" className="-panel">
				         <EuiFlexItem className="nav-left-side-content" grow={false}>
				           <EuiPanel>
				              {this.renderNav(nodes, table_name)}   
				           </EuiPanel>  
				         </EuiFlexItem>
				         <EuiFlexItem className="nav-left-side-content">
					      <EuiTable>
					        <EuiTableHeader className="table-header">
					          {this.renderHeaderCellsWithNoSorting(this.columns)}
					        </EuiTableHeader>
					
					        <EuiTableBody>
					          {this.renderNavRows(this.items, this.columns, 'Table Name')}
					        </EuiTableBody>
					
					      </EuiTable>
					     </EuiFlexItem>
					 </EuiFlexGroup>    
			      </div>     
		   </div> 
	    } 
	    
	    // NESTED TABLE VIEW 
	    else {
		    if (this.props.queryResult) {
		      this.items = this.getItems(this.props.queryResult.records);
		      this.columns = this.props.queryResult.fields;
		      this.expandedRowColSpan = this.columns.length;
		    } 
		    
		      return <div>    
		           <EuiSpacer size="m" /> 
		           <EuiText className="table-name">{this.capitalizeFirstLetter(this.props.selectedTabName)}</EuiText>
		                  
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
				   <EuiFlexGroup gutterSize="none" className="toggleContainer">
					   <EuiFlexItem grow={false}>
				            <EuiSwitch
				              label="Navigation View"
				              checked={this.state.navView}
				              onChange={this.toggleNavView}
				            />
				       </EuiFlexItem>
				   </EuiFlexGroup> 
				   
			       <div className="sql-console-results-container"> 
			         <EuiFlexGroup gutterSize="none" >
				         <EuiFlexItem>
					      <EuiTable>
					        <EuiTableHeader className="table-header">
					          {this.renderHeaderCells(this.columns)}
					        </EuiTableHeader>
					
					        <EuiTableBody>
					          {this.renderRows(this.items, this.columns, 'Table Name', '', this.props.itemIdToExpandedRowMap)}
					        </EuiTableBody>
					
					      </EuiTable>
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
