import React from 'react';
import * as _ from 'lodash-es';
import {
  ClusterOverview as KubevirtClusterOverview,
  getResource,
  ClusterOverviewContext,
  complianceData,
  getCapacityStats,
} from 'kubevirt-web-ui-components';

import {
  NodeModel,
  PodModel,
  PersistentVolumeClaimModel,
  VirtualMachineModel,
  InfrastructureModel,
  VirtualMachineInstanceMigrationModel,
  BaremetalHostModel,
} from '../../../models';
import { WithResources } from '../utils/withResources';
import { k8sBasePath } from '../../module/okdk8s';
import { coFetch, coFetchJSON } from '../../../co-fetch';

import { EventStream } from '../../../components/events';
import { EventsInnerOverview } from './events-inner-overview';
import { LoadingInline } from '../utils/okdutils';

const CONSUMERS_CPU_QUERY = 'sort(topk(10, sum by (pod_name)(container_cpu_usage_seconds_total{pod_name!=""})))';
const CONSUMERS_MEMORY_QUERY = 'sort(topk(10, sum by (pod_name)(container_memory_usage_bytes{pod_name!=""})))';
const OPENSHIFT_VERSION_QUERY = 'openshift_build_info{job="apiserver"}';

const CAPACITY_MEMORY_TOTAL_QUERY = 'sum(kube_node_status_capacity_memory_bytes)';

const CAPACITY_STORAGE_TOTAL_BASE_CEPH_METRIC = 'ceph_cluster_total_bytes'; // available with Ceph only
const CAPACITY_STORAGE_TOTAL_QUERY = CAPACITY_STORAGE_TOTAL_BASE_CEPH_METRIC;
const CAPACITY_STORAGE_TOTAL_DEFAULT_QUERY = 'sum(node_filesystem_avail_bytes)';

const CAPACITY_NETWORK_TOTAL_QUERY = 'sum(avg by(instance)(node_network_speed_bytes))'; // TODO(mlibra): needs to be refined
const CAPACITY_NETWORK_USED_QUERY = 'sum(node:node_net_utilisation:sum_irate)';

const UTILIZATION_CPU_USED_QUERY = '((sum(node:node_cpu_utilisation:avg1m) / count(node:node_cpu_utilisation:avg1m)) * 100)[60m:5m]';
const UTILIZATION_MEMORY_USED_QUERY = '(sum(kube_node_status_capacity_memory_bytes) - sum(kube_node_status_allocatable_memory_bytes))[60m:5m]'; // TOTAL is reused from CAPACITY_MEMORY_TOTAL_QUERY

const UTILIZATION_STORAGE_USED_QUERY = 'ceph_cluster_total_used_bytes[60m:5m]';
const UTILIZATION_STORAGE_USED_DEFAULT_QUERY = '(sum(node_filesystem_avail_bytes) - sum(node_filesystem_free_bytes))[60m:5m]';

const REFRESH_TIMEOUT = 5000;

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
  migrations: {
    resource: getResource(VirtualMachineInstanceMigrationModel),
  },
  hosts: {
    resource: getResource(BaremetalHostModel),
  },
};

const OverviewEventStream = () => <EventStream scrollableElementId="events-body" InnerComponent={EventsInnerOverview} overview={true} namespace={undefined} />;

const getPrometheusBaseURL = () => window.SERVER_FLAGS.prometheusBaseURL;

export class ClusterOverview extends React.Component {
  constructor(props){
    super(props);
    this.messages = {};

    this.state = {
      openshiftClusterVersions: null,
      healthData: {
        data: {},
        loaded: false,
      },
      consumersData: {
        metrics: {
          cpu: {
            title: 'CPU',
            consumers: [],
          },
        },
        loaded: false,
      },
      capacityData: {},
      utilizationData: {},
    };

    this.setConsumersData = this._setConsumersData.bind(this);
    this.setHealthData = this._setHealthData.bind(this);
    this.setDetailsOpenshiftResponse = this._setDetailsOpenshiftResponse.bind(this);
    this.setCapacityData = this._setCapacityData.bind(this);
    this.setUtilizationData = this._setUtilizationData.bind(this);
    this.getStorageMetrics = this._getStorageMetrics.bind(this);
  }

  _setConsumersData(key, title, response) {
    const result = _.get(response, 'data.result', []);
    this.setState(state => ({
      consumersData: {
        metrics: {
          ...(_.get(state.consumersData, 'metrics', {})),
          [key]: {
            title,
            consumers: result.map(r => ({
              kind: PodModel.kind,
              name: r.metric.pod_name,
              usage: r.value[1],
            })),
          },
        },
        loaded: true,
      },
    }));
  }

  _setHealthData(healthy, message) {
    this.setState({
      healthData: {
        data: {
          healthy,
          message,
        },
        loaded: true,
      },
    });
  }

  _setDetailsOpenshiftResponse(response) {
    let openshiftClusterVersions = _.get(response, 'data.result', []);
    if (!Array.isArray(openshiftClusterVersions)){ // only one node
      openshiftClusterVersions = [openshiftClusterVersions];
    }

    this.setState({
      openshiftClusterVersions,
    });
  }

