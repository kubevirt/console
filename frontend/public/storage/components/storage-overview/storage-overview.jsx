import React from 'react';
import {
  StorageOverview as KubevirtStorageOverview,

} from 'kubevirt-web-ui-components';

export class StorageOverview extends React.Component {
  constructor(props){
    super(props);

  }

  render() {
    return (
      <KubevirtStorageOverview />
    );
  }
}
