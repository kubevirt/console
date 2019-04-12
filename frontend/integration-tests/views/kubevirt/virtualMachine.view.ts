/* eslint-disable no-unused-vars, no-undef */
import { $, browser, ExpectedConditions as until } from 'protractor';
import { resourceRows } from '../crud.view';

export const resourceTitle = $('#resource-title');

export const overviewTab = 'Overview';
export const yamlTab = 'YAML';
export const consolesTab = 'Consoles';
export const EventsTab = 'Events';
export const disksTab = 'Disks';
export const nicsTab = 'Network Interfaces';

export const createNic = $('#create-nic-btn');
export const createDisk = $('#create-disk-btn');

export const nicName = $('#nic-name');
export const macAddress = $('#mac-address');
export const networkTypeDropdownId = '#network-type';
export const networkBindingId = '#binding';

export const diskName = $('#disk-name');
export const diskSize = $('#disk-size');
export const diskStorageClassDropdownId = '#disk-storage-class';

export const cancelBtn = $('button.kubevirt-cancel-accept-buttons.btn-default');
export const applyBtn = $('button.kubevirt-cancel-accept-buttons.btn-primary');

export const statusIcon = (status) => $(`.kubevirt-vm-status__icon.${status}`);
export const statusLink = $('a.kubevirt-vm-status__link');

export const statusIcons = {
  starting: 'pficon-pending',
  importError: 'pficon-error-circle-o',
  importing: 'pficon-import',
  running: 'pficon-on-running',
  off: 'pficon-off',
};

export const rowForName = (name: string) => resourceRows
  .filter((row) => row.$$('div').first().getText()
    .then(text => text === name)).first();
export const kebabForName = (name: string) => rowForName(name).$('button.co-kebab__button');
export const selectKebabOption = async(name: string, option: string) => {
  await browser.wait(until.presenceOf(kebabForName(name)));
  // open kebab dropdown
  await kebabForName(name).click();
  // select given option from opened dropdown
  await rowForName(name).$('.co-kebab__dropdown').$$('a')
    .filter(link => link.getText()
      .then(text => text.startsWith(option))).first().click();
};
