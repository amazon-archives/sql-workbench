import * as ace from 'brace';

ace.define('ace/theme/sql_console', ['require', 'exports', 'module', 'ace/lib/dom'], function (acequire, exports, module) {
  exports.isDark = false;
  exports.cssClass = 'ace-sql-console';
  exports.cssText = require('./sql_console.css');

  const dom = acequire('../lib/dom');
  dom.importCssString(exports.cssText, exports.cssClass);
});
