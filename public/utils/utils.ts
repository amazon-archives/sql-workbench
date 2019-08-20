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

import {Node, Tree} from "../components/QueryResults/QueryResultsBody";

export const getQueries = (queriesString: string): string[] => {
  if (queriesString == null) {
    return [];
  }

  return queriesString
    .split(';')
    .map((query: string) => query.trim())
    .filter((query: string) => query != '');
}

export function getQueryIndex(query) { 
  if(query) {
    const queryFrom = query.toLowerCase().split("from");
    
    if (queryFrom.length > 0){
      return queryFrom[1].split(" ")[1];
    }
  }
 return query;
}

export function isEmpty (obj) {
  for(const key in obj) {
      if(obj.hasOwnProperty(key)) { return false; }       
  }
  return true;
}

export function capitalizeFirstLetter(name) {  
  return name && name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

export function getMessageString(messages, tabNames) {
  return messages && messages.length > 0 && tabNames ? messages.reduce( (finalMessage, message, currentIndex) => finalMessage.concat(capitalizeFirstLetter(tabNames[currentIndex]), ': ', message.text, '\n\n'), '' ) : '';
}

export function scrollToNode(nodeId) {
  const element = document.getElementById(nodeId);
  element.scrollIntoView();
}

export function flattenPanelTree(tree, array = []) {
    array.push(tree);
    if (tree.items) {
        tree.items.forEach(item => {
            if (item.panel) {
                flattenPanelTree(item.panel, array);
                item.panel = item.panel.id;
            }
        });
    }
    return array;
}

// Download functions
export function onDownloadFile(data, fileFormat, fileName) {
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
export function Node(data, parentId, name = '', parent = {}) {
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

// It creates a tree of nested objects or arrays for the row
export function createRowTree(item, rootId) {
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

export function getRowTree(nodeId, item, expandedRowMap) {
    return expandedRowMap[nodeId] && expandedRowMap[nodeId].nodes
        ? expandedRowMap[nodeId].nodes
        : createRowTree(item, nodeId);
}

export function findRootNode(node, expandedRowMap){
  const rootNodeId = node.nodeId.split('_')[0];
  const rootNode = expandedRowMap[rootNodeId].nodes._root;
  return rootNode;
};