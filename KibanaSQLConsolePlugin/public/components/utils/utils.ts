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
