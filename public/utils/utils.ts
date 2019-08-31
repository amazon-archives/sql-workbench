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

import { QueryMessage} from '../components/Main/main';

export const getQueries = (queriesString: string): string[] => {
  if (queriesString == '') {
    return [];
  }

  return queriesString
    .split(';')
    .map((query: string) => query.trim())
    .filter((query: string) => query != '');
}

export function getQueryIndex(query: string): string {
  if (query) {
    const queryFrom : string []= query.toLowerCase().split("from");
    
    if (queryFrom.length > 0){
      return queryFrom[1].split(" ")[1];
    }
  }
 return query;
}

export function isEmpty (obj: object) : boolean {
  for (const key in obj) {
      if(obj.hasOwnProperty(key)) { return false; }       
  }
  return true;
}

export function capitalizeFirstLetter(name: string): string {
  return name && name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

export function getMessageString(messages: QueryMessage[], tabNames: string[]): string {
  return messages && messages.length > 0 && tabNames ? messages.reduce( (finalMessage, message, currentIndex) => finalMessage.concat(capitalizeFirstLetter(tabNames[currentIndex]), ': ', messages[currentIndex].text, '\n\n'), '' ) : '';
}

export function scrollToNode(nodeId: string): void {
  const element = document.getElementById(nodeId);
  element.scrollIntoView();
}

// Download functions
export function onDownloadFile(data: any, fileFormat: string, fileName: string) {
  const content = 'data:text/'+fileFormat+'json;charset=utf-8,' + data;
  const encodedUri = encodeURI(content);
  const link = document.createElement("a");
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Tree functions
export type NodeType = {
  data: any;
  name: string;
  children: NodeType[];
  parent: NodeType;
  nodeId: string;
}

export function Node(data: any, parentId: string, name = '', parent = {}) {
  this.data = data;
  this.name = name;
  this.children = [];
  this.parent = parent;
  this.nodeId = name === '' ? parentId : parentId + '_' + name;
}

export function Tree(data: any, parentId: string) {
  const node = new Node(data, parentId);
  this._root = node;
}

// It creates a tree of nested objects or arrays for the row
export function createRowTree(item: any, rootId: string) {
  const tree = new Tree(item, rootId);
  const root = tree._root;

  if (typeof item === 'object') {
    for (let j = 0; j < Object.keys(item).length; j++) {
      let data = Object.values(item)[j];
      let name = Object.keys(item)[j];

      // If value of field is an array or an object it gets added to the tree
      if (data !== null && (Array.isArray(data) || typeof data === 'object')) {
        const firstNode = new Node(data, rootId, name, root);
        root.children.push(firstNode);
      }
    }
  }
  return tree;
}

export function getRowTree(nodeId: string, item: any, expandedRowMap: object) {
  return expandedRowMap[nodeId] && expandedRowMap[nodeId].nodes
    ? expandedRowMap[nodeId].nodes
    : createRowTree(item, nodeId);
}

export function findRootNode(node, expandedRowMap){
  const rootNodeId = node.nodeId.split('_')[0];
  const rootNode = expandedRowMap[rootNodeId].nodes._root;
  return rootNode;
};

/********* TABS Functions *********/
//Checks if an element needs a scrolling
export function needsScrolling(elementId){
  const element = document.getElementById(elementId);
  if (element === null) {
    return false;
  }
  return element.scrollWidth > element.offsetWidth ;
};
