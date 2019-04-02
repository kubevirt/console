import React from 'react';
import {
  StorageOverview as KubevirtStorageOverview,
  ClusterOverviewContext,
  getResource,
} from 'kubevirt-web-ui-components';

import {
  CephClusterModel,
  NodeModel,
  PodModel,
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
  VirtualMachineModel,
  VirtualMachineInstanceMigrationModel,
} from '../../../models';

import { WithResources } from '../../../kubevirt/components/utils/withResources';
import { LoadingInline } from '../../../kubevirt/components/utils/okdutils';
import { coFetchJSON } from '../../../co-fetch';

const REFRESH_TIMEOUT = 30000;
const CEPH_ROOK_NAMESPACE = 'openshift-storage';

const CEPH_STATUS = 'ceph_health_status';

const resourceMap = {
  nodes: {
    resource: getResource(NodeModel, { namespaced: false }),
  },
  pods: {
    resource: getResource(PodModel, {
      namespace: CEPH_ROOK_NAMESPACE,
    }),
  },
  pvs: {
    resource: getResource(PersistentVolumeModel),
  },
  pvcs: {
    resource: getResource(PersistentVolumeClaimModel),
  },
  vms: {
    resource: getResource(VirtualMachineModel),
  },
  migrations: {
    resource: getResource(VirtualMachineInstanceMigrationModel),
  },
  cephCluster: {
    resource: getResource(CephClusterModel),
  },
};

export class StorageOverview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ocsHealthData: {
        data: {},
        loaded: false,
      },
    };
    this.setHealthData = this._setHealthData.bind(this);
  }
  _setHealthData(healthy) {
    this.setState({
      ocsHealthData: {
        data: {
          healthy,
        },
        loaded: true,
      },
    });
  }

  fetchHealth(response, callback) {
    const result = response.data.result;
    result.map(r => callback(r.value[1]));
  }

  fetchPrometheusQuery(query, callback) {
    const promURL = window.SERVER_FLAGS.prometheusBaseURL;
    const url = `${promURL}/api/v1/query?query=${encodeURIComponent(query)}`;
    coFetchJSON(url)
      .then(result => {
        if (this._isMounted) {
          callback(result);
        }
      })
      .then(() => {
        if (this._isMounted) {
          setTimeout(
            () => this.fetchPrometheusQuery(query, callback),
            REFRESH_TIMEOUT
          );
        }
      });
  }

  componentDidMount() {
    this._isMounted = true;

    this.fetchPrometheusQuery(CEPH_STATUS, response =>
      this.fetchHealth(response, this.setHealthData)
    );
  }
  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const { ocsHealthData } = this.state;
    const inventoryResourceMapToProps = resources => {
      return {
        value: {
          LoadingComponent: LoadingInline,
          ...resources,
          ocsHealthData,
        },
      };
    };

    return (
      <WithResources
        resourceMap={resourceMap}
        resourceToProps={inventoryResourceMapToProps}
      >
        <ClusterOverviewContext.Provider>
          <KubevirtStorageOverview />
        </ClusterOverviewContext.Provider>
      </WithResources>
    );
  }
}
