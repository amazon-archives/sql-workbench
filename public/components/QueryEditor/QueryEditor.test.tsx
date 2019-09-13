import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { render } from "@testing-library/react";
import QueryEditor from "./QueryEditor";


describe("<QueryEditor /> spec", () => {
  it("renders the component", () => {
    render(
      <QueryEditor
        onRun={() => {}}
        onTranslate={() => {}}
        onClear={() => {}}
        queryTranslations={[]}
      />
    );
    expect(document.body.children[0]).toMatchSnapshot();
  });
});