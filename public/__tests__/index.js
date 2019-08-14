import { Selector } from 'testcafe';
  		  
    fixture('Getting Started').page('http://localhost:5601/wto/app/sql-kibana');
    test('check the title of the sql code editor', async (t) => {
	   const title = Selector('.euiFlexGroup > .euiFlexItem > .sql-query-panel-header');
	   // check title
	   await t
	     .expect(title.innerText).eql('SQL');
	 });
  		  
	 test('run the SQL command', async (t) => {
	   const runButton = Selector('.action-container > .euiFlexGroup > .euiFlexItem:first-child > .euiButton');
	   const result = Selector('.euiTabs > button');
	   const resultsTable = Selector('.sql-console-results-container .euiTable > .table-header');
	   await t
	     .expect(runButton.innerText).eql('Run')
	     .expect(result.count).eql(1);
	   await t
	     .click(runButton)
	     .expect(result.count).eql(2)
	     .expect(resultsTable.exists).ok();
	 });
	  
	 test('translate the SQL command', async (t) => {
	   const translateButton = Selector('.action-container > .euiFlexGroup > .euiFlexItem:nth-child(2) > .euiButton');
	   const translations = Selector('.translated-query-panel .ace_content > .ace_text-layer > .ace_line');
	   await t
	     .expect(translateButton.innerText).eql('Translate');
	   await t
	     .click(translateButton)
	     .expect(translations.count).gt(1);
	 });
	  
	 test('clear the translation', async (t) => {
	   const translateButton = Selector('.action-container > .euiFlexGroup > .euiFlexItem:nth-child(2) > .euiButton');
	   const clearButton = Selector('.action-container > .euiFlexGroup > .euiFlexItem:last-child > .euiButton');
	   const translations = Selector('.translated-query-panel .ace_content > .ace_text-layer > .ace_line');
	   await t
	     .expect(translateButton.innerText).eql('Translate');
	   await t
	     .click(translateButton)
	     .expect(translations.count).gt(1)
	     .click(clearButton)
	     .expect(translations.count).eql(1);
	 });
	  
	 test('back to home page', async (t) => {
	   const homeLink = Selector('.global-nav__logo > a');
	   const addData = Selector('.homPage > .euiPageBody > .euiPanel > .euiFlexGroup > .euiFlexItem > h3');
	   await t
	     .click(homeLink)
	     .expect(addData.innerText).eql('Add Data to Kibana');
	 });
