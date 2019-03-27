import React from 'react';
import {
  StorageOverview as KubevirtStorageOverview,
  ClusterOverviewContext,
  getResource,
} from 'kubevirt-web-ui-components';

import { NodeModel, PodModel, PersistentVolumeClaimModel, VirtualMachineModel, InfrastructureModel } from '../../../models';
import { WithResources } from '../../../kubevirt/components/utils/withResources';

const resourceMap = {
  nodes: {
    resource: getResource(NodeModel, {namespaced: false}),
  },
  pods: {
    resource: getResource(PodModel),
  },
  pvcs: {
    resource: getResource(PersistentVolumeClaimModel),
  },
  vms: {
    resource: getResource(VirtualMachineModel),
  },
  infrastructure: {
    resource: getResource(InfrastructureModel, { namespaced: false, name: 'cluster', isList: false }),
  },
};

const getInventoryData = resources => {
  const inventory = {};
  if (resources.nodes) {
    inventory.nodes = {
      data: resources.nodes,
      title: 'Hosts',
      kind: NodeModel.kind,
    };
  }
  if (resources.pods) {
    inventory.pods = {
      data: resources.pods,
      title: 'Pods',
      kind: PodModel.kind,
    };
  }
  if (resources.pvcs) {
    inventory.pvcs = {
      data: resources.pvcs,
      title: 'PVCs',
      kind: PersistentVolumeClaimModel.kind,
    };
  }
  if (resources.vms) {
    inventory.vms = {
      data: resources.vms,
      title: 'VMs',
      kind: VirtualMachineModel.kind,
    };
  }

  return {
    inventory,
    loaded: !!inventory,
    heading: 'OCS Inventory',
  };
};

export class StorageOverview extends React.Component {
  constructor(props){
    super(props);

  }

  render() {
    const inventoryResourceMapToProps = resources => {
      return {
        value: {
          inventoryData: getInventoryData(resources), // k8s object loaded via WithResources
        },
      };
    };

    return (
      <WithResources resourceMap={resourceMap} resourceToProps={inventoryResourceMapToProps}>
        <ClusterOverviewContext.Provider>
          <KubevirtStorageOverview />
        </ClusterOverviewContext.Provider>
      </WithResources>
    );
  }
}
