import React from 'react';
import { get } from 'lodash-es';

import {
  StorageOverview as KubevirtStorageOverview,
  StorageOverviewContext,
  getResource,
} from 'kubevirt-web-ui-components';

import {
  CephClusterModel,
  NodeModel,
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
} from '../../../models';

import { WithResources } from '../../../kubevirt/components/utils/withResources';
import { LoadingInline } from '../../../kubevirt/components/utils/okdutils';
import { coFetchJSON } from '../../../co-fetch';
import { EventStream } from '../../../components/events';
import { EventsInnerOverview } from '../../../kubevirt/components/cluster/events-inner-overview';
import { LazyRenderer } from '../../../kubevirt/components/utils/lazyRenderer';

const REFRESH_TIMEOUT = 5000;

const CEPH_STATUS_QUERY = 'ceph_health_status';
const STORAGE_CEPH_CAPACITY_TOTAL_QUERY = 'ceph_cluster_total_bytes';
const STORAGE_CEPH_CAPACITY_USED_QUERY = 'ceph_cluster_total_used_bytes';
const CEPH_OSD_UP_QUERY = 'sum(ceph_osd_up)';
const CEPH_OSD_DOWN_QUERY = 'count(ceph_osd_up == 0.0) OR vector(0)';

const CEPH_PG_CLEAN_AND_ACTIVE_QUERY = 'ceph_pg_clean and ceph_pg_active';
const CEPH_PG_TOTAL_QUERY = 'ceph_pg_total';

const UTILIZATION_IOPS_QUERY = '(sum(rate(ceph_pool_wr[1m])) + sum(rate(ceph_pool_rd[1m])))[360m:5m]';
//This query only count the latency for all drives in the configuration. Might go with same for the demo
const UTILIZATION_LATENCY_QUERY = '(quantile(.95,(irate(node_disk_read_time_seconds_total[1m]) + irate(node_disk_write_time_seconds_total[1m]) /  (irate(node_disk_reads_completed_total[1m]) + irate(node_disk_writes_completed_total[1m])))))[360m:5m]';
const UTILIZATION_THROUGHPUT_QUERY = '(sum(rate(ceph_pool_wr_bytes[1m]) + rate(ceph_pool_rd_bytes[1m])))[360m:5m]';
const TOP_CONSUMERS_QUERY = '(sum((max(kube_persistentvolumeclaim_status_phase{phase="Bound"}) by (namespace,pod,persistentvolumeclaim) ) * max(kube_persistentvolumeclaim_resource_requests_storage_bytes) by (namespace,pod,persistentvolumeclaim)) by (namespace))[360m:60m]';

const resourceMap = {
  nodes: {
    resource: getResource(NodeModel, { namespaced: false }),
  },
  pvs: {
    resource: getResource(PersistentVolumeModel),
  },
  pvcs: {
    resource: getResource(PersistentVolumeClaimModel),
  },
  cephCluster: {
    resource: getResource(CephClusterModel),
  },
};

const getPrometheusBaseURL = () => window.SERVER_FLAGS.prometheusBaseURL;

const getAlertManagerBaseURL = () => window.SERVER_FLAGS.alertManagerBaseURL;

const OverviewEventStream = () => <EventStream scrollableElementId="events-body" InnerComponent={EventsInnerOverview} overview={true} namespace={undefined} kind="PersistentVolumeClaim" />;

export class StorageOverview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ocsHealthData: {
        data: {},
        loaded: false,
      },
      topConsumersData: {
        topConsumerStats: [],
        topConsumersLoaded: false,
      },
      capacityData: {},
      diskStats: {},
      utilizationData: {},
      dataResiliencyData: {},
    };
    this.setHealthData = this._setHealthData.bind(this);
    this.setTopConsumersData = this._setTopConsumersData.bind(this);
    this.setData = this._setData.bind(this);
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

  _setData(key, responseKey, response) {
    this.setState(state => ({
      [key]: {
        ...state[key],
        [responseKey]: response,
      },
    }));
  }

  _setTopConsumersData(response) {
    const result = get(response, 'data.result', []);
    this.setState({
      topConsumersData: {
        topConsumerStats: result,
        topConsumerLoaded: true,
      },
    });
  }

  fetchPrometheusQuery(query, callback) {
    const url = `${getPrometheusBaseURL()}/api/v1/query?query=${encodeURIComponent(query)}`;
    coFetchJSON(url).then(result => {
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

  async fetchAlerts() {
    const url = `${getAlertManagerBaseURL()}/api/v2/alerts`;
    let alertsResponse;
    try {
      alertsResponse = await coFetchJSON(url);
    } catch (error) {
      alertsResponse = error;
    } finally {
      if (this._isMounted) {
        this.setState({
          alertsResponse,
        });
        setTimeout(() => this.fetchAlerts(), REFRESH_TIMEOUT);
      }
    }
  }

  componentDidMount() {
    this._isMounted = true;

    this.fetchPrometheusQuery(CEPH_STATUS_QUERY, this.setHealthData);

    this.fetchPrometheusQuery(UTILIZATION_IOPS_QUERY, response => this.setData('utilizationData','iopsUtilization', response));
    this.fetchPrometheusQuery(UTILIZATION_LATENCY_QUERY, response => this.setData('utilizationData','latencyUtilization', response));
    this.fetchPrometheusQuery(UTILIZATION_THROUGHPUT_QUERY, response => this.setData('utilizationData','throughputUtilization', response));

    this.fetchPrometheusQuery(STORAGE_CEPH_CAPACITY_TOTAL_QUERY, response => this.setData('capacityData','capacityTotal', response));
    this.fetchPrometheusQuery(STORAGE_CEPH_CAPACITY_USED_QUERY, response => this.setData('capacityData','capacityUsed', response));
    this.fetchPrometheusQuery(CEPH_OSD_UP_QUERY, response => this.setData('diskStats','cephOsdUp', response));
    this.fetchPrometheusQuery(CEPH_OSD_DOWN_QUERY, response => this.setData('diskStats','cephOsdDown', response));
    this.fetchPrometheusQuery(CEPH_PG_CLEAN_AND_ACTIVE_QUERY, response => this.setData('dataResiliencyData','cleanAndActivePgRaw', response));
    this.fetchPrometheusQuery(CEPH_PG_TOTAL_QUERY, response => this.setData('dataResiliencyData','totalPgRaw', response));

    this.fetchAlerts();
    this.fetchPrometheusQuery(TOP_CONSUMERS_QUERY, response => this.setTopConsumersData(response));
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const { ocsHealthData, capacityData, diskStats, utilizationData, alertsResponse, topConsumersData, dataResiliencyData } = this.state;
    const inventoryResourceMapToProps = resources => {
      return {
        value: {
          LoadingComponent: LoadingInline,
          ...resources,
          ocsHealthData,
          ...capacityData,
          diskStats,
          eventsData: {
            Component: OverviewEventStream,
            loaded: true,
          },
          ...utilizationData,
          alertsResponse,
          ...topConsumersData,
          ...dataResiliencyData,
        },
      };
    };

    return (
      <WithResources
        resourceMap={resourceMap}
        resourceToProps={inventoryResourceMapToProps}
      >
        <LazyRenderer>
          <StorageOverviewContext.Provider>
            <KubevirtStorageOverview />
          </StorageOverviewContext.Provider>
        </LazyRenderer>
      </WithResources>
    );
  }
}
