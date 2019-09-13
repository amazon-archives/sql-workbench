import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { render } from "@testing-library/react";
import QueryResults from "./QueryResults";
 
describe("<QueryResults /> spec", () => {
  it("renders the component", () => {
    render(
      <QueryResults
        queries={[]}
        queryResults={[]}
        queryResultsJDBC={[]}
        queryResultsRaw={[]}
        queryResultsCSV={[]}
        message={[]}
        selectedTabId={'testTabId'}
        selectedTabName={'testTabId'}
        onSelectedTabIdChange={(a) => {}}
        itemIdToExpandedRowMap={{}}
        onQueryChange={(a) => {}}
        updateExpandedMap={(a) => {}}
        searchQuery={'testQuery'}
      />
    );
    expect(document.body.children[0]).toMatchSnapshot();
  });
});