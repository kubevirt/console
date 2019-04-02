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
  VirtualMachineModel,
  InfrastructureModel,
} from '../../../models';
import { WithResources } from '../../../kubevirt/components/utils/withResources';
import { LoadingInline } from '../../../kubevirt/components/utils/okdutils';

const CEPH_ROOK_NAMESPACE = 'openshift-storage';

const resourceMap = {
  nodes: {
    resource: getResource(NodeModel, { namespaced: false }),
  },
  pods: {
    resource: getResource(PodModel, {
      namespace: CEPH_ROOK_NAMESPACE,
    }),
  },
  pvcs: {
    resource: getResource(PersistentVolumeClaimModel),
  },
  vms: {
    resource: getResource(VirtualMachineModel),
  },
  infrastructure: {
    resource: getResource(InfrastructureModel, {
      namespaced: false,
      name: 'cluster',
      isList: false,
    }),
  },
  cephCluster: {
    resource: getResource(CephClusterModel),
  },
};

export class StorageOverview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const inventoryResourceMapToProps = resources => {
      return {
        value: {
          LoadingComponent: LoadingInline,
          ...resources,
          detailsData: {
            LoadingComponent: LoadingInline,
            storageCluster: resources.cephCluster,
            ...this.state.detailsData,
          },
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
