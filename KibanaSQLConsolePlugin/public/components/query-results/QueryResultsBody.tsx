import React, { Fragment } from 'react';
import _ from 'lodash';
import {
  EuiPanel,
  EuiHorizontalRule,
  EuiCodeEditor,
  EuiTable,
  EuiTableBody,
  EuiTableFooter,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiToolTip,
  Pager,
  EuiTablePagination,
  EuiSpacer,
  EuiFieldSearch,
  EuiFlexItem,
  EuiFlexGroup,
  EuiInMemoryTable,
  EuiSearchBar,
  EuiButtonIcon,
  EuiText,
  EuiKeyboardAccessible,
  EuiHighlight,
  EuiSideNav,
  EuiSwitch
} from '@elastic/eui';

import { SortableProperties } from '@elastic/eui/lib/services';
import { isEmpty } from '../utils/utils';

import 'brace/mode/mysql';
import 'brace/mode/json';
import '../../ace-themes/sql_console';
import { QueryResult, ESDocument, ResponseDetail } from '../main/main';
import { getQueryResultsFromCsv } from './QueryResults';

interface QueryResultsBodyProps {
  queryResult: QueryResult;
  tabNames: string[];
  selectedTabName: string;
  selectedTabId: string;
  searchQuery: string;
  onQueryChange : (query: object) => void;
  updateExpandedMap: (map:object) => void;
}

interface QueryResultsBodyState {
}

export const MAX_NUM_VALUES_IN_FIELD = 2;
export const PAGE_OPTIONS = [10, 20, 50, 100];
export const COLUMN_WIDTH = '155px';

export function Node(data, name, parent = {}) {
    this.data = data;
    this.name = name;
    this.children = [];
    this.parent = parent;
    this.nodeId = name + '_' + parent.nodeId;
}

export function Tree(data, name) {
    const node = new Node(data, name, {});
    this._root = node;
}

class QueryResultsBody extends React.Component<QueryResultsBodyProps, QueryResultsBodyState> {
  constructor(props: QueryResultsBodyProps) {
    super(props);
     
    this.state = {
      itemIdToSelectedMap: {},
      itemIdToOpenActionsPopoverMap: {},
      incremental: true,
      filters: false,
      itemIdToExpandedRowMap: this.props.itemIdToExpandedRowMap,
      searchQuery: this.props.searchQuery,
      sortedColumn:'',
      selectedItemName: '',
      selectedItemData: {},
      navView: false,
    };    
    this.expandedRowColSpan = 0;
    this.items = [];
    this.columns = [];
  }
  
  createRecordsTree( items, table_name ) {
     //const tree = new Tree( items, table_name );
     const tree = new Tree( items, 'Row' );
     tree._root;
     this.addNodesToTree( items, tree._root );  
     return tree;
  }
  