  _setCapacityData(key, response) {
    this.setState(state => ({
      capacityData: {
        ...state.capacityData,
        [key]: response,
      },
    }));
  }

  _setUtilizationData(key, response) {
    this.setState(state => ({
      utilizationData: {
        ...state.utilizationData,
        [key]: response,
      },
    }));
  }

  async _getStorageMetrics() {
    try {
      let queryTotal = CAPACITY_STORAGE_TOTAL_DEFAULT_QUERY;
      let queryUsed = UTILIZATION_STORAGE_USED_DEFAULT_QUERY;

      const metrics = await this.getPrometheusMetrics();
      if (_.get(metrics, 'data', []).find(metric => metric === CAPACITY_STORAGE_TOTAL_BASE_CEPH_METRIC)) {
        const cephData = await this.getPrometheusQuery(CAPACITY_STORAGE_TOTAL_QUERY);
        if (getCapacityStats(cephData)) { // Ceph data are available
          queryTotal = CAPACITY_STORAGE_TOTAL_QUERY;
          queryUsed = UTILIZATION_STORAGE_USED_QUERY;
        }
      }

      this.fetchPrometheusQuery(queryTotal, response => this.setCapacityData('storageTotal', response));
      this.fetchPrometheusQuery(queryUsed, response => this.setUtilizationData('storageUsed', response));
    } catch (error) {
      if (this._isMounted) {
        this.setCapacityData('storageTotal', error);
        this.setUtilizationData('storageUsed', error);
      }
    }
  }

  async getPrometheusMetrics() {
    const url = `${getPrometheusBaseURL()}/api/v1/label/__name__/values`;
    return coFetchJSON(url);
  }

  async getPrometheusQuery(query) {
    const url = `${getPrometheusBaseURL()}/api/v1/query?query=${encodeURIComponent(query)}`;
    return coFetchJSON(url);
  }

  fetchPrometheusQuery(query, callback) {
    this.getPrometheusQuery(query).then(result => {
      if (this._isMounted) {
        callback(result);
      }
    }).catch(error => {
      if (this._isMounted) {
        callback(error);
      }
    }).then(() => {
      if (this._isMounted) {
        setTimeout(() => this.fetchPrometheusQuery(query, callback), REFRESH_TIMEOUT);
      }
    });
  }

  fetchHealth(callback) {
    coFetch(`${k8sBasePath}/healthz`)
      .then(response => response.text())
      .then(text => text === 'ok' && this._isMounted ? callback(true, 'All systems healthy') : callback(false, text))
      .catch(() => {
        if (this._isMounted) {
          callback(false, 'Cannot get cluster health');
        }
      })
      .then(() => {
        if (this._isMounted) {
          setTimeout(() => this.fetchHealth(callback), REFRESH_TIMEOUT);
        }
      });
  }

  componentDidMount() {
    this._isMounted = true;

    this.fetchPrometheusQuery(CONSUMERS_CPU_QUERY, response => this.setConsumersData('cpu', 'CPU', response));
    this.fetchPrometheusQuery(CONSUMERS_MEMORY_QUERY, response => this.setConsumersData('memory', 'Memory', response));

    this.fetchHealth(this.setHealthData);
    this.fetchPrometheusQuery(OPENSHIFT_VERSION_QUERY, response => this.setDetailsOpenshiftResponse(response));

    this.fetchPrometheusQuery(CAPACITY_MEMORY_TOTAL_QUERY, response => this.setCapacityData('memoryTotal', response));
    this.fetchPrometheusQuery(CAPACITY_NETWORK_TOTAL_QUERY, response => this.setCapacityData('networkTotal', response));
    this.fetchPrometheusQuery(CAPACITY_NETWORK_USED_QUERY, response => this.setCapacityData('networkUsed', response));

    this.getStorageMetrics();

    this.fetchPrometheusQuery(UTILIZATION_CPU_USED_QUERY, response => this.setUtilizationData('cpuUtilization', response));
    this.fetchPrometheusQuery(UTILIZATION_MEMORY_USED_QUERY, response => this.setUtilizationData('memoryUtilization', response));
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const { openshiftClusterVersions, healthData, consumersData, capacityData, utilizationData } = this.state;

    const inventoryResourceMapToProps = resources => {
      return {
        value: {
          LoadingComponent: LoadingInline,
          ...resources,
          openshiftClusterVersions,
          ...capacityData,

          eventsData: {
            Component: OverviewEventStream,
            loaded: true,
          },

          consumersData,
          healthData,

          ...utilizationData,
          complianceData, // TODO: mock, replace by real data and remove from web-ui-components
        },
      };
    };


    return (
      <WithResources resourceMap={resourceMap} resourceToProps={inventoryResourceMapToProps}>
        <ClusterOverviewContext.Provider>
          <KubevirtClusterOverview />
        </ClusterOverviewContext.Provider>
      </WithResources>
    );
  }
}
