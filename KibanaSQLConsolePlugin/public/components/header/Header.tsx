import React from 'react';
import { EuiText, EuiHorizontalRule } from '@elastic/eui';

const Header = () => {
  return <div>
    <div className="sql-console-page-header">
      SQL console
    </div>
    <EuiHorizontalRule margin="none" />
  </div>;
};

export default Header;