  addNodesToTree (items, parentNode) {
     const data; 
     const name;
     const currentNode;
     const parentNode = parentNode;
     
     if(items === null){
        return;
     }
     
     if (Array.isArray( items )) {  
       for( let i = 0; i < items.length; i++ ) {
	      data =  items[i];
	      name = parentNode.name ? parentNode.name + ' ' + i : 'Record ' + i;  
	      
	      if( data !== null && ( Array.isArray(data) || typeof data === 'object')) {
	          currentNode = new Node(data, name, parentNode);
		      parentNode.children.push(currentNode); 
		      this.addNodesToTree(data, currentNode);
		  }
	   }
     }
     // If Node is an object
     else if( typeof items === 'object') {
        console.log("NODEOBJ: ", items);
        for( let j = 0; j < Object.keys(items).length; j++ ) {
          data = Object.values(items)[j];
          name = Object.keys(items)[j];
          
          if( data !== null && (Array.isArray(data) || typeof data === 'object')) {
             currentNode = new Node(data, name, parentNode);
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
        name={field}
        textOnly={true}
        onSort={this.props.onSort.bind(this, field)}
        isSorted={this.props.sortedColumn === field}
        isSortAscending={this.props.sortableProperties.isAscendingByName(field)}
        // isMobileHeader={column.isMobileHeader}
        >{ this.capitalizeFirstLetter(field) }
       </EuiTableHeaderCell>
    });
  }
  
  renderArrayList(items) {
     const rows = [];
     const tableCells = [];
     
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
    const rows = [];
    if ( items && ( ( typeof items === "object" && !isEmpty(items) ) || (Arrays.isArray(items) && items.length > 0))){
      const records = []; 
      
      if(Array.isArray( items )) {
          records = items;
        } else {
          records.push(items);
        }
        
      for( let i = 0; i < records.length; i++ ) {
         const record = records[i];
	     const tableCells = [];
	     
	    /* if( columns.length == 0 && typeof record === "object" ) {
	        columns = Object.keys(record);
	     }*/
	        
	     if(columns.length > 0){  
		     columns.map((field:[]) => {
			      // Row
			      const fieldObj = this.getFieldValue(record[field], field); 
		          tableCells.push(<EuiTableRowCell  key={field} textOnly={true}>
		                               { fieldObj.value }
		                           </EuiTableRowCell>);
		     });
		  } else {
		     //items.map((item) => {
			     const fieldObj = this.getFieldValue(record, ''); 
			     tableCells.push(<EuiTableRowCell textOnly={true}>
			                               { fieldObj.value }
			                           </EuiTableRowCell>);
			 //    });
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
    const rows = [];
    
    if (items){
	    for (let itemIndex = this.props.firstItemIndex; itemIndex <= this.props.lastItemIndex; itemIndex++) {
	      const item = items[itemIndex];
	        
	      if(item){ 
			  const rowId = item['id'];
	          
		      // NESTED TABLE	   
		      const expandedTableCells = []; 
		      const tableCells = [];
		      
			  columns.map((field:[], index) => {
			      
			      // Create key for nested object 
			      if( parentKey.length > 0 ) {
			        const itemKey = parentKey.concat(',', rowId.toString(),'-', index.toString());
			      } else {
			        const itemKey = rowId.toString().concat('-', index.toString());
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
                 
                    const records = [];
        
			        if(Array.isArray( item[field] )) {
			          records = item[field];
			        } else {
			          records.push(item[field]);
			        }
			        
			        // expandedRowColSpan represents the number of columns of the father table
			        // numNestedTableColumns represents the number of columns of the child table
			        
	                const numNestedTableColumns = typeof records[0] === "object" ? Object.keys(records[0]).length : records.length;
	                const halfNestedTable = numNestedTableColumns/2 ;
	                const colSpanLeft =  0;
	                const colSpanRight = 0;
	                
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
			 		     			   
		     if( expandedTableCells.length > 0 ) {
		         const expandedRow =  <EuiTableRow isExpandedRow={true}>{expandedTableCells}</EuiTableRow>;
		         const row = ( <EuiTableRow className="expanded-row" key={itemIndex}>{tableCells} </EuiTableRow>);
		         const rowWithExpandable = (
				    <Fragment key={rowId}>
				        {row}
				        {expandedRow}
	      			</Fragment>);
		     
		     } else {
		         const row = ( <EuiTableRow key={itemIndex}>{tableCells} </EuiTableRow>);
		         const rowWithExpandable = (
				    <Fragment key={rowId}>
				        {row}
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
  
  resolveSearchSchema() {
    const { columns } = this.props.queryResult.fields;
    return columns.reduce((schema, column) => {
      if (column.field) {
        const type = column.dataType || 'string';
        schema.fields[column.field] = { type };
      }
      return schema;
    }, { strict: true, fields: {} });
  }
  
  getItems(records) {
    const matchingItems = this.props.searchQuery ? EuiSearchBar.Query.execute(this.props.searchQuery, records) : records;
    return this.props.sortableProperties.sortItems(matchingItems);
  }
   
  getFieldValue( fieldValue, field ) {
    const hasExpandingRow = false;
    const hasExpandingArray = false;
    const value = '';
    
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
	    let numObjects: number=0;
	    let numObjMessage: string='';
	    
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
		            formattedFieldValue = formattedFieldValue.concat(' ... ', fieldValue.length - maxNumOfValues, ' more');
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
	   // numObjMessage = numObjects > 0 ? numObjMessage.concat( field, ': ', numObjects) : '';
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
	  // const itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
	   
	   return <EuiButtonIcon
          onClick={() => this.toggleDetails(item, itemKey, tableName, parentItems, parentColumns, parentTableName, parentKey, expandedRowMap, this.props.sortableProperties)}
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
        
        const newItemIdToExpandedRowMap = {};
        	   	    
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
		    //this.setState({ itemIdToExpandedRowMap: newItemIdToExpandedRowMap });    
		 }
	  };  
	 	 
	 toggleDetails = (item, itemKey, tableName, parentItems, parentColumns, parentTableName, parentKey, expandedRowMap) => {
        const records = [];
        if(Array.isArray( item )) {
          records = item;
        } else {
          records.push(item);
        }
	    
	    const nestedTableColumns = Object.keys(records[0]);
	    const items = [];
	    const databaseRecords = [];
	    const newItemIdToExpandedRowMap = {};
	         
	    for (let i = 0 ; i < records.length; i +=1) {
           
           const databaseRecord: {[key: string]: string} = {};
           const rowValues = Object.values(records[i]);
           
           //Add row id
           databaseRecord['id'] = i;
           for( let j = 0; j < rowValues.length; j += 1 ) {	 
           	 const field: string = nestedTableColumns[j];
           	 databaseRecord[field] = rowValues[j];
           } 
           databaseRecords.push(databaseRecord);
	    }
		   	    
	    if( databaseRecords.length > 0 ) {
		    items = this.getItems(databaseRecords);
	        
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
						          {this.renderHeaderCells(nestedTableColumns)}
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
					          {this.renderHeaderCells(parentColumns)}
					        </EuiTableHeader>
					
					        <EuiTableBody>
					          {this.renderRows(parentItems, parentColumns, parentTableName, parentKey, newItemIdToExpandedRowMap)}
					        </EuiTableBody>
					      </EuiTable>
					    </div>  
				      </div>
		      } 
		      this.props.updateExpandedMap(newItemIdToExpandedRowMap); 
		      //this.setState({ itemIdToExpandedRowMap: newItemIdToExpandedRowMap });    
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
    console.log("ItemList: ", itemList);
    return itemList;
  }	  
	  
  renderNav(nodes, table_name){
    const itemList =[];   
    const sideNav = [
      this.createItem( table_name, table_name, nodes, {
        items: 
            this.getChildrenItems(nodes._root.children),
      }),
   ];
   
   return (
      <EuiSideNav
        mobileTitle="Navigate within $APP_NAME"
        toggleOpenOnMobile={this.toggleOpenOnMobile}
        isOpenOnMobile={this.state.isSideNavOpenOnMobile}
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
    // NOTE: Duplicate `name` values will cause `id` collisions.
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
	      
	      if ( this.state.selectedItemData && !isEmpty(this.state.selectedItemData) && !this.isRootNode(this.state.selectedItemData)) {
		      if(Array.isArray(this.state.selectedItemData)) {
		         this.items = this.state.selectedItemData;
		         this.columns = typeof this.state.selectedItemData[0] === 'object' ? Object.keys(this.state.selectedItemData[0]) : [];
		      } else if (typeof this.state.selectedItemData === 'object') {
		        this.items = this.state.selectedItemData;
		        this.columns = Object.keys(this.state.selectedItemData);
		      }
		  } else {
		     this.items = this.getItems(this.props.queryResult.records);
		     this.columns = this.props.queryResult.fields;
		  }
		 
		   return <div>
		                 
				   <EuiText className="table-name">{this.capitalizeFirstLetter(this.props.selectedTabName)}</EuiText>
				   
			       <div className="sql-console-results-container"> 
			         <EuiFlexGroup gutterSize="none" className="resize-panel">
				         <EuiFlexItem className="nav-left-side-content" grow={0}>
				           <EuiPanel>
				              {this.renderNav(nodes, table_name)}   
				           </EuiPanel>  
				         </EuiFlexItem>
				         <EuiFlexItem className="nav-left-side-content">
					      <EuiTable>
					        <EuiTableHeader className="table-header">
					          {this.renderHeaderCells(this.columns)}
					        </EuiTableHeader>
					
					        <EuiTableBody>
					          {this.renderNavRows(this.items, this.columns, 'Table Name', '', this.props.itemIdToExpandedRowMap)}
					        </EuiTableBody>
					
					      </EuiTable>
					     </EuiFlexItem>
					 </EuiFlexGroup>    
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
				   <EuiText className="table-name">{this.capitalizeFirstLetter(this.props.selectedTabName)}</EuiText>
				   
			       <div className="sql-console-results-container"> 
			         <EuiFlexGroup gutterSize="none" className="resize-panel">
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
			        <EuiTablePagination className="pagination-container"
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
			   </div>   
		  }
	  }	      
   }
}

interface QueryResultsBodyContainerProps {
  queryResults: ResponseDetail<QueryResult>[];
  message: string[];
  tabNames: string[];
  selectedTabId: string;
  selectedTabName: string;
  firstItemIndex: number;
  onQueryChange: (query:object) => void;
  searchQuery: string;
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
      return queryResultResponseDetail && queryResultResponseDetail.fulfilled ? queryResultResponseDetail.data : queryResultResponseDetail.errorMessage;
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
