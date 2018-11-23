// eslint-disable-next-line no-unused-vars
import { K8sKind } from '../../module/k8s';

// TODO: reuse following from kubevirt-web-ui-components to avoid duplicity

export const VirtualMachineModel: K8sKind = {
  label: 'Virtual Machine',
  labelPlural: 'Virtual Machines',
  apiVersion: 'v1alpha2',
  path: 'virtualmachines',
  apiGroup: 'kubevirt.io',
  plural: 'virtualmachines',
  abbr: 'VM',
  namespaced: true,
  kind: 'VirtualMachine',
  id: 'virtualmachine',
};

export const VirtualMachineInstanceModel: K8sKind = {
  label: 'Virtual Machine Instance',
  labelPlural: 'Virtual Machine Instances',
  apiVersion: 'v1alpha2',
  path: 'virtualmachineinstances',
  apiGroup: 'kubevirt.io',
  plural: 'virtualmachineinstances',
  abbr: 'VMI',
  namespaced: true,
  kind: 'VirtualMachineInstance',
  id: 'virtualmachineinstance',
};

export const VirtualMachineInstancePresetModel: K8sKind = {
  label: 'Virtual Machine Instance Preset',
  labelPlural: 'Virtual Machine Instance Presets',
  apiVersion: 'v1alpha2',
  path: 'virtualmachineinstancepresets',
  apiGroup: 'kubevirt.io',
  plural: 'virtualmachineinstancepresets',
  abbr: 'VMIP',
  namespaced: true,
  kind: 'VirtualMachineInstancePreset',
  id: 'virtualmachineinstancepreset',
};

export const TemplateModel: K8sKind = {
  label: 'Template',
  labelPlural: 'Templates',
  apiVersion: 'v1',
  path: 'templates',
  apiGroup: 'template.openshift.io',
  plural: 'templates',
  namespaced: true,
  abbr: 'Template',
  kind: 'Template',
  id: 'template',
};

export const NetworkAttachmentDefinitionModel: K8sKind = {
  label: 'Network Attachment Definition',
  labelPlural: 'Network Attachment Definitions',
  apiVersion: 'v1',
  path: 'network-attachment-definitions',
  apiGroup: 'k8s.cni.cncf.io',
  plural: 'network-attachment-definitions',
  namespaced: true,
  abbr: 'NAD',
  kind: 'NetworkAttachmentDefinition',
  id: 'network-attachment-definition',
};

export const VirtualMachineInstanceMigrationModel: K8sKind = {
  label: 'Virtual Machine Instance Migration',
  labelPlural: 'Virtual Machine Instance Migrations',
  apiVersion: 'v1alpha2',
  path: 'virtualmachineinstancemigrations',
  apiGroup: 'kubevirt.io',
  plural: 'virtualmachineinstancemigrations',
  abbr: 'VMIM',
  namespaced: true,
  kind: 'VirtualMachineInstanceMigration',
  id: 'virtualmachineinstancemigration',
};
