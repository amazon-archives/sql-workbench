import { Selector } from 'testcafe';
import { MAX_NUM_TABS } from '../utils/constants.ts'
	  
fixture('Getting Started').page('http://localhost:5601/wto/app/sql-kibana');
	  
const runButton = Selector('.action-container > .euiFlexGroup > .euiFlexItem:first-child > .euiButton');
const topBarButton = Selector('.query-result-container > .euiFlexGroup > .download-container');
const queryEditor = Selector('.sql-query-panel > .euiCodeEditorWrapper > .ace_editor > .ace_text-input');
const translateButton = Selector('.action-container > .euiFlexGroup > .euiFlexItem:nth-child(2) > .euiButton');
const translations = Selector('.translated-query-panel .ace_content > .ace_text-layer > .ace_line');
	  
test('check the title of the sql code editor', async (t) => {
	const title = Selector('.euiFlexGroup > .euiFlexItem > .sql-query-panel-header');
	await t
	  .expect(title.innerText).eql('SQL');
});

test('run the SQL command', async (t) => {
	const result = Selector('.euiTabs > button');
	//const resultsTable = Selector('.sql-console-results-container .euiTable > .table-header');
	const errorMessage = Selector('.sql-console-query-result #brace-editor .ace_content > .ace_text-layer > .ace_line');

  await t
	.typeText(queryEditor,'select * from asdasdasd;\n')
	.wait(3000)
	.click(runButton)
	.expect(errorMessage.innerText).contains('index_not_found_exception');
});


test('translate the SQL command', async (t) => {
	await t
	  .expect(translateButton.innerText).eql('Translate');
  await t
	.typeText(queryEditor,'select * from dsfsdf;\n')
	.wait(3000)
	.click(translateButton)
	.expect(translations.innerText).contains('null');
});


test('clear the translation', async (t) => {
	const clearButton = Selector('.action-container > .euiFlexGroup > .euiFlexItem:last-child > .euiButtonEmpty');
	await t
	  .expect(translateButton.innerText).eql('Translate');
  await t
	.typeText(queryEditor,'select * from asdasd;\n')
	.wait(1000)
	  .click(translateButton)
	  .expect(translations.innerText).eql('null')
	  .click(clearButton)
	  .expect(translations.innerText).eql('');
});

test('back to home page', async (t) => {
	const homeLink = Selector('.global-nav__logo > a');
	const addData = Selector('.homPage > .euiPageBody > .euiPanel > .euiFlexGroup > .euiFlexItem > h3');
	await t
	  .click(homeLink)
	  .expect(addData.innerText).eql('Add Data to Kibana');
});

