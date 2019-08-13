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
